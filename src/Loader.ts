import parseUri from 'parse-uri';
import { Signal } from 'type-signals';
import { AsyncQueue } from './async/AsyncQueue';
import { Resource } from './Resource';
import { ILoadConfig } from './load_strategies/AbstractLoadStrategy';
import { eachSeries } from './async/eachSeries';

// some constants
const MAX_PROGRESS = 100;
const rgxExtractUrlHash = /(#[\w-]+)?$/;

/**
 * @category Type Aliases
 */
export namespace Loader
{
    export type ResourceMap = Partial<Record<string, Resource>>;

    export type OnProgressSignal = (loader: Loader, resource: Resource) => void;
    export type OnErrorSignal = (errMessage: string, loader: Loader, resource: Resource) => void;
    export type OnLoadSignal = (loader: Loader, resource: Resource) => void;
    export type OnStartSignal = (loader: Loader) => void;
    export type OnCompleteSignal = (loader: Loader, resources: ResourceMap) => void;

    export type MiddlewareFn = (resource: Resource, next: () => void) => void;
    export type UrlResolverFn = (url: string, parsed: ReturnType<typeof parseUri>) => string;
}

interface Middleware
{
    fn: Loader.MiddlewareFn;
    priority: number;
}

/**
 * Options for a call to `.add()`.
 */
export interface IAddOptions extends ILoadConfig
{
    // Extra values to be used by specific load strategies.
    [key: string]: any;

    // The url to load the resource from.
    url: string;

    // A base url to use for just this resource load.
    baseUrl?: string;

    // The name of the resource to load, if not passed the url is used.
    name?: string;

    // Callback to add an an onComplete signal istener.
    onComplete?: Resource.OnCompleteSignal;

    // Parent resource this newly added resource is a child of.
    parentResource?: Resource;
}

/**
 * Manages the state and loading of multiple resources to load.
 * @preferred
 */
export class Loader
{
    /**
     * The default middleware priority (50).
     */
    static readonly DefaultMiddlewarePriority = 50;

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
     * All the resources for this loader keyed by name, or URL if no name was given.
     */
    resources: Loader.ResourceMap = {};

    /**
     * Dispatched once per errored resource.
     */
    readonly onError: Signal<Loader.OnErrorSignal> = new Signal<Loader.OnErrorSignal>();

    /**
     * Dispatched once per loaded resource.
     */
    readonly onLoad: Signal<Loader.OnLoadSignal> = new Signal<Loader.OnLoadSignal>();

    /**
     * Dispatched when the loader begins to process the queue.
     */
    readonly onStart: Signal<Loader.OnStartSignal> = new Signal<Loader.OnStartSignal>();

    /**
     * Dispatched when the queued resources all load.
     */
    readonly onComplete: Signal<Loader.OnCompleteSignal> = new Signal<Loader.OnCompleteSignal>();

    /**
     * Dispatched once per loaded or errored resource.
     */
    readonly onProgress: Signal<Loader.OnProgressSignal> = new Signal<Loader.OnProgressSignal>();

    /**
     * The base url for all resources loaded by this loader.
     */
    private _baseUrl = '';

    /**
     * The internal list of URL resolver functions called within `_prepareUrl`.
     */
    private _urlResolvers: Loader.UrlResolverFn[] = [];

    /**
     * The middleware to run after loading each resource.
     */
    private _middleware: Middleware[] = [];

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

        // Add default middleware. This is already sorted so no need to do that again.
        this._middleware = Loader._defaultMiddleware.slice();
    }

    /**
     * The base url for all resources loaded by this loader.
     * Any trailing slashes are trimmed off.
     */
    get baseUrl(): string { return this._baseUrl; }

    set baseUrl(url: string)
    {
        while (url.length && url.charAt(url.length - 1) === '/')
        {
            url = url.slice(0, -1);
        }

        this._baseUrl = url;
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
        let baseUrl = this._baseUrl;
        let resOptions: IAddOptions = { url: '' };

        if (typeof options === 'object')
        {
            url = options.url;
            name = options.name || options.url;
            baseUrl = options.baseUrl || baseUrl;
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

        if (!url)
            throw new Error('You must specify the `url` property.');

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
        url = this._prepareUrl(url, baseUrl);
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
     *
     * You can optionally specify a priority for this middleware
     * which will determine the order middleware functions are run.
     * A lower priority value will make the function run earlier.
     * That is, priority 30 is run before priority 50.
     */
    use(fn: Loader.MiddlewareFn, priority: number = Loader.DefaultMiddlewarePriority): this
    {
        this._middleware.push({ fn, priority });
        this._middleware.sort((a, b) => a.priority - b.priority);
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
    load(cb?: Loader.OnCompleteSignal): this
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
     * Add a function that can be used to modify the url just prior
     * to `baseUrl` and `defaultQueryString` being applied.
     */
    addUrlResolver(func: Loader.UrlResolverFn): this
    {
        this._urlResolvers.push(func);
        return this;
    }

    /**
     * Prepares a url for usage based on the configuration of this object
     */
    private _prepareUrl(url: string, baseUrl: string): string
    {
        let parsed = parseUri(url, { strictMode: true });

        this._urlResolvers.forEach(resolver => {
            url = resolver(url, parsed);
            parsed = parseUri(url, { strictMode: true });
        });

        // Only add `baseUrl` for urls that are not absolute.
        if (!parsed.protocol && url.indexOf('//') !== 0)
        {
            // if the url doesn't start with a slash, then add one inbetween.
            if (baseUrl.length && url.charAt(0) !== '/')
                url = `${baseUrl}/${url}`;
            else
                url = baseUrl + url;
        }

        // if we need to add a default querystring, there is a bit more work
        if (this.defaultQueryString)
        {
            const match = rgxExtractUrlHash.exec(url);

            if (match)
            {
                const hash = match[0];

                url = url.substr(0, url.length - hash.length);

                if (url.indexOf('?') !== -1)
                    url += `&${this.defaultQueryString}`;
                else
                    url += `?${this.defaultQueryString}`;

                url += hash;
            }
        }

        return url;
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
            (middleware, next) =>
            {
                middleware.fn.call(this, resource, next);
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
    private static _defaultMiddleware: Middleware[] = [];

    /**
     * Sets up a middleware function that will run *after* the
     * resource is loaded.
     *
     * You can optionally specify a priority for this middleware
     * which will determine the order middleware functions are run.
     * A lower priority value will make the function run earlier.
     * That is, priority 30 is run before priority 50.
     */
    static use(fn: Loader.MiddlewareFn, priority = Loader.DefaultMiddlewarePriority): typeof Loader
    {
        Loader._defaultMiddleware.push({ fn, priority });
        Loader._defaultMiddleware.sort((a, b) => a.priority - b.priority);
        return Loader;
    }
}
