import { AbstractLoadStrategy, ILoadConfig } from './AbstractLoadStrategy';
import { getExtension, assertNever } from '../utilities';
import { ResourceType } from '../resource_type';

// tests if CORS is supported in XHR, if not we need to use XDR
// Mainly this is for IE9 support.
const useXdr = !!((window as any).XDomainRequest && !('withCredentials' in (new XMLHttpRequest())));

const enum HttpStatus
{
    None = 0,
    Ok = 200,
    Empty = 204,
    IeEmptyBug = 1223,
}

/**
 * The XHR response types.
 */
export enum XhrResponseType
{
    /** string */
    Default     = 'text',
    /** ArrayBuffer */
    Buffer      = 'arraybuffer',
    /** Blob */
    Blob        = 'blob',
    /** Document */
    Document    = 'document',
    /** Object */
    Json        = 'json',
    /** String */
    Text        = 'text',
};

export interface IXhrLoadConfig extends ILoadConfig
{
    xhrType?: XhrResponseType;
}

/**
 * Quick helper to get string xhr type.
 */
function reqType(xhr: XMLHttpRequest): string
{
    return xhr.toString().replace('object ', '');
}

export class XhrLoadStrategy extends AbstractLoadStrategy<IXhrLoadConfig>
{
    static readonly ResponseType = XhrResponseType;

    private _boundOnLoad = this._onLoad.bind(this);
    private _boundOnAbort = this._onAbort.bind(this);
    private _boundOnError = this._onError.bind(this);
    private _boundOnTimeout = this._onTimeout.bind(this);
    private _boundOnProgress = this._onProgress.bind(this);

    private _xhr = this._createRequest();
    private _xhrType = XhrResponseType.Default;

    load(): void
    {
        const config = this.config;
        const ext = getExtension(config.url);

        if (typeof config.xhrType !== 'string')
        {
            config.xhrType = this._determineXhrType(ext);
        }

        const xhr = this._xhr;

        this._xhrType = config.xhrType || XhrResponseType.Default;

        // XDomainRequest has a few quirks. Occasionally it will abort requests
        // A way to avoid this is to make sure ALL callbacks are set even if not used
        // More info here: http://stackoverflow.com/questions/15786966/xdomainrequest-aborts-post-on-ie-9

        if (useXdr)
        {
            // XDR needs a timeout value or it breaks in IE9
            xhr.timeout = config.timeout || 5000;

            xhr.onload = this._boundOnLoad;
            xhr.onerror = this._boundOnError;
            xhr.ontimeout = this._boundOnTimeout;
            xhr.onprogress = this._boundOnProgress;

            xhr.open('GET', config.url, true);

            // Note: The xdr.send() call is wrapped in a timeout to prevent an issue with
            // the interface where some requests are lost if multiple XDomainRequests are
            // being sent at the same time.
            setTimeout(function () { xhr.send(); }, 0);
        }
        else
        {
            xhr.open('GET', config.url, true);

            if (config.timeout)
                xhr.timeout = config.timeout;

            // load json as text and parse it ourselves. We do this because some browsers
            // *cough* safari *cough* can't deal with it.
            if (config.xhrType === XhrResponseType.Json || config.xhrType === XhrResponseType.Document)
                xhr.responseType = XhrResponseType.Text;
            else
                xhr.responseType = config.xhrType;

            xhr.addEventListener('load', this._boundOnLoad, false);
            xhr.addEventListener('abort', this._boundOnAbort, false);
            xhr.addEventListener('error', this._boundOnError, false);
            xhr.addEventListener('timeout', this._boundOnTimeout, false);
            xhr.addEventListener('progress', this._boundOnProgress, false);

            xhr.send();
        }
    }

    abort(): void
    {
        if (useXdr)
        {
            this._clearEvents();
            this._xhr.abort();
            this._onAbort();
        }
        else
        {
            // will call the abort event
            this._xhr.abort();
        }
    }

    private _createRequest(): XMLHttpRequest
    {
        if (useXdr)
            return new (window as any).XDomainRequest();
        else
            return new XMLHttpRequest();
    }

    private _determineXhrType(ext: string): XhrResponseType
    {
        return XhrLoadStrategy._xhrTypeMap[ext] || XhrResponseType.Default;
    }

    private _clearEvents(): void
    {
        if (useXdr)
        {
            this._xhr.onload = null;
            this._xhr.onerror = null;
            this._xhr.ontimeout = null;
            this._xhr.onprogress = null;
        }
        else
        {
            this._xhr.removeEventListener('load', this._boundOnLoad, false);
            this._xhr.removeEventListener('abort', this._boundOnAbort, false);
            this._xhr.removeEventListener('error', this._boundOnError, false);
            this._xhr.removeEventListener('timeout', this._boundOnTimeout, false);
            this._xhr.removeEventListener('progress', this._boundOnProgress, false);
        }
    }

    private _error(errMessage: string): void
    {
        this._clearEvents();
        this.onError.dispatch(errMessage);
    }

    private _complete(type: ResourceType, data: any): void
    {
        this._clearEvents();
        this.onComplete.dispatch(type, data);
    }

    private _onLoad(): void
    {
        const xhr = this._xhr;
        let text = '';

        // XDR has no `.status`, assume 200.
        let status = typeof xhr.status === 'undefined' ? HttpStatus.Ok : xhr.status;

        // responseText is accessible only if responseType is '' or 'text' and on older browsers
        if (typeof xhr.responseType === 'undefined' || xhr.responseType === '' || xhr.responseType === 'text')
        {
            text = xhr.responseText;
        }

        // status can be 0 when using the `file://` protocol so we also check if a response is set.
        // If it has a response, we assume 200; otherwise a 0 status code with no contents is an aborted request.
        if (status === HttpStatus.None && (text.length > 0 || xhr.responseType === XhrResponseType.Buffer))
        {
            status = HttpStatus.Ok;
        }
        // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
        else if (status === HttpStatus.IeEmptyBug)
        {
            status = HttpStatus.Empty;
        }

        const flattenedStatus = Math.floor(status / 100) * 100;

        if (flattenedStatus !== HttpStatus.Ok)
        {
            this._error(`[${xhr.status}] ${xhr.statusText}: ${xhr.responseURL}`);
            return;
        }

        switch (this._xhrType)
        {
            case XhrResponseType.Buffer:
                this._complete(ResourceType.Buffer, xhr.response);
                break;

            case XhrResponseType.Blob:
                this._complete(ResourceType.Blob, xhr.response);
                break;

            case XhrResponseType.Document:
                this._parseDocument(text);
                break;

            case XhrResponseType.Json:
                this._parseJson(text);
                break;

            case XhrResponseType.Default:
            case XhrResponseType.Text:
                this._complete(ResourceType.Text, text);
                break;

            default:
                assertNever(this._xhrType);
        }
    }

    private _parseDocument(text: string): void
    {
        try
        {
            if (window.DOMParser)
            {
                const parser = new DOMParser();
                const data = parser.parseFromString(text, 'text/xml');
                this._complete(ResourceType.Xml, data);
            }
            else
            {
                const div = document.createElement('div');
                div.innerHTML = text;
                this._complete(ResourceType.Xml, div);
            }
        }
        catch (e)
        {
            this._error(`Error trying to parse loaded xml: ${e}`);
        }
    }

    private _parseJson(text: string): void
    {
        try
        {
            const data = JSON.parse(text);
            this._complete(ResourceType.Json, data);
        }
        catch (e)
        {
            this._error(`Error trying to parse loaded json: ${e}`);
        }
    }

    private _onAbort(): void
    {
        const xhr = this._xhr;
        this._error(`${reqType(xhr)} Request was aborted by the user.`);
    }

    private _onError(): void
    {
        const xhr = this._xhr;
        this._error(`${reqType(xhr)} Request failed. Status: ${xhr.status}, text: "${xhr.statusText}"`);
    }

    private _onTimeout(): void
    {
        const xhr = this._xhr;
        this._error(`${reqType(xhr)} Request timed out.`);
    }

    private _onProgress(event: ProgressEvent): void
    {
        if (event && event.lengthComputable)
        {
            this.onProgress.dispatch(event.loaded / event.total);
        }
    }

    /**
     * Sets the load type to be used for a specific extension.
     *
     * @param extname The extension to set the type for, e.g. "png" or "fnt"
     * @param xhrType The xhr type to set it to.
     */
    static setExtensionXhrType(extname: string, xhrType: XhrResponseType)
    {
        if (extname && extname.indexOf('.') === 0)
            extname = extname.substring(1);

        if (!extname)
            return;

        XhrLoadStrategy._xhrTypeMap[extname] = xhrType;
    }

    private static _xhrTypeMap: Partial<Record<string, XhrResponseType>> = {
        // xml
        xhtml:      XhrResponseType.Document,
        html:       XhrResponseType.Document,
        htm:        XhrResponseType.Document,
        xml:        XhrResponseType.Document,
        tmx:        XhrResponseType.Document,
        svg:        XhrResponseType.Document,

        // This was added to handle Tiled Tileset XML, but .tsx is also a TypeScript React Component.
        // Since it is way less likely for people to be loading TypeScript files instead of Tiled files,
        // this should probably be fine.
        tsx:        XhrResponseType.Document,

        // images
        gif:        XhrResponseType.Blob,
        png:        XhrResponseType.Blob,
        bmp:        XhrResponseType.Blob,
        jpg:        XhrResponseType.Blob,
        jpeg:       XhrResponseType.Blob,
        tif:        XhrResponseType.Blob,
        tiff:       XhrResponseType.Blob,
        webp:       XhrResponseType.Blob,
        tga:        XhrResponseType.Blob,

        // json
        json:       XhrResponseType.Json,

        // text
        text:       XhrResponseType.Text,
        txt:        XhrResponseType.Text,

        // fonts
        ttf:        XhrResponseType.Buffer,
        otf:        XhrResponseType.Buffer,
    };
}
