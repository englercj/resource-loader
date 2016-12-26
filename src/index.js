import Loader from './Loader';
import Resource from './Resource';
import * as async from './async';
import * as b64 from './b64';

Loader.Resource = Resource;
Loader.async = async;
Loader.base64 = b64;

// export manually, and also as default
module.exports = Loader; // eslint-disable-line no-undef
export default Loader;
