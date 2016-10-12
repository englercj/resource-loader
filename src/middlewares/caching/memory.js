// a simple in-memory cache for resources
const cache = {};

export function memoryMiddlewareFactory() {
    return function memoryMiddleware(resource, next) {
        // if cached, then set data and complete the resource
        if (cache[resource.url]) {
            resource.data = cache[resource.url];
            resource.complete(); // marks resource load complete and stops processing before middlewares
        }
        // if not cached, wait for complete and store it in the cache.
        else {
            resource.onComplete.once(() => (cache[this.url] = this.data));
        }

        next();
    };
}
