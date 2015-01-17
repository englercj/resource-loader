var async = require('async'),
    EventEmitter2 = require('eventemitter2').EventEmitter2;

/**
 * Manages the state and loading of multiple resources to load.
 *
 * @class
 * @param baseUrl {string} The base url for all resources loaded by this loader.
 */
function Loader(baseUrl) {
    EventEmitter2.call(this);

    /**
     * The base url for all resources loaded by this loader.
     *
     * @member {string}
     */
    this.baseUrl = baseUrl || '';

    /**
     * The resources waiting to be loaded.
     *
     * @member {Resource[]}
     */
    this.queue = [];

    /**
     * The progress percent of the loader going through the queue.
     *
     * @member {number}
     */
    this.progress = 0;

    /**
     * The percentage of total progress that a single resource represents.
     *
     * @member {number}
     */
    this._progressChunk = 0;

    /**
     * The middleware to run before loading each resource.
     *
     * @member {function[]}
     */
    this._beforeMiddleware = [];

    /**
     * The middleware to run after loading each resource.
     *
     * @member {function[]}
     */
    this._afterMiddleware = [];

    /**
     * The `_loadResource` function bound with this object context.
     *
     * @private
     * @member {function}
     */
    this._boundLoadResource = this._loadResource.bind(this);

    /**
     * The `_onComplete` function bound with this object context.
     *
     * @private
     * @member {function}
     */
    this._boundOnComplete = this._onComplete.bind(this);

    /**
     * Emitted once per loaded or errored resource.
     *
     * @event progress
     */

    /**
     * Emitted once per errored resource.
     *
     * @event error
     */

    /**
     * Emitted once per loaded resource.
     *
     * @event load
     */

    /**
     * Emitted when the loader begins to process the queue.
     *
     * @event start
     */

    /**
     * Emitted when the queued resources all load.
     *
     * @event complete
     */
}

Loader.prototype = Object.create(EventEmitter2.prototype);
Loader.prototype.constructor = Loader;
module.exports = Loader;

/**
 * Adds a resource (or multiple resources) to the loader queue.
 *
 * @alias enqueue
 * @param url {string} The url for this resource, relative to the baseUrl of this loader.
 * @param [crossOrigin] {boolean} Is this request cross-origin? Default is to determine automatically.
 * @param [loadType=Resource.LOAD_TYPE.XHR] {Resource.LOAD_TYPE} How should this resource be loaded?
 * @return {Loader}
 */
Loader.prototype.add = Loader.prototype.enqueue = function (url, crossOrigin, loadType) {
    this.queue.push(new Resource(this.baseUrl + url, crossOrigin, loadType));

    return this;
};


/**
 * Sets up a middleware function that will run *before* the
 * resource is loaded.
 *
 * @alias before
 * @param middleware {function} The middleware function to register.
 * @return {Loader}
 */
Loader.prototype.pre = Loader.prototype.before = function (fn) {
    this._beforeMiddleware.push(fn);

    return this;
};

/**
 * Sets up a middleware function that will run *after* the
 * resource is loaded.
 *
 * @alias after
 * @param middleware {function} The middleware function to register.
 * @return {Loader}
 */
Loader.prototype.use = Loader.prototype.after = function (fn) {
    this._afterMiddleware.push(fn);

    return this;
};

/**
 * Resets the queue of the loader to prepare for a new load.
 *
 * @return {Loader}
 */
Loader.prototype.reset = function () {
    this.queue.length = 0;
    this.progress = 0;
};

/**
 * Starts loading the queued resources.
 *
 * @fires start
 * @param [parallel=true] {boolean} Should the queue be downloaded in parallel?
 * @param [callback] {function} Optional callback that will be bound to the `complete` event.
 * @return {Loader}
 */
Loader.prototype.load = function (parallel, cb) {
    if (typeof parallel === 'function') {
        cb = parallel;
    }

    this._progressChunk = 100 / this.queue.length;

    this.emit('start');

    // only disable parallel if they explicitly pass `false`
    if (parallel === false) {
        async.each(this.queue, this._boundLoadResource, this._onComplete);
    }
    else {
        async.eachSeries(this.queue, this._boundLoadResource, this._onComplete);
    }

    return this;
};

/**
 * Loads a single resource.
 *
 * @fires progress
 * @private
 */
Loader.prototype._loadResource = function (resource, next) {
    var self = this;

    this._runMiddleware(resource, this._beforeMiddleware, function () {
        resource.on('progress', self.emit.bind(self, 'progress'));
        resource.on('load', self._onLoad.bind(self, resource, next));

        resource.load();
    });
};

/**
 * Called once each resource has loaded.
 *
 * @fires complete
 * @private
 */
Loader.prototype._onComplete = function () {
    this.emit('complete');
};

/**
 * Called each time a resources is loaded.
 *
 * @fires progress
 * @fires error
 * @fires load
 * @private
 */
Loader.prototype._onLoad = function (resource, next) {
    this.progress += this._progressChunk;

    this.emit('progress', resource);

    if (resource.error) {
        this.emit('error', resource);
    }
    else {
        this.emit('load', resource)
    }

    this._runMiddleware(resource, this._afterMiddleware, next);
};

/**
 * Run middleware functions on a resource.
 *
 * @private
 */
Loader.prototype._runMiddleware = function (resource, fns, cb) {
    var self = this;

    async.eachSeries(fns, function (fn, next) {
        fn.call(self, resource, next);
    }, cb);
};

Loader.LOAD_TYPE = Resource.LOAD_TYPE;
Loader.XHR_READY_STATE = Resource.XHR_READY_STATE;
Loader.XHR_RESPONSE_TYPE = Resource.XHR_RESPONSE_TYPE;
