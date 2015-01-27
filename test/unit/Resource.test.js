var url = 'https://www.google.com/images/srpr/logo11w.png',
    requests = [],
    res,
    xhr;

before(function () {
    requests.length = 0;

    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function (req) { requests.push(req); };
});

after(function () {
    xhr.restore();
});

describe('Resource', function () {
    beforeEach(function () {
        res = new Resource(url);
    });

    it('should construct properly with only a URL passed', function () {
        expect(res).to.have.property('url', url);
        expect(res).to.have.property('data', null);
        expect(res).to.not.have.property('crossOrigin'); //technically has the prop, but it is undefined
        expect(res).to.have.property('loadType', Resource.LOAD_TYPE.XHR);
        expect(res).to.have.property('xhrType', Resource.XHR_RESPONSE_TYPE.DEFAULT);
        expect(res).to.have.property('error', null);
        expect(res).to.have.property('xhr', null);
    });

    it('should construct properly with options passed', function () {
        var res = new Resource(url, {
            crossOrigin: true,
            loadType: Resource.LOAD_TYPE.IMAGE,
            xhrType: Resource.XHR_RESPONSE_TYPE.BLOB
        });

        expect(res).to.have.property('url', url);
        expect(res).to.have.property('data', null);
        expect(res).to.have.property('crossOrigin', true);
        expect(res).to.have.property('loadType', Resource.LOAD_TYPE.IMAGE);
        expect(res).to.have.property('xhrType', Resource.XHR_RESPONSE_TYPE.BLOB);
        expect(res).to.have.property('error', null);
        expect(res).to.have.property('xhr', null);
    });

    describe('#complete', function () {
        it('should emit the `complete` event', function () {
            var spy = sinon.spy();

            res.on('complete', spy);

            res.complete();

            expect(spy).to.have.been.calledWith(res);
        });

        it('should remove events from the data element', function () {
            var data = {
                    addEventListener: function () {},
                    removeEventListener: function () {}
                },
                mock = sinon.mock(data);

            mock.expects('removeEventListener').once().withArgs('error');
            mock.expects('removeEventListener').once().withArgs('load');
            mock.expects('removeEventListener').once().withArgs('progress');
            mock.expects('removeEventListener').once().withArgs('canplaythrough');

            res.data = data;
            res.complete();

            mock.verify();
        });

        it('should remove events from the xhr element', function () {
            var data = {
                    addEventListener: function () {},
                    removeEventListener: function () {}
                },
                mock = sinon.mock(data);

            mock.expects('removeEventListener').once().withArgs('error');
            mock.expects('removeEventListener').once().withArgs('abort');
            mock.expects('removeEventListener').once().withArgs('progress');
            mock.expects('removeEventListener').once().withArgs('load');

            res.xhr = data;
            res.complete();

            mock.verify();
        });
    });

    describe('#load', function () {
        it('should emit the start event', function () {
            var spy = sinon.spy();

            res.on('start', spy);

            res.load();

            expect(spy).to.have.been.calledWith(res);
        });

        it('should kick off loading using XHR');
        it('should kick off loading using Image');
        it('should kick off loading using Audio');
        it('should kick off loading using Video');
    });
});
