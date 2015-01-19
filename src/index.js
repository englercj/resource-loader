module.exports = require('./Loader');

module.exports.middleware = {
    caching: {
        memory: require('./caching/memory')
    },
    parsing: {
        json: require('./parsing/json')
    }
};
