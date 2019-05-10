import Signal from 'mini-signals';
import parseUri from 'parse-uri';
import * as async from './async';
import { Resource } from './Resource';

// some constants
const MAX_PROGRESS = 100;
const rgxExtractUrlHash = /(#[\w-]+)?$/;

/**
 * Manages the state and loading of multiple resources to load.
 *
 * @class
 */
class Loader {
    /**
     * @param {string} [baseUrl=''] - The base url for all resources loaded by this loader.
     * @param {number} [concurrency=10] - The number of resources to load concurrently.
     */
    constructor(baseUrl = '', concurrency = 10) {
        /**
         * The base url for all resources loaded by this loader.
         *
         * @member {string}
         */
        this.baseUrl = baseUrl;

        /**
         * The progress percent of the loader going through the queue.
         *
         * @member {number}
         * @default 0
         */
        this.progress = 0;

        /**
         * Loading state of the loader, true if it is currently loading resources.
         *
         * @member {boolean}
         * @default false
         */
        this.loading = false;

        /**
         * A querystring to append to every URL added to the loader.
         *
         * This should be a valid query string *without* the question-mark (`?`). The loader will
         * also *not* escape values for you. Make sure to escape your parameters with
         * [`encodeURIComponent`](https://mdn.io/encodeURIComponent) before assigning this property.
         *
         * @example
         * const loader = new Loader();
         *
         * loader.defaultQueryString = 'user=me&password=secret';
         *
         * // This will request 'image.png?user=me&password=secret'
         * loader.add('image.png').load();
         *
         * loader.reset();
         *
         * // This will request 'image.png?v=1&user=me&password=secret'
         * loader.add('iamge.png?v=1').load();
         *
         * @member {string}
         * @default ''
         */
        this.defaultQueryString = '';

        /**
         * The middleware to run before loading each resource.
         *
         * @private
         * @member {function[]}
         */
        this._beforeMiddleware = [];

        /**
         * The middleware to run after loading each resource.
         *
         * @private
         * @member {function[]}
         */
        this._afterMiddleware = [];

        /**
         * The tracks the resources we are currently completing parsing for.
         *
         * @private
         * @member {Resource[]}
         */
        this._resourcesParsing = [];

        /**
         * The `_loadResource` function bound with this object context.
         *
         * @private
         * @member {function}
         * @param {Resource} r - The resource to load
         * @param {Function} d - The dequeue function
         * @return {undefined}
         */
        this._boundLoadResource = (r, d) => this._loadResource(r, d);

        /**
         * The resources waiting to be loaded.
         *
         * @private
         * @member {Resource[]}
         */
        this._queue = async.queue(this._boundLoadResource, concurrency);

        this._queue.pause();

        /**
         * All the resources for this loader keyed by name.
         *
         * @member {object<string, Resource>}
         */
        this.resources = {};

        /**
         * Dispatched once per loaded or errored resource.
         *
         * The callback looks like {@link Loader.OnProgressSignal}.
         *
         * @member {Signal<Loader.OnProgressSignal>}
         */
        this.onProgress = new Signal();

        /**
         * Dispatched once per errored resource.
         *
         * The callback looks like {@link Loader.OnErrorSignal}.
         *
         * @member {Signal<Loader.OnErrorSignal>}
         */
        this.onError = new Signal();

        /**
         * Dispatched once per loaded resource.
         *
         * The callback looks like {@link Loader.OnLoadSignal}.
         *
         * @member {Signal<Loader.OnLoadSignal>}
         */
        this.onLoad = new Signal();

        /**
         * Dispatched when the loader begins to process the queue.
         *
         * The callback looks like {@link Loader.OnStartSignal}.
         *
         * @member {Signal<Loader.OnStartSignal>}
         */
        this.onStart = new Signal();

        /**
         * Dispatched when the queued resources all load.
         *
         * The callback looks like {@link Loader.OnCompleteSignal}.
         *
         * @member {Signal<Loader.OnCompleteSignal>}
         */
        this.onComplete = new Signal();

        // Add default before middleware
        for (let i = 0; i < Loader._defaultBeforeMiddleware.length; ++i) {
            this.pre(Loader._defaultBeforeMiddleware[i]);
        }

        // Add default after middleware
        for (let i = 0; i < Loader._defaultAfterMiddleware.length; ++i) {
            this.use(Loader._defaultAfterMiddleware[i]);
        }
    }

    /**
     * When the progress changes the loader and resource are disaptched.
     *
     * @memberof Loader
     * @callback OnProgressSignal
     * @param {Loader} loader - The loader the progress is advancing on.
     * @param {Resource} resource - The resource that has completed or failed to cause the progress to advance.
     */

    /**
     * When an error occurrs the loader and resource are disaptched.
     *
     * @memberof Loader
     * @callback OnErrorSignal
     * @param {Loader} loader - The loader the error happened in.
     * @param {Resource} resource - The resource that caused the error.
     */

    /**
     * When a load completes the loader and resource are disaptched.
     *
     * @memberof Loader
     * @callback OnLoadSignal
     * @param {Loader} loader - The loader that laoded the resource.
     * @param {Resource} resource - The resource that has completed loading.
     */

    /**
     * When the loader starts loading resources it dispatches this callback.
     *
     * @memberof Loader
     * @callback OnStartSignal
     * @param {Loader} loader - The loader that has started loading resources.
     */

    /**
     * When the loader completes loading resources it dispatches this callback.
     *
     * @memberof Loader
     * @callback OnCompleteSignal
     * @param {Loader} loader - The loader that has finished loading resources.
     */

    /**
     * Options for a call to `.add()`.
     *
     * @see Loader#add
     *
     * @typedef {object} IAddOptions
     * @property {string} [name] - The name of the resource to load, if not passed the url is used.
     * @property {string} [key] - Alias for `name`.
     * @property {string} [url] - The url for this resource, relative to the baseUrl of this loader.
     * @property {string|boolean} [crossOrigin] - Is this request cross-origin? Default is to
     *      determine automatically.
     * @property {number} [timeout=0] - A timeout in milliseconds for the load. If the load takes
     *      longer than this time it is cancelled and the load is considered a failure. If this value is
     *      set to `0` then there is no explicit timeout.
     * @property {Resource.LOAD_TYPE} [loadType=Resource.LOAD_TYPE.XHR] - How should this resource
     *      be loaded?
     * @property {Resource.XHR_RESPONSE_TYPE} [xhrType=Resource.XHR_RESPONSE_TYPE.DEFAULT] - How
     *      should the data being loaded be interpreted when using XHR?
     * @property {Resource.OnCompleteSignal} [onComplete] - Callback to add an an onComplete signal istener.
     * @property {Resource.OnCompleteSignal} [callback] - Alias for `onComplete`.
     * @property {Resource.IMetadata} [metadata] - Extra configuration for middleware and the Resource object.
     */

    /* eslint-disable require-jsdoc,valid-jsdoc */
    /**
     * Adds a resource (or multiple resources) to the loader queue.
     *
     * This function can take a wide variety of different parameters. The only thing that is always
     * required the url to load. All the following will work:
     *
     * ```js
     * loader
     *     // normal param syntax
     *     .add('key', 'http://...', function () {})
     *     .add('http://...', function () {})
     *     .add('http://...')
     *
     *     // object syntax
     *     .add({
     *         name: 'key2',
     *         url: 'http://...'
     *     }, function () {})
     *     .add({
     *         url: 'http://...'
     *     }, function () {})
     *     .add({
     *         name: 'key3',
     *         url: 'http://...'
     *         onComplete: function () {}
     *     })
     *     .add({
     *         url: 'https://...',
     *         onComplete: function () {},
     *         crossOrigin: true
     *     })
     *
     *     // you can also pass an array of objects or urls or both
     *     .add([
     *         { name: 'key4', url: 'http://...', onComplete: function () {} },
     *         { url: 'http://...', onComplete: function () {} },
     *         'http://...'
     *     ])
     *
     *     // and you can use both params and options
     *     .add('key', 'http://...', { crossOrigin: true }, function () {})
     *     .add('http://...', { crossOrigin: true }, function () {});
     * ```
     *
     * @function
     * @variation 1
     * @param {string} name - The name of the resource to load.
     * @param {string} url - The url for this resource, relative to the baseUrl of this loader.
     * @param {Resource.OnCompleteSignal} [callback] - Function to call when this specific resource completes loading.
     * @return {this} Returns itself.
     *//**
     * @function
     * @variation 2
     * @param {string} name - The name of the resource to load.
     * @param {string} url - The url for this resource, relative to the baseUrl of this loader.
     * @param {IAddOptions} [options] - The options for the load.
     * @param {Resource.OnCompleteSignal} [callback] - Function to call when this specific resource completes loading.
     * @return {this} Returns itself.
     *//**
     * @function
     * @variation 3
     * @param {string} url - The url for this resource, relative to the baseUrl of this loader.
     * @param {Resource.OnCompleteSignal} [callback] - Function to call when this specific resource completes loading.
     * @return {this} Returns itself.
     *//**
     * @function
     * @variation 4
     * @param {string} url - The url for this resource, relative to the baseUrl of this loader.
     * @param {IAddOptions} [options] - The options for the load.
     * @param {Resource.OnCompleteSignal} [callback] - Function to call when this specific resource completes loading.
     * @return {this} Returns itself.
     *//**
     * @function
     * @variation 5
     * @param {IAddOptions} options - The options for the load. This object must contain a `url` property.
     * @param {Resource.OnCompleteSignal} [callback] - Function to call when this specific resource completes loading.
     * @return {this} Returns itself.
     *//**
     * @function
     * @variation 6
     * @param {Array<IAddOptions|string>} resources - An array of resources to load, where each is
     *      either an object with the options or a string url. If you pass an object, it must contain a `url` property.
     * @param {Resource.OnCompleteSignal} [callback] - Function to call when this specific resource completes loading.
     * @return {this} Returns itself.
     */
    add(name, url, options, cb) {
        // special case of an array of objects or urls
        if (Array.isArray(name)) {
            for (let i = 0; i < name.length; ++i) {
                this.add(name[i]);
            }

            return this;
        }

        // if an object is passed instead of params
        if (typeof name === 'object') {
            cb = url || name.callback || name.onComplete;
            options = name;
            url = name.url;
            name = name.name || name.key || name.url;
        }

        // case where no name is passed shift all args over by one.
        if (typeof url !== 'string') {
            cb = options;
            options = url;
            url = name;
        }

        // now that we shifted make sure we have a proper url.
        if (typeof url !== 'string') {
            throw new Error('No url passed to add resource to loader.');
        }

        // options are optional so people might pass a function and no options
        if (typeof options === 'function') {
            cb = options;
            options = null;
        }

        // if loading already you can only add resources that have a parent.
        if (this.loading && (!options || !options.parentResource)) {
            throw new Error('Cannot add resources while the loader is running.');
        }

        // check if resource already exists.
        if (this.resources[name]) {
            throw new Error(`Resource named "${name}" already exists.`);
        }

        // add base url if this isn't an absolute url
        url = this._prepareUrl(url);

        // create the store the resource
        this.resources[name] = new Resource(name, url, options);

        if (typeof cb === 'function') {
            this.resources[name].onAfterMiddleware.once(cb);
        }

        // if actively loading, make sure to adjust progress chunks for that parent and its children
        if (this.loading) {
            const parent = options.parentResource;
            const incompleteChildren = [];

            for (let i = 0; i < parent.children.length; ++i) {
                if (!parent.children[i].isComplete) {
                    incompleteChildren.push(parent.children[i]);
                }
            }

            const fullChunk = parent.progressChunk * (incompleteChildren.length + 1); // +1 for parent
            const eachChunk = fullChunk / (incompleteChildren.length + 2); // +2 for parent & new child

            parent.children.push(this.resources[name]);
            parent.progressChunk = eachChunk;

            for (let i = 0; i < incompleteChildren.length; ++i) {
                incompleteChildren[i].progressChunk = eachChunk;
            }

            this.resources[name].progressChunk = eachChunk;
        }

        // add the resource to the queue
        this._queue.push(this.resources[name]);

        return this;
    }
    /* eslint-enable require-jsdoc,valid-jsdoc */

    /**
     * Sets up a middleware function that will run *before* the
     * resource is loaded.
     *
     * @param {function} fn - The middleware function to register.
     * @return {this} Returns itself.
     */
    pre(fn) {
        this._beforeMiddleware.push(fn);

        return this;
    }

    /**
     * Sets up a middleware function that will run *after* the
     * resource is loaded.
     *
     * @param {function} fn - The middleware function to register.
     * @return {this} Returns itself.
     */
    use(fn) {
        this._afterMiddleware.push(fn);

        return this;
    }

    /**
     * Resets the queue of the loader to prepare for a new load.
     *
     * @return {this} Returns itself.
     */
    reset() {
        this.progress = 0;
        this.loading = false;

        this._queue.kill();
        this._queue.pause();

        // abort all resource loads
        for (const k in this.resources) {
            const res = this.resources[k];

            if (res._onLoadBinding) {
                res._onLoadBinding.detach();
            }

            if (res.isLoading) {
                res.abort();
            }
        }

        this.resources = {};

        return this;
    }

    /**
     * Starts loading the queued resources.
     *
     * @param {function} [cb] - Optional callback that will be bound to the `complete` event.
     * @return {this} Returns itself.
     */
    load(cb) {
        // register complete callback if they pass one
        if (typeof cb === 'function') {
            this.onComplete.once(cb);
        }

        // if the queue has already started we are done here
        if (this.loading) {
            return this;
        }

        if (this._queue.idle()) {
            this._onStart();
            this._onComplete();
        }
        else {
            // distribute progress chunks
            const numTasks = this._queue._tasks.length;
            const chunk = MAX_PROGRESS / numTasks;

            for (let i = 0; i < this._queue._tasks.length; ++i) {
                this._queue._tasks[i].data.progressChunk = chunk;
            }

            // notify we are starting
            this._onStart();

            // start loading
            this._queue.resume();
        }

        return this;
    }

    /**
     * The number of resources to load concurrently.
     *
     * @member {number}
     * @default 10
     */
    get concurrency() {
        return this._queue.concurrency;
    }
    // eslint-disable-next-line require-jsdoc
    set concurrency(concurrency) {
        this._queue.concurrency = concurrency;
    }

    /**
     * Prepares a url for usage based on the configuration of this object
     *
     * @private
     * @param {string} url - The url to prepare.
     * @return {string} The prepared url.
     */
    _prepareUrl(url) {
        const parsedUrl = parseUri(url, { strictMode: true });
        let result;

        // absolute url, just use it as is.
        if (parsedUrl.protocol || !parsedUrl.path || url.indexOf('//') === 0) {
            result = url;
        }
        // if baseUrl doesn't end in slash and url doesn't start with slash, then add a slash inbetween
        else if (this.baseUrl.length
            && this.baseUrl.lastIndexOf('/') !== this.baseUrl.length - 1
            && url.charAt(0) !== '/'
        ) {
            result = `${this.baseUrl}/${url}`;
        }
        else {
            result = this.baseUrl + url;
        }

        // if we need to add a default querystring, there is a bit more work
        if (this.defaultQueryString) {
            const hash = rgxExtractUrlHash.exec(result)[0];

            result = result.substr(0, result.length - hash.length);

            if (result.indexOf('?') !== -1) {
                result += `&${this.defaultQueryString}`;
            }
            else {
                result += `?${this.defaultQueryString}`;
            }

            result += hash;
        }

        return result;
    }

    /**
     * Loads a single resource.
     *
     * @private
     * @param {Resource} resource - The resource to load.
     * @param {function} dequeue - The function to call when we need to dequeue this item.
     */
    _loadResource(resource, dequeue) {
        resource._dequeue = dequeue;

        // run before middleware
        async.eachSeries(
            this._beforeMiddleware,
            (fn, next) => {
                fn.call(this, resource, () => {
                    // if the before middleware marks the resource as complete,
                    // break and don't process any more before middleware
                    next(resource.isComplete ? {} : null);
                });
            },
            () => {
                if (resource.isComplete) {
                    this._onLoad(resource);
                }
                else {
                    resource._onLoadBinding = resource.onComplete.once(this._onLoad, this);
                    resource.load();
                }
            },
            true
        );
    }

    /**
     * Called once loading has started.
     *
     * @private
     */
    _onStart() {
        this.progress = 0;
        this.loading = true;
        this.onStart.dispatch(this);
    }

    /**
     * Called once each resource has loaded.
     *
     * @private
     */
    _onComplete() {
        this.progress = MAX_PROGRESS;
        this.loading = false;
        this.onComplete.dispatch(this, this.resources);
    }

    /**
     * Called each time a resources is loaded.
     *
     * @private
     * @param {Resource} resource - The resource that was loaded
     */
    _onLoad(resource) {
        resource._onLoadBinding = null;

        // remove this resource from the async queue, and add it to our list of resources that are being parsed
        this._resourcesParsing.push(resource);
        resource._dequeue();

        // run all the after middleware for this resource
        async.eachSeries(
            this._afterMiddleware,
            (fn, next) => {
                fn.call(this, resource, next);
            },
            () => {
                resource.onAfterMiddleware.dispatch(resource);

                this.progress = Math.min(MAX_PROGRESS, this.progress + resource.progressChunk);
                this.onProgress.dispatch(this, resource);

                if (resource.error) {
                    this.onError.dispatch(resource.error, this, resource);
                }
                else {
                    this.onLoad.dispatch(this, resource);
                }

                this._resourcesParsing.splice(this._resourcesParsing.indexOf(resource), 1);

                // do completion check
                if (this._queue.idle() && this._resourcesParsing.length === 0) {
                    this._onComplete();
                }
            },
            true
        );
    }
}

/**
 * A default array of middleware to run before loading each resource.
 * Each of these middlewares are added to any new Loader instances when they are created.
 *
 * @private
 * @member {function[]}
 */
Loader._defaultBeforeMiddleware = [];

/**
 * A default array of middleware to run after loading each resource.
 * Each of these middlewares are added to any new Loader instances when they are created.
 *
 * @private
 * @member {function[]}
 */
Loader._defaultAfterMiddleware = [];

/**
 * Sets up a middleware function that will run *before* the
 * resource is loaded.
 *
 * @static
 * @param {function} fn - The middleware function to register.
 * @return {Loader} Returns itself.
 */
Loader.pre = function LoaderPreStatic(fn) {
    Loader._defaultBeforeMiddleware.push(fn);

    return Loader;
};

/**
 * Sets up a middleware function that will run *after* the
 * resource is loaded.
 *
 * @static
 * @param {function} fn - The middleware function to register.
 * @return {Loader} Returns itself.
 */
Loader.use = function LoaderUseStatic(fn) {
    Loader._defaultAfterMiddleware.push(fn);

    return Loader;
};

export { Loader };

