var expect = require('chai').expect,
    sinon  = require('sinon'),
    Resource = require('../../src/Resource'),
    resource = null;

describe('Resource', function () {
    it('should construct properly');

    describe('#complete', function () {
        it('should emit the `complete` event');
        it('should remove events from the data element');
    });

    describe('#load', function () {
        it('should kick off loading using Image');
        it('should kick off loading using Audio');
        it('should kick off loading using Video');
        it('should kick off loading using XHR');
    });
});
