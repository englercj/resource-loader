/**
 * Smaller version of the async library constructs.
 *
 */
function _noop() { /* empty */ }

/**
 * Iterates an array in series.
 *
 * @param {Array.<*>} array - Array to iterate.
 * @param {function} iterator - Function to call for each element.
 * @param {function} callback - Function to call when done, or on error.
 * @param {boolean} [deferNext=false] - Break synchronous each loop by calling next with a setTimeout of 1.
 */
export function eachSeries(array, iterator, callback, deferNext) {
    let i = 0;
    const len = array.length;

    (function next(err) {
        if (err || i === len) {
            if (callback) {
                callback(err);
            }

            return;
        }

        if (deferNext) {
            setTimeout(() => {
                iterator(array[i++], next);
            }, 1);
        }
        else {
            iterator(array[i++], next);
        }
    })();
}

/**
 * Ensures a function is only called once.
 *
 * @param {function} fn - The function to wrap.
 * @return {function} The wrapping function.
 */
function onlyOnce(fn) {
    return function onceWrapper() {
        if (fn === null) {
            throw new Error('Callback was already called.');
        }

        const callFn = fn;

        fn = null;
        callFn.apply(this, arguments);
    };
}

/**
 * Async queue implementation,
 *
 * @param {function} worker - The worker function to call for each task.
 * @param {number} concurrency - How many workers to run in parrallel.
 * @return {*} The async queue object.
 */
export function queue(worker, concurrency) {
    if (concurrency == null) { // eslint-disable-line no-eq-null,eqeqeq
        concurrency = 1;
    }
    else if (concurrency === 0) {
        throw new Error('Concurrency must not be zero');
    }

    let workers = 0;
    const q = {
        _tasks: [],
        concurrency,
        saturated: _noop,
        unsaturated: _noop,
        buffer: concurrency / 4,
        empty: _noop,
        drain: _noop,
        error: _noop,
        started: false,
        paused: false,
        push(data, callback) {
            _insert(data, false, callback);
        },
        kill() {
            workers = 0;
            q.drain = _noop;
            q.started = false;
            q._tasks = [];
        },
        unshift(data, callback) {
            _insert(data, true, callback);
        },
        process() {
            while (!q.paused && workers < q.concurrency && q._tasks.length) {
                const task = q._tasks.shift();

                if (q._tasks.length === 0) {
                    q.empty();
                }

                workers += 1;

                if (workers === q.concurrency) {
                    q.saturated();
                }

                worker(task.data, onlyOnce(_next(task)));
            }
        },
        length() {
            return q._tasks.length;
        },
        running() {
            return workers;
        },
        idle() {
            return q._tasks.length + workers === 0;
        },
        pause() {
            if (q.paused === true) {
                return;
            }

            q.paused = true;
        },
        resume() {
            if (q.paused === false) {
                return;
            }

            q.paused = false;

            // Need to call q.process once per concurrent
            // worker to preserve full concurrency after pause
            for (let w = 1; w <= q.concurrency; w++) {
                q.process();
            }
        },
    };

    function _insert(data, insertAtFront, callback) {
        if (callback != null && typeof callback !== 'function') { // eslint-disable-line no-eq-null,eqeqeq
            throw new Error('task callback must be a function');
        }

        q.started = true;

        if (data == null && q.idle()) { // eslint-disable-line no-eq-null,eqeqeq
            // call drain immediately if there are no tasks
            setTimeout(() => q.drain(), 1);

            return;
        }

        const item = {
            data,
            callback: typeof callback === 'function' ? callback : _noop,
        };

        if (insertAtFront) {
            q._tasks.unshift(item);
        }
        else {
            q._tasks.push(item);
        }

        setTimeout(() => q.process(), 1);
    }

    function _next(task) {
        return function next() {
            workers -= 1;

            task.callback.apply(task, arguments);

            if (arguments[0] != null) { // eslint-disable-line no-eq-null,eqeqeq
                q.error(arguments[0], task.data);
            }

            if (workers <= (q.concurrency - q.buffer)) {
                q.unsaturated();
            }

            if (q.idle()) {
                q.drain();
            }

            q.process();
        };
    }

    return q;
}
