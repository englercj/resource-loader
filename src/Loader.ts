import * as Url from 'url-parse';
import { Signal } from 'type-signals';
import { AsyncQueue } from './async/AsyncQueue';
import { Resource, OnCompleteSignal as OnResourceCompleteSignal } from './Resource';
import { ILoadConfig } from './load_strategies/AbstractLoadStrategy';
import { eachSeries } from './async/eachSeries';

// some constants
const MAX_PROGRESS = 100;
const rgxExtractUrlHash = /(#[\w-]+)?$/;

export type ResourceMap = Partial<Record<string, Resource>>;

export type OnProgressSignal = (loader: Loader, resource: Resource) => void;
export type OnErrorSignal = (errMessage: string, loader: Loader, resource: Resource) => void;
export type OnLoadSignal = (loader: Loader, resource: Resource) => void;
export type OnStartSignal = (loader: Loader) => void;
export type OnCompleteSignal = (loader: Loader, resources: ResourceMap) => void;

export type MiddlewareFn = (resource: Resource, next: () => void) => void;

/**
 * Options for a call to `.add()`.
 */
export interface IAddOptions extends ILoadConfig
{
    // Extra values to be used by specific load strategies.
    [key: string]: any;

    // The name of the resource to load, if not passed the url is used.
    name?: string;

    // Callback to add an an onComplete signal istener.
    onComplete?: OnResourceCompleteSignal;

    // Parent resource this newly added resource is a child of.
    parentResource?: Resource;
}

/**
 * Manages the state and loading of multiple resources to load.
 */
export class Loader
{
    /**
     * The base url for all resources loaded by this loader.
     */
    baseUrl: string;

    /**
     * The progress percent of the loader going through the queue.
     */
    progress = 0;

    /**
     * Loading state of the loader, true if it is currently loading resources.
     */
    loading = false;

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
     */
    defaultQueryString = '';

    /**
     * All the resources for this loader keyed by name.
     */
    resources: ResourceMap = {};

    /**
     * Dispatched once per loaded or errored resource.
     */
    onProgress = new Signal<OnProgressSignal>();

    /**
     * Dispatched once per errored resource.
     */
    onError = new Signal<OnErrorSignal>();

    /**
     * Dispatched once per loaded resource.
     */
    onLoad = new Signal<OnLoadSignal>();

    /**
     * Dispatched when the loader begins to process the queue.
     */
    onStart = new Signal<OnStartSignal>();

    /**
     * Dispatched when the queued resources all load.
     */
    onComplete = new Signal<OnCompleteSignal>();

    /**
     * The middleware to run after loading each resource.
     */
    private _middleware: MiddlewareFn[] = [];

    /**
     * The tracks the resources we are currently completing parsing for.
     */
    private _resourcesParsing: Resource[] = [];

    /**
     * The `_loadResource` function bound with this object context.
     */
    private _boundLoadResource = this._loadResource.bind(this);

    /**
     * The resources waiting to be loaded.
     */
    private _queue: AsyncQueue<Resource>;

    /**
     * @param baseUrl The base url for all resources loaded by this loader.
     * @param concurrency The number of resources to load concurrently.
     */
    constructor(baseUrl = '', concurrency = 10)
    {
        this.baseUrl = baseUrl;

        this._queue = new AsyncQueue<Resource>(this._boundLoadResource, concurrency);
        this._queue.pause();

        // Add default middleware
        for (let i = 0; i < Loader._defaultMiddleware.length; ++i)
        {
            this.use(Loader._defaultMiddleware[i]);
        }
    }

    /**
     * Adds a resource (or multiple resources) to the loader queue.
     *
     * This function can take a wide variety of different parameters. The only thing that is always
     * required the url to load. All the following will work:
     *
     * ```js
     * loader
     *     // name & url param syntax
     *     .add('http://...')
     *     .add('key', 'http://...')
     *
     *     // object syntax
     *     .add({
     *         name: 'key3',
     *         url: 'http://...',
     *         onComplete: function () {},
     *     })
     *
     *     // you can also pass an array of objects or urls or both
     *     .add([
     *         { name: 'key4', url: 'http://...', onComplete: function () {} },
     *         { url: 'http://...', onComplete: function () {} },
     *         'http://...'
     *     ])
     * ```
     */
    add(url: string): this;
    add(name: string, url: string): this;
    add(options: IAddOptions): this;
    add(resources: (IAddOptions|string)[]): this;
    add(options: string | IAddOptions | (string | IAddOptions)[], url_?: string): this
    {
        // An array is a resource list.
        if (Array.isArray(options))
        {
            for (let i = 0; i < options.length; ++i)
            {
                // can be string or IAddOptions, but either one is fine to pass
                // as a param alone. The type assertion is just to appease TS.
                this.add(options[i] as string);
            }

            return this;
        }

        let url = '';
        let name = '';
        let resOptions: IAddOptions = { url: '' };

        if (typeof options === 'object')
        {
            url = options.url;
            name = options.name || options.url;
            resOptions = options;
        }
        else
        {
            name = options;

            if (typeof url_ === 'string')
                url = url_;
            else
                url = name;
        }

        // if loading already you can only add resources that have a parent.
        if (this.loading && !resOptions.parentResource)
        {
            throw new Error('Cannot add root resources while the loader is running.');
        }

        // check if resource already exists.
        if (this.resources[name])
        {
            throw new Error(`Resource named "${name}" already exists.`);
        }

        // add base url if this isn't an absolute url
        url = this._prepareUrl(url);
        resOptions.url = url;

        const resource = new Resource(name, resOptions);

        this.resources[name] = resource;

        if (typeof resOptions.onComplete === 'function')
        {
            resource.onAfterMiddleware.once(resOptions.onComplete);
        }

        // if actively loading, make sure to adjust progress chunks for that parent and its children
        if (this.loading)
        {
            const parent = resOptions.parentResource!;
            const incompleteChildren: Resource[] = [];

            for (let i = 0; i < parent.children.length; ++i)
            {
                if (!parent.children[i].isComplete)
                {
                    incompleteChildren.push(parent.children[i]);
                }
            }

            const fullChunk = parent.progressChunk * (incompleteChildren.length + 1); // +1 for parent
            const eachChunk = fullChunk / (incompleteChildren.length + 2); // +2 for parent & new child

            parent.children.push(resource);
            parent.progressChunk = eachChunk;

            for (let i = 0; i < incompleteChildren.length; ++i)
            {
                incompleteChildren[i].progressChunk = eachChunk;
            }

            resource.progressChunk = eachChunk;
        }

        // add the resource to the queue
        this._queue.push(resource);

        return this;
    }

    /**
     * Sets up a middleware function that will run *after* the
     * resource is loaded.
     */
    use(fn: MiddlewareFn): this
    {
        this._middleware.push(fn);
        return this;
    }

    /**
     * Resets the queue of the loader to prepare for a new load.
     */
    reset(): this
    {
        this.progress = 0;
        this.loading = false;

        this._queue.reset();
        this._queue.pause();

        // abort all resource loads
        for (const k in this.resources)
        {
            const res = this.resources[k];

            if (!res)
                continue;

            if (res._onCompleteBinding)
                res._onCompleteBinding.detach();

            if (res.isLoading)
                res.abort();
        }

        this.resources = {};

        return this;
    }

    /**
     * Starts loading the queued resources.
     */
    load(cb?: OnCompleteSignal): this
    {
        if (typeof cb === 'function')
            this.onComplete.once(cb);

        // if the queue has already started we are done here
        if (this.loading)
            return this;

        if (this._queue.idle())
        {
            this._onStart();
            this._onComplete();
        }
        else
        {
            // distribute progress chunks
            const numTasks = this._queue.length();
            const chunk = MAX_PROGRESS / numTasks;

            for (let i = 0; i < this._queue.length(); ++i)
            {
                this._queue.getTask(i).data.progressChunk = chunk;
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
     */
    get concurrency(): number
    {
        return this._queue.concurrency;
    }

    set concurrency(concurrency)
    {
        this._queue.concurrency = concurrency;
    }

    /**
     * Prepares a url for usage based on the configuration of this object
     */
    private _prepareUrl(url: string): string
    {
        const parsed = new Url(url);
        let result;

        // absolute url, just use it as is.
        if (parsed.protocol || !parsed.pathname || url.indexOf('//') === 0)
        {
            result = url;
        }
        // if baseUrl doesn't end in slash and url doesn't start with slash, then add a slash inbetween
        else if (this.baseUrl.length
            && this.baseUrl.lastIndexOf('/') !== this.baseUrl.length - 1
            && url.charAt(0) !== '/')
        {
            result = `${this.baseUrl}/${url}`;
        }
        else
        {
            result = this.baseUrl + url;
        }

        // if we need to add a default querystring, there is a bit more work
        if (this.defaultQueryString)
        {
            const match = rgxExtractUrlHash.exec(result);

            if (match)
            {
                const hash = match[0];

                result = result.substr(0, result.length - hash.length);

                if (result.indexOf('?') !== -1)
                    result += `&${this.defaultQueryString}`;
                else
                    result += `?${this.defaultQueryString}`;

                result += hash;
            }
        }

        return result;
    }

    /**
     * Loads a single resource.
     */
    private _loadResource(resource: Resource, dequeue: Function): void
    {
        resource._dequeue = dequeue;
        resource._onCompleteBinding = resource.onComplete.once(this._onLoad, this);
        resource.load();
    }

    /**
     * Called once loading has started.
     */
    private _onStart(): void
    {
        this.progress = 0;
        this.loading = true;
        this.onStart.dispatch(this);
    }

    /**
     * Called once each resource has loaded.
     */
    private _onComplete(): void
    {
        this.progress = MAX_PROGRESS;
        this.loading = false;
        this.onComplete.dispatch(this, this.resources);
    }

    /**
     * Called each time a resources is loaded.
     */
    private _onLoad(resource: Resource): void
    {
        resource._onCompleteBinding = null;

        // remove this resource from the async queue, and add it to our list
        // of resources that are being parsed
        this._resourcesParsing.push(resource);
        resource._dequeue();

        // run all the after middleware for this resource
        eachSeries(
            this._middleware,
            (fn, next) =>
            {
                fn.call(this, resource, next);
            },
            () =>
            {
                resource.onAfterMiddleware.dispatch(resource);

                this.progress = Math.min(MAX_PROGRESS, this.progress + resource.progressChunk);
                this.onProgress.dispatch(this, resource);

                if (resource.error)
                    this.onError.dispatch(resource.error, this, resource);
                else
                    this.onLoad.dispatch(this, resource);

                this._resourcesParsing.splice(this._resourcesParsing.indexOf(resource), 1);

                // do completion check
                if (this._queue.idle() && this._resourcesParsing.length === 0)
                    this._onComplete();
            },
            true);
    }

    /**
     * A default array of middleware to run after loading each resource.
     * Each of these middlewares are added to any new Loader instances when they are created.
     */
    private static _defaultMiddleware: MiddlewareFn[] = [];

    /**
     * Sets up a middleware function that will run *after* the
     * resource is loaded.
     */
    static use(fn: MiddlewareFn): typeof Loader
    {
        Loader._defaultMiddleware.push(fn);
        return Loader;
    }
}
