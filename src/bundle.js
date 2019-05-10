import * as async from './async';
import * as middleware from './middleware';
import { Loader } from './Loader';
import { Resource } from './Resource';
import { encodeBinary } from './encodeBinary';

Object.defineProperties(Loader, {
    Resource: { get() {
        return Resource;
    } },
    async: { get() {
        return async;
    } },
    encodeBinary: { get() {
        return encodeBinary;
    } },
    middleware: { get() {
        return middleware;
    } },
});

export default Loader;
