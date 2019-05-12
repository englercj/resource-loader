/// <reference path="./mini-signals.d.ts" />

import Signal from 'mini-signals';

/**
 * @param {string} [baseUrl=''] - The base url for all resources loaded by this loader.
 * @param {number} [concurrency=10] - The number of resources to load concurrently.
 */
declare class Loader {
    constructor(baseUrl?: string, concurrency?: number);
    /**
     * The base url for all resources loaded by this loader.
     *
     * @member {string}
     */
    baseUrl: string;
    /**
     * The progress percent of the loader going through the queue.
     *
     * @member {number}
     * @default 0
     */
    progress: number;
    /**
     * Loading state of the loader, true if it is currently loading resources.
     *
     * @member {boolean}
     * @default false
     */
    loading: boolean;
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
    defaultQueryString: string;
    /**
     * All the resources for this loader keyed by name.
     *
     * @member {object<string, Resource>}
     */
    resources: {
        [key: string]: Resource;
    };
    /**
     * Dispatched once per loaded or errored resource.
     *
     * The callback looks like {@link Loader.OnProgressSignal}.
     *
     * @member {Signal<Loader.OnProgressSignal>}
     */
    onProgress: Signal<Loader.OnProgressSignal>;
    /**
     * Dispatched once per errored resource.
     *
     * The callback looks like {@link Loader.OnErrorSignal}.
     *
     * @member {Signal<Loader.OnErrorSignal>}
     */
    onError: Signal<Loader.OnErrorSignal>;
    /**
     * Dispatched once per loaded resource.
     *
     * The callback looks like {@link Loader.OnLoadSignal}.
     *
     * @member {Signal<Loader.OnLoadSignal>}
     */
    onLoad: Signal<Loader.OnLoadSignal>;
    /**
     * Dispatched when the loader begins to process the queue.
     *
     * The callback looks like {@link Loader.OnStartSignal}.
     *
     * @member {Signal<Loader.OnStartSignal>}
     */
    onStart: Signal<Loader.OnStartSignal>;
    /**
     * Dispatched when the queued resources all load.
     *
     * The callback looks like {@link Loader.OnCompleteSignal}.
     *
     * @member {Signal<Loader.OnCompleteSignal>}
     */
    onComplete: Signal<Loader.OnCompleteSignal>;
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
     */
    add(name: string, url: string, callback?: Resource.OnCompleteSignal): this;
    /** @function
     * @variation 2
     * @param {string} name - The name of the resource to load.
     * @param {string} url - The url for this resource, relative to the baseUrl of this loader.
     * @param {IAddOptions} [options] - The options for the load.
     * @param {Resource.OnCompleteSignal} [callback] - Function to call when this specific resource completes loading.
     * @return {this} Returns itself.
     */
    add(name: string, url: string, options?: IAddOptions, callback?: Resource.OnCompleteSignal): this;
    /** @function
     * @variation 3
     * @param {string} url - The url for this resource, relative to the baseUrl of this loader.
     * @param {Resource.OnCompleteSignal} [callback] - Function to call when this specific resource completes loading.
     * @return {this} Returns itself.
     */
    add(url: string, callback?: Resource.OnCompleteSignal): this;
    /** @function
     * @variation 4
     * @param {string} url - The url for this resource, relative to the baseUrl of this loader.
     * @param {IAddOptions} [options] - The options for the load.
     * @param {Resource.OnCompleteSignal} [callback] - Function to call when this specific resource completes loading.
     * @return {this} Returns itself.
     */
    add(url: string, options?: IAddOptions, callback?: Resource.OnCompleteSignal): this;
    /** @function
     * @variation 5
     * @param {IAddOptions} options - The options for the load. This object must contain a `url` property.
     * @param {Resource.OnCompleteSignal} [callback] - Function to call when this specific resource completes loading.
     * @return {this} Returns itself.
     */
    add(options: IAddOptions, callback?: Resource.OnCompleteSignal): this;
    /** @function
     * @variation 6
     * @param {Array<IAddOptions|string>} resources - An array of resources to load, where each is
     *      either an object with the options or a string url. If you pass an object, it must contain a `url` property.
     * @param {Resource.OnCompleteSignal} [callback] - Function to call when this specific resource completes loading.
     * @return {this} Returns itself.
     */
    add(resources: (IAddOptions | string)[], callback?: Resource.OnCompleteSignal): this;
    /**
     * Sets up a middleware function that will run *before* the
     * resource is loaded.
     *
     * @param {function} fn - The middleware function to register.
     * @return {this} Returns itself.
     */
    pre(fn: (...params: any[]) => any): this;
    /**
     * Sets up a middleware function that will run *after* the
     * resource is loaded.
     *
     * @param {function} fn - The middleware function to register.
     * @return {this} Returns itself.
     */
    use(fn: (...params: any[]) => any): this;
    /**
     * Resets the queue of the loader to prepare for a new load.
     *
     * @return {this} Returns itself.
     */
    reset(): this;
    /**
     * Starts loading the queued resources.
     *
     * @param {function} [cb] - Optional callback that will be bound to the `complete` event.
     * @return {this} Returns itself.
     */
    load(cb?: (...params: any[]) => any): this;
    /**
     * The number of resources to load concurrently.
     *
     * @member {number}
     * @default 10
     */
    concurrency: number;
    /**
     * Sets up a middleware function that will run *before* the
     * resource is loaded.
     *
     * @static
     * @param {function} fn - The middleware function to register.
     * @return {Loader} Returns itself.
     */
    static pre(fn: (...params: any[]) => any): Loader;
    /**
     * Sets up a middleware function that will run *after* the
     * resource is loaded.
     *
     * @static
     * @param {function} fn - The middleware function to register.
     * @return {Loader} Returns itself.
     */
    static use(fn: (...params: any[]) => any): Loader;
}

declare module Loader {
    /**
     * When the progress changes the loader and resource are disaptched.
     *
     * @memberof Loader
     * @callback OnProgressSignal
     * @param {Loader} loader - The loader the progress is advancing on.
     * @param {Resource} resource - The resource that has completed or failed to cause the progress to advance.
     */
    type OnProgressSignal = (loader: Loader, resource: Resource) => void;
    /**
     * When an error occurrs the loader and resource are disaptched.
     *
     * @memberof Loader
     * @callback OnErrorSignal
     * @param {Loader} loader - The loader the error happened in.
     * @param {Resource} resource - The resource that caused the error.
     */
    type OnErrorSignal = (loader: Loader, resource: Resource) => void;
    /**
     * When a load completes the loader and resource are disaptched.
     *
     * @memberof Loader
     * @callback OnLoadSignal
     * @param {Loader} loader - The loader that laoded the resource.
     * @param {Resource} resource - The resource that has completed loading.
     */
    type OnLoadSignal = (loader: Loader, resource: Resource) => void;
    /**
     * When the loader starts loading resources it dispatches this callback.
     *
     * @memberof Loader
     * @callback OnStartSignal
     * @param {Loader} loader - The loader that has started loading resources.
     */
    type OnStartSignal = (loader: Loader) => void;
    /**
     * When the loader completes loading resources it dispatches this callback.
     *
     * @memberof Loader
     * @callback OnCompleteSignal
     * @param {Loader} loader - The loader that has finished loading resources.
     */
    type OnCompleteSignal = (loader: Loader) => void;
}

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
declare type IAddOptions = {
    name?: string;
    key?: string;
    url?: string;
    crossOrigin?: string | boolean;
    timeout?: number;
    loadType?: Resource.LOAD_TYPE;
    xhrType?: Resource.XHR_RESPONSE_TYPE;
    onComplete?: Resource.OnCompleteSignal;
    callback?: Resource.OnCompleteSignal;
    metadata?: Resource.IMetadata;
};

/**
 * @param {string} name - The name of the resource to load.
 * @param {string|string[]} url - The url for this resource, for audio/video loads you can pass
 *      an array of sources.
 * @param {object} [options] - The options for the load.
 * @param {string|boolean} [options.crossOrigin] - Is this request cross-origin? Default is to
 *      determine automatically.
 * @param {number} [options.timeout=0] - A timeout in milliseconds for the load. If the load takes
 *      longer than this time it is cancelled and the load is considered a failure. If this value is
 *      set to `0` then there is no explicit timeout.
 * @param {Resource.LOAD_TYPE} [options.loadType=Resource.LOAD_TYPE.XHR] - How should this resource
 *      be loaded?
 * @param {Resource.XHR_RESPONSE_TYPE} [options.xhrType=Resource.XHR_RESPONSE_TYPE.DEFAULT] - How
 *      should the data being loaded be interpreted when using XHR?
 * @param {Resource.IMetadata} [options.metadata] - Extra configuration for middleware and the Resource object.
 */
declare class Resource {
    constructor(name: string, url: string | string[], options?: {
        crossOrigin?: string | boolean;
        timeout?: number;
        loadType?: Resource.LOAD_TYPE;
        xhrType?: Resource.XHR_RESPONSE_TYPE;
        metadata?: Resource.IMetadata;
    });
    /**
     * Sets the load type to be used for a specific extension.
     *
     * @static
     * @param {string} extname - The extension to set the type for, e.g. "png" or "fnt"
     * @param {Resource.LOAD_TYPE} loadType - The load type to set it to.
     */
    static setExtensionLoadType(extname: string, loadType: Resource.LOAD_TYPE): void;
    /**
     * Sets the load type to be used for a specific extension.
     *
     * @static
     * @param {string} extname - The extension to set the type for, e.g. "png" or "fnt"
     * @param {Resource.XHR_RESPONSE_TYPE} xhrType - The xhr type to set it to.
     */
    static setExtensionXhrType(extname: string, xhrType: Resource.XHR_RESPONSE_TYPE): void;
    /**
     * The name of this resource.
     *
     * @readonly
     * @member {string}
     */
    readonly name: string;
    /**
     * The url used to load this resource.
     *
     * @readonly
     * @member {string}
     */
    readonly url: string;
    /**
     * The extension used to load this resource.
     *
     * @readonly
     * @member {string}
     */
    readonly extension: string;
    /**
     * The data that was loaded by the resource.
     *
     * @member {any}
     */
    data: any;
    /**
     * Is this request cross-origin? If unset, determined automatically.
     *
     * @member {string}
     */
    crossOrigin: string;
    /**
     * A timeout in milliseconds for the load. If the load takes longer than this time
     * it is cancelled and the load is considered a failure. If this value is set to `0`
     * then there is no explicit timeout.
     *
     * @member {number}
     */
    timeout: number;
    /**
     * The method of loading to use for this resource.
     *
     * @member {Resource.LOAD_TYPE}
     */
    loadType: Resource.LOAD_TYPE;
    /**
     * The type used to load the resource via XHR. If unset, determined automatically.
     *
     * @member {string}
     */
    xhrType: string;
    /**
     * Extra info for middleware, and controlling specifics about how the resource loads.
     *
     * Note that if you pass in a `loadElement`, the Resource class takes ownership of it.
     * Meaning it will modify it as it sees fit.
     *
     * @member {Resource.IMetadata}
     */
    metadata: Resource.IMetadata;
    /**
     * The error that occurred while loading (if any).
     *
     * @readonly
     * @member {Error}
     */
    readonly error: Error;
    /**
     * The XHR object that was used to load this resource. This is only set
     * when `loadType` is `Resource.LOAD_TYPE.XHR`.
     *
     * @readonly
     * @member {XMLHttpRequest}
     */
    readonly xhr: XMLHttpRequest;
    /**
     * The child resources this resource owns.
     *
     * @readonly
     * @member {Resource[]}
     */
    readonly children: Resource[];
    /**
     * The resource type.
     *
     * @readonly
     * @member {Resource.TYPE}
     */
    readonly type: Resource.TYPE;
    /**
     * The progress chunk owned by this resource.
     *
     * @readonly
     * @member {number}
     */
    readonly progressChunk: number;
    /**
     * Dispatched when the resource beings to load.
     *
     * The callback looks like {@link Resource.OnStartSignal}.
     *
     * @member {Signal<Resource.OnStartSignal>}
     */
    onStart: Signal<Resource.OnStartSignal>;
    /**
     * Dispatched each time progress of this resource load updates.
     * Not all resources types and loader systems can support this event
     * so sometimes it may not be available. If the resource
     * is being loaded on a modern browser, using XHR, and the remote server
     * properly sets Content-Length headers, then this will be available.
     *
     * The callback looks like {@link Resource.OnProgressSignal}.
     *
     * @member {Signal<Resource.OnProgressSignal>}
     */
    onProgress: Signal<Resource.OnProgressSignal>;
    /**
     * Dispatched once this resource has loaded, if there was an error it will
     * be in the `error` property.
     *
     * The callback looks like {@link Resource.OnCompleteSignal}.
     *
     * @member {Signal<Resource.OnCompleteSignal>}
     */
    onComplete: Signal<Resource.OnCompleteSignal>;
    /**
     * Dispatched after this resource has had all the *after* middleware run on it.
     *
     * The callback looks like {@link Resource.OnCompleteSignal}.
     *
     * @member {Signal<Resource.OnCompleteSignal>}
     */
    onAfterMiddleware: Signal<Resource.OnCompleteSignal>;
    /**
     * Stores whether or not this url is a data url.
     *
     * @readonly
     * @member {boolean}
     */
    readonly isDataUrl: boolean;
    /**
     * Describes if this resource has finished loading. Is true when the resource has completely
     * loaded.
     *
     * @readonly
     * @member {boolean}
     */
    readonly isComplete: boolean;
    /**
     * Describes if this resource is currently loading. Is true when the resource starts loading,
     * and is false again when complete.
     *
     * @readonly
     * @member {boolean}
     */
    readonly isLoading: boolean;
    /**
     * Marks the resource as complete.
     *
     */
    complete(): void;
    /**
     * Aborts the loading of this resource, with an optional message.
     *
     * @param {string} message - The message to use for the error
     */
    abort(message: string): void;
    /**
     * Kicks off loading of this resource. This method is asynchronous.
     *
     * @param {Resource.OnCompleteSignal} [cb] - Optional callback to call once the resource is loaded.
     */
    load(cb?: Resource.OnCompleteSignal): void;
}

declare module Resource {
    /**
     * When the resource starts to load.
     *
     * @memberof Resource
     * @callback OnStartSignal
     * @param {Resource} resource - The resource that the event happened on.
     */
    type OnStartSignal = (resource: Resource) => void;
    /**
     * When the resource reports loading progress.
     *
     * @memberof Resource
     * @callback OnProgressSignal
     * @param {Resource} resource - The resource that the event happened on.
     * @param {number} percentage - The progress of the load in the range [0, 1].
     */
    type OnProgressSignal = (resource: Resource, percentage: number) => void;
    /**
     * When the resource finishes loading.
     *
     * @memberof Resource
     * @callback OnCompleteSignal
     * @param {Resource} resource - The resource that the event happened on.
     */
    type OnCompleteSignal = (resource: Resource) => void;
    /**
     * @memberof Resource
     * @typedef {object} IMetadata
     * @property {HTMLImageElement|HTMLAudioElement|HTMLVideoElement} [loadElement=null] - The
     *      element to use for loading, instead of creating one.
     * @property {boolean} [skipSource=false] - Skips adding source(s) to the load element. This
     *      is useful if you want to pass in a `loadElement` that you already added load sources to.
     * @property {string|string[]} [mimeType] - The mime type to use for the source element
     *      of a video/audio elment. If the urls are an array, you can pass this as an array as well
     *      where each index is the mime type to use for the corresponding url index.
     */
    type IMetadata = {
        loadElement?: HTMLImageElement | HTMLAudioElement | HTMLVideoElement;
        skipSource?: boolean;
        mimeType?: string | string[];
    };
    /**
     * The types of resources a resource could represent.
     *
     * @static
     * @readonly
     * @enum {number}
     */
    enum STATUS_FLAGS {
        NONE,
        DATA_URL,
        COMPLETE,
        LOADING
    }
    /**
     * The types of resources a resource could represent.
     *
     * @static
     * @readonly
     * @enum {number}
     */
    enum TYPE {
        UNKNOWN,
        JSON,
        XML,
        IMAGE,
        AUDIO,
        VIDEO,
        TEXT
    }
    /**
     * The types of loading a resource can use.
     *
     * @static
     * @readonly
     * @enum {number}
     */
    enum LOAD_TYPE {
        XHR,
        IMAGE,
        AUDIO,
        VIDEO
    }
    /**
     * The XHR ready states, used internally.
     *
     * @static
     * @readonly
     * @enum {string}
     */
    enum XHR_RESPONSE_TYPE {
        DEFAULT,
        BUFFER,
        BLOB,
        DOCUMENT,
        JSON,
        TEXT
    }
}

/**
 * Smaller version of the async library constructs.
 *
 * @namespace async
 */
declare namespace async {
    /**
     * Iterates an array in series.
     *
     * @memberof async
     * @function eachSeries
     * @param {Array.<*>} array - Array to iterate.
     * @param {function} iterator - Function to call for each element.
     * @param {function} callback - Function to call when done, or on error.
     * @param {boolean} [deferNext=false] - Break synchronous each loop by calling next with a setTimeout of 1.
     */
    function eachSeries(array: any[], iterator: (...params: any[]) => any, callback: (...params: any[]) => any, deferNext?: boolean): void;
    /**
     * Async queue implementation,
     *
     * @memberof async
     * @function queue
     * @param {function} worker - The worker function to call for each task.
     * @param {number} concurrency - How many workers to run in parrallel.
     * @return {*} The async queue object.
     */
    function queue(worker: (...params: any[]) => any, concurrency: number): any;
}

/**
 * Encodes binary into base64.
 *
 * @function encodeBinary
 * @param {string} input The input data to encode.
 * @returns {string} The encoded base64 string
 */
declare function encodeBinary(input: string): string;

/**
 * @namespace middleware
 */
declare namespace middleware {
    /**
     * A simple in-memory cache for resource.
     *
     * @memberof middleware
     * @function caching
     * @example
     * import { Loader, middleware } from 'resource-loader';
     * const loader = new Loader();
     * loader.use(middleware.caching);
     * @param {Resource} resource - Current Resource
     * @param {function} next - Callback when complete
     */
    function caching(resource: Resource, next: (...params: any[]) => any): void;
    /**
     * A middleware for transforming XHR loaded Blobs into more useful objects
     *
     * @memberof middleware
     * @function parsing
     * @example
     * import { Loader, middleware } from 'resource-loader';
     * const loader = new Loader();
     * loader.use(middleware.parsing);
     * @param {Resource} resource - Current Resource
     * @param {function} next - Callback when complete
     */
    function parsing(resource: Resource, next: (...params: any[]) => any): void;
}

