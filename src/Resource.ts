import parseUri from 'parse-uri';
import { Signal, SignalBinding } from 'type-signals';
import { AbstractLoadStrategy, ILoadConfig, AbstractLoadStrategyCtor } from './load_strategies/AbstractLoadStrategy';
import { ImageLoadStrategy } from './load_strategies/ImageLoadStrategy';
import { AudioLoadStrategy } from './load_strategies/AudioLoadStrategy';
import { VideoLoadStrategy } from './load_strategies/VideoLoadStrategy';
import { XhrLoadStrategy } from './load_strategies/XhrLoadStrategy';
import { ResourceType, ResourceState } from './resource_type';
import { getExtension } from './utilities';

export interface IResourceOptions extends ILoadConfig
{
    strategy?: AbstractLoadStrategy | AbstractLoadStrategyCtor;
}

/**
 * @category Type Aliases
 */
export namespace Resource
{
    export type OnStartSignal = (resource: Resource) => void;
    export type OnErrorSignal = (resource: Resource) => void;
    export type OnCompleteSignal = (resource: Resource) => void;
    export type OnProgressSignal = (resource: Resource, percent: number) => void;
}

/**
 * Manages the state and loading of a resource and all child resources.
 * @preferred
 */
export class Resource
{
    private static _tempAnchor: HTMLAnchorElement | null = null;

    private static _defaultLoadStrategy: AbstractLoadStrategyCtor = XhrLoadStrategy;
    private static _loadStrategyMap: Partial<Record<string, AbstractLoadStrategyCtor>> = {
        // images
        gif:        ImageLoadStrategy,
        png:        ImageLoadStrategy,
        bmp:        ImageLoadStrategy,
        jpg:        ImageLoadStrategy,
        jpeg:       ImageLoadStrategy,
        tif:        ImageLoadStrategy,
        tiff:       ImageLoadStrategy,
        webp:       ImageLoadStrategy,
        tga:        ImageLoadStrategy,
        svg:        ImageLoadStrategy,
        'svg+xml':  ImageLoadStrategy, // for SVG data urls

        // audio
        mp3:        AudioLoadStrategy,
        ogg:        AudioLoadStrategy,
        wav:        AudioLoadStrategy,

        // videos
        mp4:        VideoLoadStrategy,
        webm:       VideoLoadStrategy,
        mov:        VideoLoadStrategy,
    };

    /**
     * Sets the default load stragety to use when there is no extension-specific strategy.
     */
    static setDefaultLoadStrategy(strategy: AbstractLoadStrategyCtor): void
    {
        Resource._defaultLoadStrategy = strategy;
    }

    /**
     * Sets the load strategy to be used for a specific extension.
     *
     * @param extname The extension to set the type for, e.g. "png" or "fnt"
     * @param strategy The load strategy to use for loading resources with that extension.
     */
    static setLoadStrategy(extname: string, strategy: AbstractLoadStrategyCtor): void
    {
        if (extname && extname.indexOf('.') === 0)
            extname = extname.substring(1);

        if (!extname)
            return;

        Resource._loadStrategyMap[extname] = strategy;
    }

    /**
     * The name of this resource.
     */
    readonly name: string;

    /**
     * The child resources of this resource.
     */
    readonly children: Resource[] = [];

    /**
     * Dispatched when the resource beings to load.
     */
    readonly onStart: Signal<Resource.OnStartSignal> = new Signal<Resource.OnStartSignal>();

    /**
     * Dispatched each time progress of this resource load updates.
     * Not all resources types and loader systems can support this event
     * so sometimes it may not be available. If the resource
     * is being loaded on a modern browser, using XHR, and the remote server
     * properly sets Content-Length headers, then this will be available.
     */
    readonly onProgress: Signal<Resource.OnProgressSignal> = new Signal<Resource.OnProgressSignal>();

    /**
     * Dispatched once this resource has loaded, if there was an error it will
     * be in the `error` property.
     */
    readonly onComplete: Signal<Resource.OnCompleteSignal> = new Signal<Resource.OnCompleteSignal>();

    /**
     * Dispatched after this resource has had all the *after* middleware run on it.
     */
    readonly onAfterMiddleware: Signal<Resource.OnCompleteSignal> = new Signal<Resource.OnCompleteSignal>();

    /**
     * The data that was loaded by the resource. The type of this member is
     * described by the `type` member.
     */
    data: any = null;

    /**
     * Describes the type of the `data` member for this resource.
     *
     * @see ResourceType
     */
    type = ResourceType.Unknown;

    /**
     * The error that occurred while loading (if any).
     */
    error = '';

    /**
     * The progress chunk owned by this resource.
     */
    progressChunk = 0;

    /**
     * Storage for use privately by the Loader.
     * Do not touch this member.
     *
     * @ignore
     */
    _dequeue: Function = function () {};

    /**
     * Storage for use privately by the Loader.
     * Do not touch this member.
     *
     * @ignore
     */
    _onCompleteBinding: SignalBinding<Resource.OnCompleteSignal> | null = null;

    private _strategy: AbstractLoadStrategy;
    private _state = ResourceState.NotStarted;

    /**
     * @param name The name of the resource to load.
     * @param options The options for the load strategy that will be used.
     */
    constructor(name: string, options: IResourceOptions)
    {
        this.name = name;

        if (typeof options.crossOrigin !== 'string')
            options.crossOrigin = this._determineCrossOrigin(options.url);

        if (options.strategy && typeof options.strategy !== 'function')
        {
            this._strategy = options.strategy;

            // Only `Resource` is allowed to set the config object,
            // it is otherwise readonly.
            (this._strategy as any).config = options;
        }
        else
        {
            let StrategyCtor = options.strategy;

            if (!StrategyCtor)
                StrategyCtor = Resource._loadStrategyMap[getExtension(options.url)];

            if (!StrategyCtor)
                StrategyCtor = Resource._defaultLoadStrategy;

            this._strategy = new StrategyCtor(options);
        }

        this._strategy.onError.add(this._error, this);
        this._strategy.onComplete.add(this._complete, this);
        this._strategy.onProgress.add(this._progress, this);
    }

    get url(): string { return this._strategy.config.url; }
    get isLoading(): boolean { return this._state === ResourceState.Loading; }
    get isComplete(): boolean { return this._state === ResourceState.Complete; }

    /**
     * Aborts the loading of the resource.
     */
    abort(): void
    {
        this._strategy.abort();
    }

    /**
     * Kicks off loading of this resource.
     */
    load(): void
    {
        this._state = ResourceState.Loading;
        this.onStart.dispatch(this);
        this._strategy.load();
    }

    private _error(errMessage: string): void
    {
        this._state = ResourceState.Complete;
        this.error = errMessage;
        this.onComplete.dispatch(this);
    }

    private _complete(type: ResourceType, data: any): void
    {
        this._state = ResourceState.Complete;
        this.type = type;
        this.data = data;
        this.onComplete.dispatch(this);
    }

    private _progress(percent: number): void
    {
        this.onProgress.dispatch(this, percent);
    }

    /**
     * Determines if a URL is crossOrigin, and if so returns the crossOrigin string.
     */
    private _determineCrossOrigin(url: string, loc = window.location): string
    {
        // data: and javascript: urls are considered same-origin
        if (url.indexOf('data:') === 0 || url.indexOf('javascript:') === 0)
            return '';

        // A sandboxed iframe without the 'allow-same-origin' attribute will have a special
        // origin designed not to match window.location.origin, and will always require
        // crossOrigin requests regardless of whether the location matches.
        if (window.origin !== window.location.origin)
            return 'anonymous';

        if (!Resource._tempAnchor)
            Resource._tempAnchor = document.createElement('a');

        // Let the browser determine the full href for the url and then parse with the
        // url lib. We can't use the properties of the anchor element because they
        // don't work in IE9 :(
        Resource._tempAnchor.href = url;

        const parsed = parseUri(Resource._tempAnchor.href, { strictMode: true });

        const samePort = (!parsed.port && loc.port === '') || (parsed.port === loc.port);
        const protocol = parsed.protocol ? `${parsed.protocol}:` : '';

        // if cross origin
        if (parsed.host !== loc.hostname || !samePort || protocol !== loc.protocol)
            return 'anonymous';

        return '';
    }
}
