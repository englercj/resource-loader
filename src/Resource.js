'use strict';

var EventEmitter    = require('eventemitter3');
var parseUri        = require('parse-uri');

// tests is CORS is supported in XHR, if not we need to use XDR
var useXdr = !!(window.XDomainRequest && !('withCredentials' in (new XMLHttpRequest())));
var tempAnchor = null;

// some status constants
var STATUS_NONE = 0;
var STATUS_OK = 200;
var STATUS_EMPTY = 204;

/**
 * Manages the state and loading of a single resource represented by
 * a single URL.
 *
 * @class
 * @param {string} name - The name of the resource to load.
 * @param {string|string[]} url - The url for this resource, for audio/video loads you can pass an array of sources.
 * @param {object} [options] - The options for the load.
 * @param {string|boolean} [options.crossOrigin] - Is this request cross-origin? Default is to determine automatically.
 * @param {Resource.LOAD_TYPE} [options.loadType=Resource.LOAD_TYPE.XHR] - How should this resource be loaded?
 * @param {Resource.XHR_RESPONSE_TYPE} [options.xhrType=Resource.XHR_RESPONSE_TYPE.DEFAULT] - How should the data being
 *      loaded be interpreted when using XHR?
 * @param {object} [options.metadata] - Extra info for middleware.
 */
function Resource(name, url, options) {
    EventEmitter.call(this);

    options = options || {};

    if (typeof name !== 'string' || typeof url !== 'string') {
        throw new Error('Both name and url are required for constructing a resource.');
    }

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
     * Stores whether or not this url is a data url.
     *
     * @member {boolean}
     * @readonly
     */
    this.isDataUrl = this.url.indexOf('data:') === 0;

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
     */
    this.xhr = null;

    /**
     * Describes if this resource was loaded as json. Only valid after the resource
     * has completely loaded.
     *
     * @member {boolean}
     */
    this.isJson = false;

    /**
     * Describes if this resource was loaded as xml. Only valid after the resource
     * has completely loaded.
     *
     * @member {boolean}
     */
    this.isXml = false;

    /**
     * Describes if this resource was loaded as an image tag. Only valid after the resource
     * has completely loaded.
     *
     * @member {boolean}
     */
    this.isImage = false;

    /**
     * Describes if this resource was loaded as an audio tag. Only valid after the resource
     * has completely loaded.
     *
     * @member {boolean}
     */
    this.isAudio = false;

    /**
     * Describes if this resource was loaded as a video tag. Only valid after the resource
     * has completely loaded.
     *
     * @member {boolean}
     */
    this.isVideo = false;

    /**
     * Describes if this resource has finished loading. Is true when the resource has completely
     * loaded.
     *
     * @member {boolean}
     */
    this.isComplete = false;

    /**
     * Describes if this resource is currently loading. Is true when the resource starts loading,
     * and is false again when complete.
     *
     * @member {boolean}
     */
    this.isLoading = false;

    /**
     * The `dequeue` method that will be used a storage place for the async queue dequeue method
     * used privately by the loader.
     *
     * @private
     * @member {function}
     */
    this._dequeue = null;

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
     * Emitted when the resource beings to load.
     *
     * @event start
     * @memberof Resource#
     */

    /**
     * Emitted each time progress of this resource load updates.
     * Not all resources types and loader systems can support this event
     * so sometimes it may not be available. If the resource
     * is being loaded on a modern browser, using XHR, and the remote server
     * properly sets Content-Length headers, then this will be available.
     *
     * @event progress
     * @memberof Resource#
     */

    /**
     * Emitted once this resource has loaded, if there was an error it will
     * be in the `error` property.
     *
     * @event complete
     * @memberof Resource#
     */
}

Resource.prototype = Object.create(EventEmitter.prototype);
Resource.prototype.constructor = Resource;
module.exports = Resource;

/**
 * Marks the resource as complete.
 *
 * @fires complete
 */
Resource.prototype.complete = function () {
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

    this.isComplete = true;
    this.isLoading = false;

    this.emit('complete', this);
};

/**
 * Aborts the loading of this resource, with an optional message.
 *
 * @param {string} message - The message to use for the error
 */
Resource.prototype.abort = function (message) {
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
        if (typeof this.data.src !== 'undefined') {
            this.data.src = '';
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
};

/**
 * Kicks off loading of this resource. This method is asynchronous.
 *
 * @fires start
 * @param {function} [cb] - Optional callback to call once the resource is loaded.
 */
Resource.prototype.load = function (cb) {
    if (this.isLoading) {
        return;
    }

    if (this.isComplete) {
        if (cb) {
            var self = this;

            setTimeout(function () {
                cb(self);
            }, 1);
        }

        return;
    }
    else if (cb) {
        this.once('complete', cb);
    }

    this.isLoading = true;

    this.emit('start', this);

    // if unset, determine the value
    if (this.crossOrigin === false || typeof this.crossOrigin !== 'string') {
        this.crossOrigin = this._determineCrossOrigin(this.url);
    }

    switch (this.loadType) {
        case Resource.LOAD_TYPE.IMAGE:
            this._loadElement('image');
            break;

        case Resource.LOAD_TYPE.AUDIO:
            this._loadSourceElement('audio');
            break;

        case Resource.LOAD_TYPE.VIDEO:
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
};

/**
 * Loads this resources using an element that has a single source,
 * like an HTMLImageElement.
 *
 * @private
 * @param {string} type - The type of element to use.
 */
Resource.prototype._loadElement = function (type) {
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

    var typeName = 'is' + type[0].toUpperCase() + type.substring(1);

    if (this[typeName] === false) {
        this[typeName] = true;
    }

    this.data.addEventListener('error', this._boundOnError, false);
    this.data.addEventListener('load', this._boundComplete, false);
    this.data.addEventListener('progress', this._boundOnProgress, false);
};

/**
 * Loads this resources using an element that has multiple sources,
 * like an HTMLAudioElement or HTMLVideoElement.
 *
 * @private
 * @param {string} type - The type of element to use.
 */
Resource.prototype._loadSourceElement = function (type) {
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
        this.abort('Unsupported element ' + type);

        return;
    }

    if (!this.metadata.skipSource) {
        // support for CocoonJS Canvas+ runtime, lacks document.createElement('source')
        if (navigator.isCocoonJS) {
            this.data.src = Array.isArray(this.url) ? this.url[0] : this.url;
        }
        else if (Array.isArray(this.url)) {
            for (var i = 0; i < this.url.length; ++i) {
                this.data.appendChild(this._createSource(type, this.url[i]));
            }
        }
        else {
            this.data.appendChild(this._createSource(type, this.url));
        }
    }

    this['is' + type[0].toUpperCase() + type.substring(1)] = true;

    this.data.addEventListener('error', this._boundOnError, false);
    this.data.addEventListener('load', this._boundComplete, false);
    this.data.addEventListener('progress', this._boundOnProgress, false);
    this.data.addEventListener('canplaythrough', this._boundComplete, false);

    this.data.load();
};

/**
 * Loads this resources using an XMLHttpRequest.
 *
 * @private
 */
Resource.prototype._loadXhr = function () {
    // if unset, determine the value
    if (typeof this.xhrType !== 'string') {
        this.xhrType = this._determineXhrType();
    }

    var xhr = this.xhr = new XMLHttpRequest();

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
};

/**
 * Loads this resources using an XDomainRequest. This is here because we need to support IE9 (gross).
 *
 * @private
 */
Resource.prototype._loadXdr = function () {
    // if unset, determine the value
    if (typeof this.xhrType !== 'string') {
        this.xhrType = this._determineXhrType();
    }

    var xdr = this.xhr = new XDomainRequest();

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
    setTimeout(function () {
        xdr.send();
    }, 0);
};

/**
 * Creates a source used in loading via an element.
 *
 * @private
 * @param {string} type - The element type (video or audio).
 * @param {string} url - The source URL to load from.
 * @param {string} [mime] - The mime type of the video
 * @return {HTMLSourceElement} The source element.
 */
Resource.prototype._createSource = function (type, url, mime) {
    if (!mime) {
        mime = type + '/' + url.substr(url.lastIndexOf('.') + 1);
    }

    var source = document.createElement('source');

    source.src = url;
    source.type = mime;

    return source;
};

/**
 * Called if a load errors out.
 *
 * @param {Event} event - The error event from the element that emits it.
 * @private
 */
Resource.prototype._onError = function (event) {
    this.abort('Failed to load element using ' + event.target.nodeName);
};

/**
 * Called if a load progress event fires for xhr/xdr.
 *
 * @fires progress
 * @private
 * @param {XMLHttpRequestProgressEvent|Event} event - Progress event.
 */
Resource.prototype._onProgress = function (event) {
    if (event && event.lengthComputable) {
        this.emit('progress', this, event.loaded / event.total);
    }
};

/**
 * Called if an error event fires for xhr/xdr.
 *
 * @private
 * @param {XMLHttpRequestErrorEvent|Event} event - Error event.
 */
Resource.prototype._xhrOnError = function () {
    var xhr = this.xhr;

    this.abort(reqType(xhr) + ' Request failed. Status: ' + xhr.status + ', text: "' + xhr.statusText + '"');
};

/**
 * Called if an abort event fires for xhr.
 *
 * @private
 * @param {XMLHttpRequestAbortEvent} event - Abort Event
 */
Resource.prototype._xhrOnAbort = function () {
    this.abort(reqType(this.xhr) + ' Request was aborted by the user.');
};

/**
 * Called if a timeout event fires for xdr.
 *
 * @private
 * @param {Event} event - Timeout event.
 */
Resource.prototype._xdrOnTimeout = function () {
    this.abort(reqType(this.xhr) + ' Request timed out.');
};

/**
 * Called when data successfully loads from an xhr/xdr request.
 *
 * @private
 * @param {XMLHttpRequestLoadEvent|Event} event - Load event
 */
Resource.prototype._xhrOnLoad = function () {
    var xhr = this.xhr;
    var status = typeof xhr.status === 'undefined' ? xhr.status : STATUS_OK; // XDR has no `.status`, assume 200.

    // status can be 0 when using the file:// protocol, also check if a response was found
    if (status === STATUS_OK || status === STATUS_EMPTY || (status === STATUS_NONE && xhr.responseText.length > 0)) {
        // if text, just return it
        if (this.xhrType === Resource.XHR_RESPONSE_TYPE.TEXT) {
            this.data = xhr.responseText;
        }
        // if json, parse into json object
        else if (this.xhrType === Resource.XHR_RESPONSE_TYPE.JSON) {
            try {
                this.data = JSON.parse(xhr.responseText);
                this.isJson = true;
            }
            catch (e) {
                this.abort('Error trying to parse loaded json:', e);

                return;
            }
        }
        // if xml, parse into an xml document or div element
        else if (this.xhrType === Resource.XHR_RESPONSE_TYPE.DOCUMENT) {
            try {
                if (window.DOMParser) {
                    var domparser = new DOMParser();

                    this.data = domparser.parseFromString(xhr.responseText, 'text/xml');
                }
                else {
                    var div = document.createElement('div');

                    div.innerHTML = xhr.responseText;
                    this.data = div;
                }
                this.isXml = true;
            }
            catch (e) {
                this.abort('Error trying to parse loaded xml:', e);

                return;
            }
        }
        // other types just return the response
        else {
            this.data = xhr.response || xhr.responseText;
        }
    }
    else {
        this.abort('[' + xhr.status + ']' + xhr.statusText + ':' + xhr.responseURL);

        return;
    }

    this.complete();
};

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
Resource.prototype._determineCrossOrigin = function (url, loc) {
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

    var samePort = (!url.port && loc.port === '') || (url.port === loc.port);
    var protocol = url.protocol ? url.protocol + ':' : '';

    // if cross origin
    if (url.host !== loc.hostname || !samePort || protocol !== loc.protocol) {
        return 'anonymous';
    }

    return '';
};

/**
 * Determines the responseType of an XHR request based on the extension of the
 * resource being loaded.
 *
 * @private
 * @return {Resource.XHR_RESPONSE_TYPE} The responseType to use.
 */
Resource.prototype._determineXhrType = function () {
    return Resource._xhrTypeMap[this._getExtension()] || Resource.XHR_RESPONSE_TYPE.TEXT;
};

Resource.prototype._determineLoadType = function () {
    return Resource._loadTypeMap[this._getExtension()] || Resource.LOAD_TYPE.XHR;
};

Resource.prototype._getExtension = function () {
    var url = this.url;
    var ext = '';

    if (this.isDataUrl) {
        var slashIndex = url.indexOf('/');

        ext = url.substring(slashIndex + 1, url.indexOf(';', slashIndex));
    }
    else {
        var queryStart = url.indexOf('?');

        if (queryStart !== -1) {
            url = url.substring(0, queryStart);
        }

        ext = url.substring(url.lastIndexOf('.') + 1);
    }

    return ext.toLowerCase();
};

/**
 * Determines the mime type of an XHR request based on the responseType of
 * resource being loaded.
 *
 * @private
 * @param {Resource.XHR_RESPONSE_TYPE} type - The type to get a mime type for.
 * @return {string} The mime type to use.
 */
Resource.prototype._getMimeFromXhrType = function (type) {
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
};

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
    VIDEO:  4
};

/**
 * The XHR ready states, used internally.
 *
 * @static
 * @readonly
 * @enum {string}
 */
Resource.XHR_RESPONSE_TYPE = {
    /** defaults to text */
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
    TEXT:       'text'
};

Resource._loadTypeMap = {
    gif:      Resource.LOAD_TYPE.IMAGE,
    png:      Resource.LOAD_TYPE.IMAGE,
    bmp:      Resource.LOAD_TYPE.IMAGE,
    jpg:      Resource.LOAD_TYPE.IMAGE,
    jpeg:     Resource.LOAD_TYPE.IMAGE,
    tif:      Resource.LOAD_TYPE.IMAGE,
    tiff:     Resource.LOAD_TYPE.IMAGE,
    webp:     Resource.LOAD_TYPE.IMAGE,
    tga:      Resource.LOAD_TYPE.IMAGE,
    'svg+xml':  Resource.LOAD_TYPE.IMAGE
};

Resource._xhrTypeMap = {
    // xml
    xhtml:    Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    html:     Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    htm:      Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    xml:      Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    tmx:      Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    tsx:      Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    svg:      Resource.XHR_RESPONSE_TYPE.DOCUMENT,

    // images
    gif:      Resource.XHR_RESPONSE_TYPE.BLOB,
    png:      Resource.XHR_RESPONSE_TYPE.BLOB,
    bmp:      Resource.XHR_RESPONSE_TYPE.BLOB,
    jpg:      Resource.XHR_RESPONSE_TYPE.BLOB,
    jpeg:     Resource.XHR_RESPONSE_TYPE.BLOB,
    tif:      Resource.XHR_RESPONSE_TYPE.BLOB,
    tiff:     Resource.XHR_RESPONSE_TYPE.BLOB,
    webp:     Resource.XHR_RESPONSE_TYPE.BLOB,
    tga:      Resource.XHR_RESPONSE_TYPE.BLOB,

    // json
    json:     Resource.XHR_RESPONSE_TYPE.JSON,

    // text
    text:     Resource.XHR_RESPONSE_TYPE.TEXT,
    txt:      Resource.XHR_RESPONSE_TYPE.TEXT
};

/**
 * Sets the load type to be used for a specific extension.
 *
 * @static
 * @param {string} extname - The extension to set the type for, e.g. "png" or "fnt"
 * @param {Resource.LOAD_TYPE} loadType - The load type to set it to.
 */
Resource.setExtensionLoadType = function (extname, loadType) {
    setExtMap(Resource._loadTypeMap, extname, loadType);
};

/**
 * Sets the load type to be used for a specific extension.
 *
 * @static
 * @param {string} extname - The extension to set the type for, e.g. "png" or "fnt"
 * @param {Resource.XHR_RESPONSE_TYPE} xhrType - The xhr type to set it to.
 */
Resource.setExtensionXhrType = function (extname, xhrType) {
    setExtMap(Resource._xhrTypeMap, extname, xhrType);
};

function setExtMap(map, extname, val) {
    if (extname && extname.indexOf('.') === 0) {
        extname = extname.substring(1);
    }

    if (!extname) {
        return;
    }

    map[extname] = val;
}
