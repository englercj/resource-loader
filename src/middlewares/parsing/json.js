// a simple json-parsing middleware for resources

module.exports = function () {
    return function (resource, next) {
        // if this is a string, try to parse it as json
        if (typeof resource.data === 'string') {
            try {
                // resource.data is set by the XHR load
                resource.data = JSON.parse(resource.data);
            }
            catch (e) {
                // this isn't json, just move along
            }
        }

        // no matter what, just move along to next middleware
        next();
    };
};
