var Resource = require('../../Resource');

window.URL = window.URL || window.webkitURL;

// a middleware for transforming XHR loaded Blobs into more useful objects

module.exports = function () {
    return function (resource, next) {
        // if this was an XHR load
        if (resource.xhr && resource.xhrType === Resource.XHR_RESPONSE_TYPE.BLOB) {
            // if content type says this is an image, then we need to transform the blob into an Image object
            if (resource.data.type.indexOf('image') === 0) {
                resource.data = new Image();
                resource.data.src = URL.createObjectURL(resource.data);

                // cleanup the no longer used blob after the image loads
                resource.data.onload = function () {
                    URL.revokeObjectURL(resource.data.src);
                    resource.data.onload = null;
                };
            }
        }

        next();
    };
};
