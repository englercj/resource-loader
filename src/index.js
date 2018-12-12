// import Loader from './Loader';
// import Resource from './Resource';
// import * as async from './async';
// import * as b64 from './b64';

/* eslint-disable no-undef */

const Loader = require('./Loader').Loader;
const Resource = require('./Resource').Resource;
const async = require('./async');
const b64 = require('./b64');

/**
 *
 * @static
 * @memberof Loader
 * @member {Resource}
 */
Loader.Resource = Resource;

/**
 *
 * @static
 * @memberof Loader
 * @member {async}
 */
Loader.async = async;

/**
 *
 * @static
 * @memberof Loader
 * @member {encodeBinary}
 */
Loader.encodeBinary = b64;

/**
 *
 * @deprecated
 * @see Loader.encodeBinary
 *
 * @static
 * @memberof Loader
 * @member {encodeBinary}
 */
Loader.base64 = b64;

// export manually, and also as default
module.exports = Loader;

// default & named export
module.exports.Loader = Loader;
module.exports.default = Loader;
