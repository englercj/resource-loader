module.exports = require('./Loader');

module.exports.Resource = require('./Resource');

module.exports.middleware = {
    caching: {
        memory: require('./middlewares/caching/memory')
    },
    parsing: {
        json: require('./middlewares/parsing/json'),
        blob: require('./middlewares/parsing/blob')
    }
};
