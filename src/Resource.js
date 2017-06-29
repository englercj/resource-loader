import parseUri from 'parse-uri';
import Signal from 'mini-signals';

// tests is CORS is supported in XHR, if not we need to use XDR
const useXdr = !!(window.XDomainRequest && !('withCredentials' in (new XMLHttpRequest())));
let tempAnchor = null;

// some status constants
const STATUS_NONE = 0;
const STATUS_OK = 200;
const STATUS_EMPTY = 204;
const STATUS_IE_BUG_EMPTY = 1223;
const STATUS_TYPE_OK = 2;

// noop
function _noop() { /* empty */ }

/**
 * Manages the state and loading of a resource and all child resources.
 *
 * @class
 */
export default class Resource {
    /**
     * Sets the load type to be used for a specific extension.
     *
     * @static
     * @param {string} extname - The extension to set the type for, e.g. "png" or "fnt"
     * @param {Resource.LOAD_TYPE} loadType - The load type to set it to.
     */
    static setExtensionLoadType(extname, loadType) {
        setExtMap(Resource._loadTypeMap, extname, loadType);
    }

    /**
     * Sets the load type to be used for a specific extension.
     *
     * @static
     * @param {string} extname - The extension to set the type for, e.g. "png" or "fnt"
     * @param {Resource.XHR_RESPONSE_TYPE} xhrType - The xhr type to set it to.
     */
    static setExtensionXhrType(extname, xhrType) {
        setExtMap(Resource._xhrTypeMap, extname, xhrType);
    }

    /**
     * @param {string} name - The name of the resource to load.
     * @param {string|string[]} url - The url for this resource, for audio/video loads you can pass
     *      an array of sources.
     * @param {object} [options] - The options for the load.
     * @param {string|boolean} [options.crossOrigin] - Is this request cross-origin? Default is to
     *      determine automatically.
     * @param {Resource.LOAD_TYPE} [options.loadType=Resource.LOAD_TYPE.XHR] - How should this resource
     *      be loaded?
     * @param {Resource.XHR_RESPONSE_TYPE} [options.xhrType=Resource.XHR_RESPONSE_TYPE.DEFAULT] - How
     *      should the data being loaded be interpreted when using XHR?
     * @param {object} [options.metadata] - Extra configuration for middleware and the Resource object.
     * @param {HTMLImageElement|HTMLAudioElement|HTMLVideoElement} [options.metadata.loadElement=null] - The
     *      element to use for loading, instead of creating one.
     * @param {boolean} [options.metadata.skipSource=false] - Skips adding source(s) to the load element. This
     *      is useful if you want to pass in a `loadElement` that you already added load sources to.
     * @param {string|string[]} [options.metadata.mimeType] - The mime type to use for the source element of a video/audio
     *      elment. If the urls are an array, you can pass this as an array as well where each index is the mime type to
     *      use for the corresponding url index.
     */
    constructor(name, url, options) {
        if (typeof name !== 'string' || typeof url !== 'string') {
            throw new Error('Both name and url are required for constructing a resource.');
        }

        options = options || {};

        /**
         * The state flags of this resource.
         *
         * @member {number}
         */
        this._flags = 0;

        // set data url flag, needs to be set early for some _determineX checks to work.
        this._setFlag(Resource.STATUS_FLAGS.DATA_URL, url.indexOf('data:') === 0);

        /**
         * The name of this resource.
         *
         * @member {string}
         * @readonly
         */
        this.name = name;

        /**
         * The url used to load this resource.
         *
         * @member {string}
         * @readonly
         */
        this.url = url;

        /**
         * The extension used to load this resource.
         *
         * @member {string}
         * @readonly
         */
        this.extension = this._getExtension();

        /**
         * The data that was loaded by the resource.
         *
         * @member {any}
         */
        this.data = null;

        /**
         * Is this request cross-origin? If unset, determined automatically.
         *
         * @member {string}
         */
        this.crossOrigin = options.crossOrigin === true ? 'anonymous' : options.crossOrigin;

        /**
         * The method of loading to use for this resource.
         *
         * @member {Resource.LOAD_TYPE}
         */
        this.loadType = options.loadType || this._determineLoadType();

        /**
         * The type used to load the resource via XHR. If unset, determined automatically.
         *
         * @member {string}
         */
        this.xhrType = options.xhrType;

        /**
         * Extra info for middleware, and controlling specifics about how the resource loads.
         *
         * Note that if you pass in a `loadElement`, the Resource class takes ownership of it.
         * Meaning it will modify it as it sees fit.
         *
         * @member {object}
         * @property {HTMLImageElement|HTMLAudioElement|HTMLVideoElement} [loadElement=null] - The
         *  element to use for loading, instead of creating one.
         * @property {boolean} [skipSource=false] - Skips adding source(s) to the load element. This
         *  is useful if you want to pass in a `loadElement` that you already added load sources
         *  to.
         */
        this.metadata = options.metadata || {};

        /**
         * The error that occurred while loading (if any).
         *
         * @member {Error}
         * @readonly
         */
        this.error = null;

        /**
         * The XHR object that was used to load this resource. This is only set
         * when `loadType` is `Resource.LOAD_TYPE.XHR`.
         *
         * @member {XMLHttpRequest}
         * @readonly
         */
        this.xhr = null;

        /**
         * The child resources this resource owns.
         *
         * @member {Resource[]}
         * @readonly
         */
        this.children = [];

        /**
         * The resource type.
         *
         * @member {Resource.TYPE}
         * @readonly
         */
        this.type = Resource.TYPE.UNKNOWN;

        /**
         * The progress chunk owned by this resource.
         *
         * @member {number}
         * @readonly
         */
        this.progressChunk = 0;

        /**
         * The `dequeue` method that will be used a storage place for the async queue dequeue method
         * used privately by the loader.
         *
         * @private
         * @member {function}
         */
        this._dequeue = _noop;

        /**
         * Used a storage place for the on load binding used privately by the loader.
         *
         * @private
         * @member {function}
         */
        this._onLoadBinding = null;

        /**
         * The `complete` function bound to this resource's context.
         *
         * @private
         * @member {function}
         */
        this._boundComplete = this.complete.bind(this);

        /**
         * The `_onError` function bound to this resource's context.
         *
         * @private
         * @member {function}
         */
        this._boundOnError = this._onError.bind(this);

        /**
         * The `_onProgress` function bound to this resource's context.
         *
         * @private
         * @member {function}
         */
        this._boundOnProgress = this._onProgress.bind(this);

        // xhr callbacks
        this._boundXhrOnError = this._xhrOnError.bind(this);
        this._boundXhrOnAbort = this._xhrOnAbort.bind(this);
        this._boundXhrOnLoad = this._xhrOnLoad.bind(this);
        this._boundXdrOnTimeout = this._xdrOnTimeout.bind(this);

        /**
         * Dispatched when the resource beings to load.
         *
         * The callback looks like {@link Resource.OnStartSignal}.
         *
         * @member {Signal}
         */
        this.onStart = new Signal();

        /**
         * Dispatched each time progress of this resource load updates.
         * Not all resources types and loader systems can support this event
         * so sometimes it may not be available. If the resource
         * is being loaded on a modern browser, using XHR, and the remote server
         * properly sets Content-Length headers, then this will be available.
         *
         * The callback looks like {@link Resource.OnProgressSignal}.
         *
         * @member {Signal}
         */
        this.onProgress = new Signal();

        /**
         * Dispatched once this resource has loaded, if there was an error it will
         * be in the `error` property.
         *
         * The callback looks like {@link Resource.OnCompleteSignal}.
         *
         * @member {Signal}
         */
        this.onComplete = new Signal();

        /**
         * Dispatched after this resource has had all the *after* middleware run on it.
         *
         * The callback looks like {@link Resource.OnCompleteSignal}.
         *
         * @member {Signal}
         */
        this.onAfterMiddleware = new Signal();

        /**
         * When the resource starts to load.
         *
         * @memberof Resource
         * @callback OnStartSignal
         * @param {Resource} resource - The resource that the event happened on.
         */

        /**
         * When the resource reports loading progress.
         *
         * @memberof Resource
         * @callback OnProgressSignal
         * @param {Resource} resource - The resource that the event happened on.
         * @param {number} percentage - The progress of the load in the range [0, 1].
         */

        /**
         * When the resource finishes loading.
         *
         * @memberof Resource
         * @callback OnCompleteSignal
         * @param {Resource} resource - The resource that the event happened on.
         */
    }

    /**
     * Stores whether or not this url is a data url.
     *
     * @member {boolean}
     * @readonly
     */
    get isDataUrl() {
        return this._hasFlag(Resource.STATUS_FLAGS.DATA_URL);
    }

    /**
     * Describes if this resource has finished loading. Is true when the resource has completely
     * loaded.
     *
     * @member {boolean}
     * @readonly
     */
    get isComplete() {
        return this._hasFlag(Resource.STATUS_FLAGS.COMPLETE);
    }

    /**
     * Describes if this resource is currently loading. Is true when the resource starts loading,
     * and is false again when complete.
     *
     * @member {boolean}
     * @readonly
     */
    get isLoading() {
        return this._hasFlag(Resource.STATUS_FLAGS.LOADING);
    }

    /**
     * Marks the resource as complete.
     *
     */
    complete() {
        // TODO: Clean this up in a wrapper or something...gross....
        if (this.data && this.data.removeEventListener) {
            this.data.removeEventListener('error', this._boundOnError, false);
            this.data.removeEventListener('load', this._boundComplete, false);
            this.data.removeEventListener('progress', this._boundOnProgress, false);
            this.data.removeEventListener('canplaythrough', this._boundComplete, false);
        }

        if (this.xhr) {
            if (this.xhr.removeEventListener) {
                this.xhr.removeEventListener('error', this._boundXhrOnError, false);
                this.xhr.removeEventListener('abort', this._boundXhrOnAbort, false);
                this.xhr.removeEventListener('progress', this._boundOnProgress, false);
                this.xhr.removeEventListener('load', this._boundXhrOnLoad, false);
            }
            else {
                this.xhr.onerror = null;
                this.xhr.ontimeout = null;
                this.xhr.onprogress = null;
                this.xhr.onload = null;
            }
        }

        if (this.isComplete) {
            throw new Error('Complete called again for an already completed resource.');
        }

        this._setFlag(Resource.STATUS_FLAGS.COMPLETE, true);
        this._setFlag(Resource.STATUS_FLAGS.LOADING, false);

        this.onComplete.dispatch(this);
    }

    /**
     * Aborts the loading of this resource, with an optional message.
     *
     * @param {string} message - The message to use for the error
     */
    abort(message) {
        // abort can be called multiple times, ignore subsequent calls.
        if (this.error) {
            return;
        }

        // store error
        this.error = new Error(message);

        // abort the actual loading
        if (this.xhr) {
            this.xhr.abort();
        }
        else if (this.xdr) {
            this.xdr.abort();
        }
        else if (this.data) {
            // single source
            if (this.data.src) {
                this.data.src = Resource.EMPTY_GIF;
            }
            // multi-source
            else {
                while (this.data.firstChild) {
                    this.data.removeChild(this.data.firstChild);
                }
            }
        }

        // done now.
        this.complete();
    }

    /**
     * Kicks off loading of this resource. This method is asynchronous.
     *
     * @param {function} [cb] - Optional callback to call once the resource is loaded.
     */
    load(cb) {
        if (this.isLoading) {
            return;
        }

        if (this.isComplete) {
            if (cb) {
                setTimeout(() => cb(this), 1);
            }

            return;
        }
        else if (cb) {
            this.onComplete.once(cb);
        }

        this._setFlag(Resource.STATUS_FLAGS.LOADING, true);

        this.onStart.dispatch(this);

        // if unset, determine the value
        if (this.crossOrigin === false || typeof this.crossOrigin !== 'string') {
            this.crossOrigin = this._determineCrossOrigin(this.url);
        }

        switch (this.loadType) {
            case Resource.LOAD_TYPE.IMAGE:
                this.type = Resource.TYPE.IMAGE;
                this._loadElement('image');
                break;

            case Resource.LOAD_TYPE.AUDIO:
                this.type = Resource.TYPE.AUDIO;
                this._loadSourceElement('audio');
                break;

            case Resource.LOAD_TYPE.VIDEO:
                this.type = Resource.TYPE.VIDEO;
                this._loadSourceElement('video');
                break;

            case Resource.LOAD_TYPE.XHR:
                /* falls through */
            default:
                if (useXdr && this.crossOrigin) {
                    this._loadXdr();
                }
                else {
                    this._loadXhr();
                }
                break;
        }
    }

    /**
     * Checks if the flag is set.
     *
     * @private
     * @param {number} flag - The flag to check.
     * @return {boolean} True if the flag is set.
     */
    _hasFlag(flag) {
        return !!(this._flags & flag);
    }

    /**
     * (Un)Sets the flag.
     *
     * @private
     * @param {number} flag - The flag to (un)set.
     * @param {boolean} value - Whether to set or (un)set the flag.
     */
    _setFlag(flag, value) {
        this._flags = value ? (this._flags | flag) : (this._flags & ~flag);
    }

    /**
     * Loads this resources using an element that has a single source,
     * like an HTMLImageElement.
     *
     * @private
     * @param {string} type - The type of element to use.
     */
    _loadElement(type) {
        if (this.metadata.loadElement) {
            this.data = this.metadata.loadElement;
        }
        else if (type === 'image' && typeof window.Image !== 'undefined') {
            this.data = new Image();
        }
        else {
            this.data = document.createElement(type);
        }

        if (this.crossOrigin) {
            this.data.crossOrigin = this.crossOrigin;
        }

        if (!this.metadata.skipSource) {
            this.data.src = this.url;
        }

        this.data.addEventListener('error', this._boundOnError, false);
        this.data.addEventListener('load', this._boundComplete, false);
        this.data.addEventListener('progress', this._boundOnProgress, false);
    }

    /**
     * Loads this resources using an element that has multiple sources,
     * like an HTMLAudioElement or HTMLVideoElement.
     *
     * @private
     * @param {string} type - The type of element to use.
     */
    _loadSourceElement(type) {
        if (this.metadata.loadElement) {
            this.data = this.metadata.loadElement;
        }
        else if (type === 'audio' && typeof window.Audio !== 'undefined') {
            this.data = new Audio();
        }
        else {
            this.data = document.createElement(type);
        }

        if (this.data === null) {
            this.abort(`Unsupported element: ${type}`);

            return;
        }

        if (!this.metadata.skipSource) {
            // support for CocoonJS Canvas+ runtime, lacks document.createElement('source')
            if (navigator.isCocoonJS) {
                this.data.src = Array.isArray(this.url) ? this.url[0] : this.url;
            }
            else if (Array.isArray(this.url)) {
                const mimeTypes = this.metadata.mimeType;

                for (let i = 0; i < this.url.length; ++i) {
                    this.data.appendChild(
                        this._createSource(type, this.url[i], Array.isArray(mimeTypes) ? mimeTypes[i] : mimeTypes)
                    );
                }
            }
            else {
                const mimeTypes = this.metadata.mimeType;

                this.data.appendChild(
                    this._createSource(type, this.url, Array.isArray(mimeTypes) ? mimeTypes[0] : mimeTypes)
                );
            }
        }

        this.data.addEventListener('error', this._boundOnError, false);
        this.data.addEventListener('load', this._boundComplete, false);
        this.data.addEventListener('progress', this._boundOnProgress, false);
        this.data.addEventListener('canplaythrough', this._boundComplete, false);

        this.data.load();
    }

    /**
     * Loads this resources using an XMLHttpRequest.
     *
     * @private
     */
    _loadXhr() {
        // if unset, determine the value
        if (typeof this.xhrType !== 'string') {
            this.xhrType = this._determineXhrType();
        }

        const xhr = this.xhr = new XMLHttpRequest();

        // set the request type and url
        xhr.open('GET', this.url, true);

        // load json as text and parse it ourselves. We do this because some browsers
        // *cough* safari *cough* can't deal with it.
        if (this.xhrType === Resource.XHR_RESPONSE_TYPE.JSON || this.xhrType === Resource.XHR_RESPONSE_TYPE.DOCUMENT) {
            xhr.responseType = Resource.XHR_RESPONSE_TYPE.TEXT;
        }
        else {
            xhr.responseType = this.xhrType;
        }

        xhr.addEventListener('error', this._boundXhrOnError, false);
        xhr.addEventListener('abort', this._boundXhrOnAbort, false);
        xhr.addEventListener('progress', this._boundOnProgress, false);
        xhr.addEventListener('load', this._boundXhrOnLoad, false);

        xhr.send();
    }

    /**
     * Loads this resources using an XDomainRequest. This is here because we need to support IE9 (gross).
     *
     * @private
     */
    _loadXdr() {
        // if unset, determine the value
        if (typeof this.xhrType !== 'string') {
            this.xhrType = this._determineXhrType();
        }

        const xdr = this.xhr = new XDomainRequest();

        // XDomainRequest has a few quirks. Occasionally it will abort requests
        // A way to avoid this is to make sure ALL callbacks are set even if not used
        // More info here: http://stackoverflow.com/questions/15786966/xdomainrequest-aborts-post-on-ie-9
        xdr.timeout = 5000;

        xdr.onerror = this._boundXhrOnError;
        xdr.ontimeout = this._boundXdrOnTimeout;
        xdr.onprogress = this._boundOnProgress;
        xdr.onload = this._boundXhrOnLoad;

        xdr.open('GET', this.url, true);

        // Note: The xdr.send() call is wrapped in a timeout to prevent an
        // issue with the interface where some requests are lost if multiple
        // XDomainRequests are being sent at the same time.
        // Some info here: https://github.com/photonstorm/phaser/issues/1248
        setTimeout(() => xdr.send(), 1);
    }

    /**
     * Creates a source used in loading via an element.
     *
     * @private
     * @param {string} type - The element type (video or audio).
     * @param {string} url - The source URL to load from.
     * @param {string} [mime] - The mime type of the video
     * @return {HTMLSourceElement} The source element.
     */
    _createSource(type, url, mime) {
        if (!mime) {
            mime = `${type}/${this._getExtension(url)}`;
        }

        const source = document.createElement('source');

        source.src = url;
        source.type = mime;

        return source;
    }

    /**
     * Called if a load errors out.
     *
     * @param {Event} event - The error event from the element that emits it.
     * @private
     */
    _onError(event) {
        this.abort(`Failed to load element using: ${event.target.nodeName}`);
    }

    /**
     * Called if a load progress event fires for xhr/xdr.
     *
     * @private
     * @param {XMLHttpRequestProgressEvent|Event} event - Progress event.
     */
    _onProgress(event) {
        if (event && event.lengthComputable) {
            this.onProgress.dispatch(this, event.loaded / event.total);
        }
    }

    /**
     * Called if an error event fires for xhr/xdr.
     *
     * @private
     * @param {XMLHttpRequestErrorEvent|Event} event - Error event.
     */
    _xhrOnError() {
        const xhr = this.xhr;

        this.abort(`${reqType(xhr)} Request failed. Status: ${xhr.status}, text: "${xhr.statusText}"`);
    }

    /**
     * Called if an abort event fires for xhr.
     *
     * @private
     * @param {XMLHttpRequestAbortEvent} event - Abort Event
     */
    _xhrOnAbort() {
        this.abort(`${reqType(this.xhr)} Request was aborted by the user.`);
    }

    /**
     * Called if a timeout event fires for xdr.
     *
     * @private
     * @param {Event} event - Timeout event.
     */
    _xdrOnTimeout() {
        this.abort(`${reqType(this.xhr)} Request timed out.`);
    }

    /**
     * Called when data successfully loads from an xhr/xdr request.
     *
     * @private
     * @param {XMLHttpRequestLoadEvent|Event} event - Load event
     */
    _xhrOnLoad() {
        const xhr = this.xhr;
        let text = '';
        let status = typeof xhr.status === 'undefined' ? STATUS_OK : xhr.status; // XDR has no `.status`, assume 200.

        // responseText is accessible only if responseType is '' or 'text' and on older browsers
        if (xhr.responseType === '' || xhr.responseType === 'text' || typeof xhr.responseType === 'undefined') {
            text = xhr.responseText;
        }

        // status can be 0 when using the `file://` protocol so we also check if a response is set.
        // If it has a response, we assume 200; otherwise a 0 status code with no contents is an aborted request.
        if (status === STATUS_NONE && text.length > 0) {
            status = STATUS_OK;
        }
        // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
        else if (status === STATUS_IE_BUG_EMPTY) {
            status = STATUS_EMPTY;
        }

        const statusType = (status / 100) | 0;

        if (statusType === STATUS_TYPE_OK) {
            // if text, just return it
            if (this.xhrType === Resource.XHR_RESPONSE_TYPE.TEXT) {
                this.data = text;
                this.type = Resource.TYPE.TEXT;
            }
            // if json, parse into json object
            else if (this.xhrType === Resource.XHR_RESPONSE_TYPE.JSON) {
                try {
                    this.data = JSON.parse(text);
                    this.type = Resource.TYPE.JSON;
                }
                catch (e) {
                    this.abort(`Error trying to parse loaded json: ${e}`);

                    return;
                }
            }
            // if xml, parse into an xml document or div element
            else if (this.xhrType === Resource.XHR_RESPONSE_TYPE.DOCUMENT) {
                try {
                    if (window.DOMParser) {
                        const domparser = new DOMParser();

                        this.data = domparser.parseFromString(text, 'text/xml');
                    }
                    else {
                        const div = document.createElement('div');

                        div.innerHTML = text;

                        this.data = div;
                    }

                    this.type = Resource.TYPE.XML;
                }
                catch (e) {
                    this.abort(`Error trying to parse loaded xml: ${e}`);

                    return;
                }
            }
            // other types just return the response
            else {
                this.data = xhr.response || text;
            }
        }
        else {
            this.abort(`[${xhr.status}] ${xhr.statusText}: ${xhr.responseURL}`);

            return;
        }

        this.complete();
    }

    /**
     * Sets the `crossOrigin` property for this resource based on if the url
     * for this resource is cross-origin. If crossOrigin was manually set, this
     * function does nothing.
     *
     * @private
     * @param {string} url - The url to test.
     * @param {object} [loc=window.location] - The location object to test against.
     * @return {string} The crossOrigin value to use (or empty string for none).
     */
    _determineCrossOrigin(url, loc) {
        // data: and javascript: urls are considered same-origin
        if (url.indexOf('data:') === 0) {
            return '';
        }

        // default is window.location
        loc = loc || window.location;

        if (!tempAnchor) {
            tempAnchor = document.createElement('a');
        }

        // let the browser determine the full href for the url of this resource and then
        // parse with the node url lib, we can't use the properties of the anchor element
        // because they don't work in IE9 :(
        tempAnchor.href = url;
        url = parseUri(tempAnchor.href, { strictMode: true });

        const samePort = (!url.port && loc.port === '') || (url.port === loc.port);
        const protocol = url.protocol ? `${url.protocol}:` : '';

        // if cross origin
        if (url.host !== loc.hostname || !samePort || protocol !== loc.protocol) {
            return 'anonymous';
        }

        return '';
    }

    /**
     * Determines the responseType of an XHR request based on the extension of the
     * resource being loaded.
     *
     * @private
     * @return {Resource.XHR_RESPONSE_TYPE} The responseType to use.
     */
    _determineXhrType() {
        return Resource._xhrTypeMap[this.extension] || Resource.XHR_RESPONSE_TYPE.TEXT;
    }

    /**
     * Determines the loadType of a resource based on the extension of the
     * resource being loaded.
     *
     * @private
     * @return {Resource.LOAD_TYPE} The loadType to use.
     */
    _determineLoadType() {
        return Resource._loadTypeMap[this.extension] || Resource.LOAD_TYPE.XHR;
    }

    /**
     * Extracts the extension (sans '.') of the file being loaded by the resource.
     *
     * @private
     * @return {string} The extension.
     */
    _getExtension() {
        let url = this.url;
        let ext = '';

        if (this.isDataUrl) {
            const slashIndex = url.indexOf('/');

            ext = url.substring(slashIndex + 1, url.indexOf(';', slashIndex));
        }
        else {
            const queryStart = url.indexOf('?');
            const hashStart = url.indexOf('#');
            const index = Math.min(
                queryStart > -1 ? queryStart : url.length,
                hashStart > -1 ? hashStart : url.length
            );

            url = url.substring(0, index);
            ext = url.substring(url.lastIndexOf('.') + 1);
        }

        return ext.toLowerCase();
    }

    /**
     * Determines the mime type of an XHR request based on the responseType of
     * resource being loaded.
     *
     * @private
     * @param {Resource.XHR_RESPONSE_TYPE} type - The type to get a mime type for.
     * @return {string} The mime type to use.
     */
    _getMimeFromXhrType(type) {
        switch (type) {
            case Resource.XHR_RESPONSE_TYPE.BUFFER:
                return 'application/octet-binary';

            case Resource.XHR_RESPONSE_TYPE.BLOB:
                return 'application/blob';

            case Resource.XHR_RESPONSE_TYPE.DOCUMENT:
                return 'application/xml';

            case Resource.XHR_RESPONSE_TYPE.JSON:
                return 'application/json';

            case Resource.XHR_RESPONSE_TYPE.DEFAULT:
            case Resource.XHR_RESPONSE_TYPE.TEXT:
                /* falls through */
            default:
                return 'text/plain';

        }
    }
}

/**
 * The types of resources a resource could represent.
 *
 * @static
 * @readonly
 * @enum {number}
 */
Resource.STATUS_FLAGS = {
    NONE:       0,
    DATA_URL:   (1 << 0),
    COMPLETE:   (1 << 1),
    LOADING:    (1 << 2),
};

/**
 * The types of resources a resource could represent.
 *
 * @static
 * @readonly
 * @enum {number}
 */
Resource.TYPE = {
    UNKNOWN:    0,
    JSON:       1,
    XML:        2,
    IMAGE:      3,
    AUDIO:      4,
    VIDEO:      5,
    TEXT:       6,
};

/**
 * The types of loading a resource can use.
 *
 * @static
 * @readonly
 * @enum {number}
 */
Resource.LOAD_TYPE = {
    /** Uses XMLHttpRequest to load the resource. */
    XHR:    1,
    /** Uses an `Image` object to load the resource. */
    IMAGE:  2,
    /** Uses an `Audio` object to load the resource. */
    AUDIO:  3,
    /** Uses a `Video` object to load the resource. */
    VIDEO:  4,
};

/**
 * The XHR ready states, used internally.
 *
 * @static
 * @readonly
 * @enum {string}
 */
Resource.XHR_RESPONSE_TYPE = {
    /** string */
    DEFAULT:    'text',
    /** ArrayBuffer */
    BUFFER:     'arraybuffer',
    /** Blob */
    BLOB:       'blob',
    /** Document */
    DOCUMENT:   'document',
    /** Object */
    JSON:       'json',
    /** String */
    TEXT:       'text',
};

Resource._loadTypeMap = {
    // images
    gif:        Resource.LOAD_TYPE.IMAGE,
    png:        Resource.LOAD_TYPE.IMAGE,
    bmp:        Resource.LOAD_TYPE.IMAGE,
    jpg:        Resource.LOAD_TYPE.IMAGE,
    jpeg:       Resource.LOAD_TYPE.IMAGE,
    tif:        Resource.LOAD_TYPE.IMAGE,
    tiff:       Resource.LOAD_TYPE.IMAGE,
    webp:       Resource.LOAD_TYPE.IMAGE,
    tga:        Resource.LOAD_TYPE.IMAGE,
    svg:        Resource.LOAD_TYPE.IMAGE,
    'svg+xml':  Resource.LOAD_TYPE.IMAGE, // for SVG data urls

    // audio
    mp3:        Resource.LOAD_TYPE.AUDIO,
    ogg:        Resource.LOAD_TYPE.AUDIO,
    wav:        Resource.LOAD_TYPE.AUDIO,

    // videos
    mp4:        Resource.LOAD_TYPE.VIDEO,
    webm:       Resource.LOAD_TYPE.VIDEO,
};

Resource._xhrTypeMap = {
    // xml
    xhtml:      Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    html:       Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    htm:        Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    xml:        Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    tmx:        Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    svg:        Resource.XHR_RESPONSE_TYPE.DOCUMENT,

    // This was added to handle Tiled Tileset XML, but .tsx is also a TypeScript React Component.
    // Since it is way less likely for people to be loading TypeScript files instead of Tiled files,
    // this should probably be fine.
    tsx:        Resource.XHR_RESPONSE_TYPE.DOCUMENT,

    // images
    gif:        Resource.XHR_RESPONSE_TYPE.BLOB,
    png:        Resource.XHR_RESPONSE_TYPE.BLOB,
    bmp:        Resource.XHR_RESPONSE_TYPE.BLOB,
    jpg:        Resource.XHR_RESPONSE_TYPE.BLOB,
    jpeg:       Resource.XHR_RESPONSE_TYPE.BLOB,
    tif:        Resource.XHR_RESPONSE_TYPE.BLOB,
    tiff:       Resource.XHR_RESPONSE_TYPE.BLOB,
    webp:       Resource.XHR_RESPONSE_TYPE.BLOB,
    tga:        Resource.XHR_RESPONSE_TYPE.BLOB,

    // json
    json:       Resource.XHR_RESPONSE_TYPE.JSON,

    // text
    text:       Resource.XHR_RESPONSE_TYPE.TEXT,
    txt:        Resource.XHR_RESPONSE_TYPE.TEXT,

    // fonts
    ttf:        Resource.XHR_RESPONSE_TYPE.BUFFER,
    otf:        Resource.XHR_RESPONSE_TYPE.BUFFER,
};

// We can't set the `src` attribute to empty string, so on abort we set it to this 1px transparent gif
Resource.EMPTY_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

/**
 * Quick helper to set a value on one of the extension maps. Ensures there is no
 * dot at the start of the extension.
 *
 * @ignore
 * @param {object} map - The map to set on.
 * @param {string} extname - The extension (or key) to set.
 * @param {number} val - The value to set.
 */
function setExtMap(map, extname, val) {
    if (extname && extname.indexOf('.') === 0) {
        extname = extname.substring(1);
    }

    if (!extname) {
        return;
    }

    map[extname] = val;
}

/**
 * Quick helper to get string xhr type.
 *
 * @ignore
 * @param {XMLHttpRequest|XDomainRequest} xhr - The request to check.
 * @return {string} The type.
 */
function reqType(xhr) {
    return xhr.toString().replace('object ', '');
}
