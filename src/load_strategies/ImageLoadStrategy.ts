import { AbstractLoadStrategy, ILoadConfig } from './AbstractLoadStrategy';
import { ResourceType } from '../resource_type';

// We can't set the `src` attribute to empty string, so on abort we set it to this 1px transparent gif
const EMPTY_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

export interface IImageLoadConfig extends ILoadConfig
{
    loadElement?: HTMLImageElement;
}

export class ImageLoadStrategy extends AbstractLoadStrategy<IImageLoadConfig>
{
    private _boundOnLoad = this._onLoad.bind(this);
    private _boundOnError = this._onError.bind(this);
    private _boundOnTimeout = this._onTimeout.bind(this);

    private _element = this._createElement();
    private _elementTimer = 0;

    load(): void
    {
        const config = this.config;

        if (config.crossOrigin)
            this._element.crossOrigin = config.crossOrigin;

        this._element.src = config.url;

        this._element.addEventListener('load', this._boundOnLoad, false);
        this._element.addEventListener('error', this._boundOnError, false);

        if (config.timeout)
            this._elementTimer = window.setTimeout(this._boundOnTimeout, config.timeout);
    }

    abort(): void
    {
        this._clearEvents();
        this._element.src = EMPTY_GIF;
        this._error('Image load aborted by the user.');
    }

    private _createElement(): HTMLImageElement
    {
        if (this.config.loadElement)
            return this.config.loadElement;
        else
            return document.createElement('img')
    }

    private _clearEvents(): void
    {
        clearTimeout(this._elementTimer);

        this._element.removeEventListener('load', this._boundOnLoad, false);
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
        this.onComplete.dispatch(ResourceType.Image, this._element);
    }

    private _onLoad(): void
    {
        this._complete();
    }

    private _onError(): void
    {
        this._error('Image failed to load.');
    }

    private _onTimeout(): void
    {
        this._error('Image load timed out.');
    }
}
