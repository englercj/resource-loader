/* eslint global-require: 0 */
'use strict';

module.exports = require('./Loader');
module.exports.Resource = require('./Resource');
module.exports.middleware = {
    caching: {
        memory: require('./middlewares/caching/memory')
    },
    parsing: {
        blob: require('./middlewares/parsing/blob')
    }
};

module.exports.async = require('./async');
