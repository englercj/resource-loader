import { AbstractLoadStrategy, ILoadConfig } from './AbstractLoadStrategy';
import { getExtension, assertNever } from '../utilities';
import { ResourceType } from '../resource_type';

export interface IMediaElementLoadConfig extends ILoadConfig
{
    sourceSet?: string[];
    mimeTypes?: string[];
    loadElement?: HTMLMediaElement;
}

export abstract class MediaElementLoadStrategy extends AbstractLoadStrategy<IMediaElementLoadConfig>
{
    private _boundOnLoad = this._onLoad.bind(this);
    private _boundOnError = this._onError.bind(this);
    private _boundOnTimeout = this._onTimeout.bind(this);

    private _element = this._createElement();
    private _elementTimer = 0;

    constructor(config: IMediaElementLoadConfig, readonly elementType: ('audio' | 'video'))
    {
        super(config);
    }

    load(): void
    {
        const config = this.config;

        if (config.crossOrigin)
            this._element.crossOrigin = config.crossOrigin;

        const urls = config.sourceSet || [config.url];

        // support for CocoonJS Canvas+ runtime, lacks document.createElement('source')
        if ((navigator as any).isCocoonJS)
        {
            this._element.src = urls[0];
        }
        else
        {
            for (let i = 0; i < urls.length; ++i)
            {
                const url = urls[i];
                let mimeType = config.mimeTypes ? config.mimeTypes[i] : undefined;

                if (!mimeType)
                    mimeType = `${this.elementType}/${getExtension(url)}`;

                const source = document.createElement('source');

                source.src = url;
                source.type = mimeType;

                this._element.appendChild(source);
            }
        }

        this._element.addEventListener('load', this._boundOnLoad, false);
        this._element.addEventListener('canplaythrough', this._boundOnLoad, false);
        this._element.addEventListener('error', this._boundOnError, false);

        this._element.load();

        if (config.timeout)
            this._elementTimer = window.setTimeout(this._boundOnTimeout, config.timeout);
    }

    abort(): void
    {
        this._clearEvents();
        while (this._element.firstChild)
        {
            this._element.removeChild(this._element.firstChild);
        }
        this._error(`${this.elementType} load aborted by the user.`);
    }

    private _createElement(): HTMLMediaElement
    {
        if (this.config.loadElement)
            return this.config.loadElement;
        else
            return document.createElement(this.elementType);
    }

    private _clearEvents(): void
    {
        clearTimeout(this._elementTimer);

        this._element.removeEventListener('load', this._boundOnLoad, false);
        this._element.removeEventListener('canplaythrough', this._boundOnLoad, false);
        this._element.removeEventListener('error', this._boundOnError, false);
    }

    private _error(errMessage: string): void
    {
        this._clearEvents();
        this.onError.dispatch(errMessage);
    }

    private _complete(): void
    {
        this._clearEvents();

        let resourceType = ResourceType.Unknown;

        switch (this.elementType)
        {
            case 'audio': resourceType = ResourceType.Audio; break;
            case 'video': resourceType = ResourceType.Video; break;
            default: assertNever(this.elementType);
        }

        this.onComplete.dispatch(resourceType, this._element);
    }

    private _onLoad(): void
    {
        this._complete();
    }

    private _onError(): void
    {
        this._error(`${this.elementType} failed to load.`);
    }

    private _onTimeout(): void
    {
        this._error(`${this.elementType} load timed out.`);
    }
}
