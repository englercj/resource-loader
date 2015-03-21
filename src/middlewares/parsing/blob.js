var Resource = require('../../Resource');

window.URL = window.URL || window.webkitURL;

// a middleware for transforming XHR loaded Blobs into more useful objects

module.exports = function () {
    return function (resource, next) {
        // if this was an XHR load
        if (resource.xhr && resource.xhrType === Resource.XHR_RESPONSE_TYPE.BLOB) {
            // if content type says this is an image, then we should transform the blob into an Image object
            if (resource.data.type.indexOf('image') === 0) {
                var src = URL.createObjectURL(resource.data);

                resource.blob = resource.data;
                resource.data = new Image();
                resource.data.src = src;

                // cleanup the no longer used blob after the image loads
                resource.data.onload = function () {
                    URL.revokeObjectURL(src);
                    resource.data.onload = null;

                    next();
                };
            }
        }
        else {
            next();
        }
    };
};
