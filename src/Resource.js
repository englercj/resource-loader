 var EventEmitter2 = require('eventemitter2').EventEmitter2;

/**
 * Manages the state and loading of a single resource represented by
 * a single URL.
 *
 * @class
 * @param url {string} The url for this resource.
 * @param [crossOrigin] {boolean} Is this request cross-origin? Default is to determine automatically.
 * @param [loadType=Resource.LOAD_TYPE.XHR] {Resource.XHR_LOAD_TYPE} How should this resource be loaded?
 * @param [xhrType=Resource.XHR_RESPONSE_TYPE.DEFAULT] {Resource.XHR_RESPONSE_TYPE} How should the data being
 *      loaded be interpreted when using XHR?
 */
function Resource(url, crossOrigin, loadType, xhrType) {
    EventEmitter2.call(this);

    /**
     * The url used to load this resource.
     *
     * @member {string}
     * @readonly
     */
    this.url = url;

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
    this.crossOrigin = crossOrigin;

    /**
     * The method of loading to use for this resource.
     *
     * @member {Resource.LOAD_TYPE}
     */
    this.loadType = loadType || Resource.XHR_LOAD_TYPE.XHR;

    /**
     * The type used to load the resource via XHR. If unset, determined automatically.
     *
     * @member {string}
     */
    this.xhrType = xhrType || Resource.XHR_RESPONSE_TYPE.DEFAULT;

    /**
     * The error that occurred while loading (if any).
     *
     * @member {Error}
     * @readonly
     */
    this.error = null;

    /**
     * The XHR object that was used to load this resource. This is only set
     * when `loadType` is `Resource.XHR_LOAD_TYPE.XHR`.
     *
     * @member {XMLHttpRequest}
     */
    this.xhr = null;

    /**
     * The `complete` function bound to this resource's context.
     *
     * @member {function}
     * @private
     */
    this._boundComplete = this.complete.bind(this);

    /**
     * The `_onError` function bound to this resource's context.
     *
     * @member {function}
     * @private
     */
    this._boundOnError = this._onError.bind(this);

    /**
     * The `_onProgress` function bound to this resource's context.
     *
     * @member {function}
     * @private
     */
    this._boundOnProgress = this._onProgress.bind(this);

    /**
     * Emitted when the resource beings to load.
     *
     * @event start
     */

    /**
     * Emitted each time progress of this resource load updates.
     * Not all resources types and loader systems can support this event
     * so sometimes it may not be available. If the resource
     * is being loaded on a modern browser, using XHR, and the remote server
     * properly sets Content-Length headers, then this will be available.
     *
     * @event progress
     */

    /**
     * Emitted once this resource has loaded, if there was an error it will
     * be in the `error` property.
     *
     * @event complete
     */
}

Resource.prototype = Object.create(EventEmitter2.prototype);
Resource.prototype.constructor = Resource;
module.exports = Resource;

/**
 * Marks the resource as complete.
 *
 * @fires complete
 */
Resource.prototype.complete = function () {
    if (this.data.removeEventListener) {
        this.data.removeEventListener('error', this._boundOnError);
        this.data.removeEventListener('load', this._boundComplete);
        this.data.removeEventListener('progress', this._boundOnProgress);
        this.data.removeEventListener('canplaythrough', this._boundComplete);
    }

    this.emit('complete', this);
};

/**
 * Kicks off loading of this resource.
 *
 * @fires start
 */
Resource.prototype.load = function () {
    this.emit('start', this);

    // if unset, determine the value
    if (typeof this.crossOrigin !== 'string') {
        this.crossOrigin = this._determineCrossOrigin();
    }

    switch(this.loadType) {
        case Resource.LOAD_TYPE.IMAGE:
            this.data = new Image();
            this._loadObject();
            break;

        case Resource.LOAD_TYPE.AUDIO:
            this.data = new Audio();
            this._loadObject();
            break;

        case Resource.LOAD_TYPE.XHR:
            /* falls through */
        default:
            this._loadXhr();
            break;
    }
};

/**
 * Loads this resources using a pre-set Html Object (Image, Audio, Video, etc).
 *
 * @private
 */
Resource.prototype._loadObject = function () {
    if (this.crossOrigin) {
        this.data.crossOrigin = '';
    }

    this.data.src = this.url;

    this.data.addEventListener('error', this._boundOnError, false);
    this.data.addEventListener('load', this._boundComplete, false);
    this.data.addEventListener('progress', this._boundOnProgress, false);
    this.data.addEventListener('canplaythrough', this._boundComplete, false);
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

    var self = this,
        xhr = this.xhr = new XMLHttpRequest();

    // set the responseType
    xhr.responseType = this.xhrType;

    // handle a load error
    xhr.addEventListener('error', function () {
        self.error = new Error('XHR request failed. Status: ' + xhr.status + ', text: "' + xhr.statusText + '"');
        self.complete();
    }, false);

    // handle an aborted request
    xhr.addEventListener('abort', function () {
        self.error = new Error('XHR request was aborted by the user.');
        self.complete();
    }, false);

    // handle progress events
    xhr.addEventListener('progress', this._boundOnProgress, false);

    // handle a successful load
    xhr.addEventListener('load', function () {
        self.data = xhr.response;
        self.complete();
    }, false);

    xhr.open('GET', this.url, true);
    xhr.send();
};

/**
 * Called if a load errors out.
 *
 * @param error {Error} The error that happened.
 * @private
 */
Resource.prototype._onError = function (err) {
    this.error = err;
    this.complete();
};

/**
 * Called if a load progress event fires.
 *
 * @fires progress
 * @param event {XMLHttpRequestProgressEvent}
 * @private
 */
Resource.prototype._onProgress =  function (event) {
    if (event.lengthComputable) {
        this.emit('progress', event.loaded / event.total);
    }
};

/**
 * Sets the `crossOrigin` property for this resource based on if the url
 * for this resource is cross-origin. If crossOrigin was manually set, this
 * function does nothing.
 *
 * @private
 * @return {string} The crossOrigin value to use (or empty string for none).
 */
Resource.prototype._determineCrossOrigin = function () {
    // data: and javascript: urls are considered same-origin
    if (this.url.indexOf('data:') === 0) {
        return '';
    }

    // check if this is a cross-origin url
    var loc = window.location,
        a = document.createElement('a');

    a.href = this.url;

    // if cross origin
    if (a.hostname !== loc.hostname || a.port !== loc.port || a.protocol !== loc.protocol) {
        return 'anonymous';
    }

    return '';
};

Resource.prototype._determineXhrType = function () {
    var ext = this.url.substr(this.url.lastIndexOf('.') + 1);

    switch(ext) {
        // xml
        case 'xhtml':
        case 'html':
        case 'htm':
        case 'xml':
        case 'tmx':
        case 'tsx':
            return Resource.XHR_RESPONSE_TYPE.DOCUMENT;

        // images
        case 'gif':
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'tif':
        case 'tiff':
            return Resource.XHR_RESPONSE_TYPE.BLOB;

        // json
        case 'json':
            return Resource.XHR_RESPONSE_TYPE.JSON;

        // text
        case 'text':
        case 'txt':
            /* falls through */
        default:
            return Resource.XHR_RESPONSE_TYPE.TEXT;
    }
};

Resource.prototype._getMimeFromXhrType = function (type) {
    switch(type) {
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
 * The types of loading a resource can use.
 *
 * @static
 * @constant
 * @property {object} LOAD_TYPE
 * @property {number} LOAD_TYPE.XHR - Uses XMLHttpRequest to load the resource.
 * @property {number} LOAD_TYPE.IMAGE - Uses an `Image` object to load the resource.
 * @property {number} LOAD_TYPE.AUDIO - Uses an `Audio` object to load the resource.
 * @property {number} LOAD_TYPE.VIDEO - Uses a `Video` object to load the resource.
 */
Resource.LOAD_TYPE = {
    XHR:    1,
    IMAGE:  2,
    AUDIO:  3,
    VIDEO:  4
};

/**
 * The XHR ready states, used internally.
 *
 * @static
 * @constant
 * @property {object} XHR_READY_STATE
 * @property {number} XHR_READY_STATE.UNSENT - open()has not been called yet.
 * @property {number} XHR_READY_STATE.OPENED - send()has not been called yet.
 * @property {number} XHR_READY_STATE.HEADERS_RECEIVED - send() has been called, and headers and status are available.
 * @property {number} XHR_READY_STATE.LOADING - Downloading; responseText holds partial data.
 * @property {number} XHR_READY_STATE.DONE - The operation is complete.
 */
Resource.XHR_READY_STATE = {
    UNSENT: 0,
    OPENED: 1,
    HEADERS_RECEIVED: 2,
    LOADING: 3,
    DONE: 4
};

/**
 * The XHR ready states, used internally.
 *
 * @static
 * @constant
 * @property {object} XHR_RESPONSE_TYPE
 * @property {string} XHR_RESPONSE_TYPE.DEFAULT - defaults to text
 * @property {string} XHR_RESPONSE_TYPE.BUFFER - ArrayBuffer
 * @property {string} XHR_RESPONSE_TYPE.BLOB - Blob
 * @property {string} XHR_RESPONSE_TYPE.DOCUMENT - Document
 * @property {string} XHR_RESPONSE_TYPE.JSON - Object
 * @property {string} XHR_RESPONSE_TYPE.TEXT - String
 */
Resource.XHR_RESPONSE_TYPE = {
    DEFAULT:    '',
    BUFFER:     'arraybuffer',
    BLOB:       'blob',
    DOCUMENT:   'document',
    JSON:       'json',
    TEXT:       'text'
};
