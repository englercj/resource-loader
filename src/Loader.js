'use strict';

var parseUri        = require('parse-uri');
var async           = require('./async');
var Resource        = require('./Resource');
var EventEmitter    = require('eventemitter3');

// some constants
var DEFAULT_CONCURRENCY = 10;
var MAX_PROGRESS = 100;

/**
 * Manages the state and loading of multiple resources to load.
 *
 * @class
 * @param {string} [baseUrl=''] - The base url for all resources loaded by this loader.
 * @param {number} [concurrency=10] - The number of resources to load concurrently.
 */
function Loader(baseUrl, concurrency) {
    EventEmitter.call(this);

    concurrency = concurrency || DEFAULT_CONCURRENCY;

    /**
     * The base url for all resources loaded by this loader.
     *
     * @member {string}
     */
    this.baseUrl = baseUrl || '';

    /**
     * The progress percent of the loader going through the queue.
     *
     * @member {number}
     */
    this.progress = 0;

    /**
     * Loading state of the loader, true if it is currently loading resources.
     *
     * @member {boolean}
     */
    this.loading = false;

    /**
     * The percentage of total progress that a single resource represents.
     *
     * @member {number}
     */
    this._progressChunk = 0;

    /**
     * The middleware to run before loading each resource.
     *
     * @member {function[]}
     */
    this._beforeMiddleware = [];

    /**
     * The middleware to run after loading each resource.
     *
     * @member {function[]}
     */
    this._afterMiddleware = [];

    /**
     * The `_loadResource` function bound with this object context.
     *
     * @private
     * @member {function}
     */
    this._boundLoadResource = this._loadResource.bind(this);

    /**
     * The resource buffer that fills until `load` is called to start loading resources.
     *
     * @private
     * @member {Resource[]}
     */
    this._buffer = [];

    /**
     * Used to track load completion.
     *
     * @private
     * @member {number}
     */
    this._numToLoad = 0;

    /**
     * The resources waiting to be loaded.
     *
     * @private
     * @member {Resource[]}
     */
    this._queue = async.queue(this._boundLoadResource, concurrency);

    /**
     * All the resources for this loader keyed by name.
     *
     * @member {object<string, Resource>}
     */
    this.resources = {};

    /**
     * Emitted once per loaded or errored resource.
     *
     * @event progress
     * @memberof Loader#
     */

    /**
     * Emitted once per errored resource.
     *
     * @event error
     * @memberof Loader#
     */

    /**
     * Emitted once per loaded resource.
     *
     * @event load
     * @memberof Loader#
     */

    /**
     * Emitted when the loader begins to process the queue.
     *
     * @event start
     * @memberof Loader#
     */

    /**
     * Emitted when the queued resources all load.
     *
     * @event complete
     * @memberof Loader#
     */
}

Loader.prototype = Object.create(EventEmitter.prototype);
Loader.prototype.constructor = Loader;
module.exports = Loader;

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
 * @alias enqueue
 * @param {string} [name] - The name of the resource to load, if not passed the url is used.
 * @param {string} [url] - The url for this resource, relative to the baseUrl of this loader.
 * @param {object} [options] - The options for the load.
 * @param {boolean} [options.crossOrigin] - Is this request cross-origin? Default is to determine automatically.
 * @param {Resource.XHR_LOAD_TYPE} [options.loadType=Resource.LOAD_TYPE.XHR] - How should this resource be loaded?
 * @param {Resource.XHR_RESPONSE_TYPE} [options.xhrType=Resource.XHR_RESPONSE_TYPE.DEFAULT] - How should the data being
 *      loaded be interpreted when using XHR?
 * @param {function} [cb] - Function to call when this specific resource completes loading.
 * @return {Loader} Returns itself.
 */
Loader.prototype.add = Loader.prototype.enqueue = function (name, url, options, cb) {
    // special case of an array of objects or urls
    if (Array.isArray(name)) {
        for (var i = 0; i < name.length; ++i) {
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

    // check if resource already exists.
    if (this.resources[name]) {
        throw new Error('Resource with name "' + name + '" already exists.');
    }

    // add base url if this isn't an absolute url
    url = this._prepareUrl(url);

    // create the store the resource
    this.resources[name] = new Resource(name, url, options);

    if (typeof cb === 'function') {
        this.resources[name].once('afterMiddleware', cb);
    }

    this._numToLoad++;

    // if already loading add it to the worker queue
    if (this._queue.started) {
        this._queue.push(this.resources[name]);
        this._progressChunk = (MAX_PROGRESS - this.progress) / (this._queue.length() + this._queue.running());
    }
    // otherwise buffer it to be added to the queue later
    else {
        this._buffer.push(this.resources[name]);
        this._progressChunk = MAX_PROGRESS / this._buffer.length;
    }

    return this;
};

/**
 * Sets up a middleware function that will run *before* the
 * resource is loaded.
 *
 * @alias pre
 * @method before
 * @param {function} fn - The middleware function to register.
 * @return {Loader} Returns itself.
 */
Loader.prototype.before = Loader.prototype.pre = function (fn) {
    this._beforeMiddleware.push(fn);

    return this;
};

/**
 * Sets up a middleware function that will run *after* the
 * resource is loaded.
 *
 * @alias use
 * @method after
 * @param {function} fn - The middleware function to register.
 * @return {Loader} Returns itself.
 */
Loader.prototype.after = Loader.prototype.use = function (fn) {
    this._afterMiddleware.push(fn);

    return this;
};

/**
 * Resets the queue of the loader to prepare for a new load.
 *
 * @return {Loader} Returns itself.
 */
Loader.prototype.reset = function () {
    // this.baseUrl = baseUrl || '';

    this.progress = 0;

    this.loading = false;

    this._progressChunk = 0;

    // this._beforeMiddleware.length = 0;
    // this._afterMiddleware.length = 0;

    this._buffer.length = 0;

    this._numToLoad = 0;

    this._queue.kill();
    this._queue.started = false;

    // abort all resource loads
    for (var k in this.resources) {
        var res = this.resources[k];

        res.off('complete', this._onLoad, this);

        if (res.isLoading) {
            res.abort();
        }
    }

    this.resources = {};

    return this;
};

/**
 * Starts loading the queued resources.
 *
 * @fires start
 * @param {function} [cb] - Optional callback that will be bound to the `complete` event.
 * @return {Loader} Returns itself.
 */
Loader.prototype.load = function (cb) {
    // register complete callback if they pass one
    if (typeof cb === 'function') {
        this.once('complete', cb);
    }

    // if the queue has already started we are done here
    if (this._queue.started) {
        return this;
    }

    // notify of start
    this.emit('start', this);

    // update loading state
    this.loading = true;

    // start the internal queue
    for (var i = 0; i < this._buffer.length; ++i) {
        this._queue.push(this._buffer[i]);
    }

    // empty the buffer
    this._buffer.length = 0;

    return this;
};

/**
 * Prepares a url for usage based on the configuration of this object
 *
 * @private
 * @param {string} url - The url to prepare.
 * @return {string} The prepared url.
 */
Loader.prototype._prepareUrl = function (url) {
    var parsedUrl = parseUri(url, { strictMode: true });

    // absolute url, just use it as is.
    if (parsedUrl.protocol || !parsedUrl.path || parsedUrl.path.indexOf('//') === 0) {
        return url;
    }

    // if baseUrl doesn't end in slash and url doesn't start with slash, then add a slash inbetween
    if (this.baseUrl.length
        && this.baseUrl.lastIndexOf('/') !== this.baseUrl.length - 1
        && url.charAt(0) !== '/'
    ) {
        return this.baseUrl + '/' + url;
    }

    return this.baseUrl + url;
};

/**
 * Loads a single resource.
 *
 * @private
 * @param {Resource} resource - The resource to load.
 * @param {function} dequeue - The function to call when we need to dequeue this item.
 */
Loader.prototype._loadResource = function (resource, dequeue) {
    var self = this;

    resource._dequeue = dequeue;

    // run before middleware
    async.eachSeries(
        this._beforeMiddleware,
        function (fn, next) {
            fn.call(self, resource, function () {
                // if the before middleware marks the resource as complete,
                // break and don't process any more before middleware
                next(resource.isComplete ? {} : null);
            });
        },
        function () {
            // resource.on('progress', self.emit.bind(self, 'progress'));

            if (resource.isComplete) {
                self._onLoad(resource);
            }
            else {
                resource.once('complete', self._onLoad, self);
                resource.load();
            }
        }
    );
};

/**
 * Called once each resource has loaded.
 *
 * @fires complete
 * @private
 */
Loader.prototype._onComplete = function () {
    this.loading = false;

    this.emit('complete', this, this.resources);
};

/**
 * Called each time a resources is loaded.
 *
 * @fires progress
 * @fires error
 * @fires load
 * @private
 * @param {Resource} resource - The resource that was loaded
 */
Loader.prototype._onLoad = function (resource) {
    var self = this;

    // run middleware, this *must* happen before dequeue so sub-assets get added properly
    async.eachSeries(
        this._afterMiddleware,
        function (fn, next) {
            fn.call(self, resource, next);
        },
        function () {
            resource.emit('afterMiddleware', resource);

            self._numToLoad--;

            self.progress += self._progressChunk;
            self.emit('progress', self, resource);

            if (resource.error) {
                self.emit('error', resource.error, self, resource);
            }
            else {
                self.emit('load', self, resource);
            }

            // do completion check
            if (self._numToLoad === 0) {
                self.progress = 100;
                self._onComplete();
            }
        }
    );

    // remove this resource from the async queue
    resource._dequeue();
};

Loader.LOAD_TYPE = Resource.LOAD_TYPE;
Loader.XHR_RESPONSE_TYPE = Resource.XHR_RESPONSE_TYPE;
