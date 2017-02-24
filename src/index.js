// import Loader from './Loader';
// import Resource from './Resource';
// import * as async from './async';
// import * as b64 from './b64';

/* eslint-disable no-undef */

const Loader = require('./Loader').default;
const Resource = require('./Resource').default;
const async = require('./async');
const b64 = require('./b64');

Loader.Resource = Resource;
Loader.async = async;
Loader.base64 = b64;

// export manually, and also as default
module.exports = Loader;
// export default Loader;
module.exports.default = Loader;
