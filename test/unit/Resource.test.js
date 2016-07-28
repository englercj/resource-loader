describe('Resource', function () {
    var request;
    var res;
    var xhr;
    var name = 'test-resource';

    before(function () {
        xhr = sinon.useFakeXMLHttpRequest();
        xhr.onCreate = function (req) {
            request = req;
        };
    });

    after(function () {
        xhr.restore();
    });

    beforeEach(function () {
        res = new Resource(name, fixtureData.url);
        request = null;
    });

    it('should construct properly with only a URL passed', function () {
        expect(res).to.have.property('name', name);
        expect(res).to.have.property('url', fixtureData.url);
        expect(res).to.have.property('data', null);
        expect(res).to.have.property('crossOrigin', undefined);
        expect(res).to.have.property('loadType', Resource.LOAD_TYPE.XHR);
        expect(res).to.have.property('xhrType', undefined);
        expect(res).to.have.property('metadata').that.is.eql({});
        expect(res).to.have.property('error', null);
        expect(res).to.have.property('xhr', null);

        expect(res).to.have.property('isDataUrl', false);
        expect(res).to.have.property('isJson', false);
        expect(res).to.have.property('isXml', false);
        expect(res).to.have.property('isImage', false);
        expect(res).to.have.property('isAudio', false);
        expect(res).to.have.property('isVideo', false);
        expect(res).to.have.property('isComplete', false);
    });

    it('should construct properly with options passed', function () {
        var meta = { some: 'thing' };
        var res = new Resource(name, fixtureData.url, {
            crossOrigin: true,
            loadType: Resource.LOAD_TYPE.IMAGE,
            xhrType: Resource.XHR_RESPONSE_TYPE.BLOB,
            metadata: meta
        });

        expect(res).to.have.property('name', name);
        expect(res).to.have.property('url', fixtureData.url);
        expect(res).to.have.property('data', null);
        expect(res).to.have.property('crossOrigin', 'anonymous');
        expect(res).to.have.property('loadType', Resource.LOAD_TYPE.IMAGE);
        expect(res).to.have.property('xhrType', Resource.XHR_RESPONSE_TYPE.BLOB);
        expect(res).to.have.property('metadata', meta);
        expect(res).to.have.property('error', null);
        expect(res).to.have.property('xhr', null);

        expect(res).to.have.property('isDataUrl', false);
        expect(res).to.have.property('isJson', false);
        expect(res).to.have.property('isXml', false);
        expect(res).to.have.property('isImage', false);
        expect(res).to.have.property('isAudio', false);
        expect(res).to.have.property('isVideo', false);
        expect(res).to.have.property('isComplete', false);
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
            };
            var mock = sinon.mock(data);

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
            };
            var mock = sinon.mock(data);

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

            expect(request).to.exist;
            expect(spy).to.have.been.calledWith(res);
        });

        it('should emit the complete event', function () {
            var spy = sinon.spy();

            res.on('complete', spy);

            res.load();

            request.respond(200, fixtureData.dataJsonHeaders, fixtureData.dataJson);

            expect(request).to.exist;
            expect(spy).to.have.been.calledWith(res);
        });

        it('should not load and emit a complete event if data is assigned before load', function () {
            var spy = sinon.spy();

            res.on('complete', spy);

            res.complete();
            res.load();

            expect(request).not.to.exist;
            expect(spy).to.have.been.calledWith(res);
        });

        it('should throw an error if complete is called twice', function () {
            function fn() {
                res.complete();
            }

            expect(fn).to.not.throw(Error);
            expect(fn).to.throw(Error);
        });

        it('should load using a data url', function (done) {
            var res = new Resource(name, fixtureData.dataUrlGif);

            res.on('complete', function () {
                expect(res).to.have.property('data').instanceOf(Image)
                    .and.is.an.instanceOf(HTMLImageElement)
                    .and.have.property('src', fixtureData.dataUrlGif);

                done();
            });

            res.load();
        });

        it('should load using a svg data url', function (done) {
            var res = new Resource(name, fixtureData.dataUrlSvg);

            res.on('complete', function () {
                expect(res).to.have.property('data').instanceOf(Image)
                    .and.is.an.instanceOf(HTMLImageElement)
                    .and.have.property('src', fixtureData.dataUrlSvg);

                done();
            });

            res.load();
        });

        it('should load using XHR', function (done) {
            res.on('complete', function () {
                expect(res).to.have.property('data', fixtureData.dataJson);
                done();
            });

            res.load();

            expect(request).to.exist;

            request.respond(200, fixtureData.dataJsonHeaders, fixtureData.dataJson);
        });

        it('should load using Image', function () {
            var res = new Resource(name, fixtureData.url, { loadType: Resource.LOAD_TYPE.IMAGE });

            res.load();

            expect(request).to.not.exist;

            expect(res).to.have.property('data').instanceOf(Image)
                .and.is.an.instanceOf(HTMLImageElement)
                .and.have.property('src', fixtureData.url);
        });

        it('should load using Audio', function () {
            var res = new Resource(name, fixtureData.url, { loadType: Resource.LOAD_TYPE.AUDIO });

            res.load();

            expect(request).to.not.exist;

            expect(res).to.have.property('data').instanceOf(HTMLAudioElement);

            expect(res.data.children).to.have.length(1);
            expect(res.data.children[0]).to.have.property('src', fixtureData.url);
        });

        it('should load using Video', function () {
            var res = new Resource(name, fixtureData.url, { loadType: Resource.LOAD_TYPE.VIDEO });

            res.load();

            expect(request).to.not.exist;

            expect(res).to.have.property('data').instanceOf(HTMLVideoElement);

            expect(res.data.children).to.have.length(1);
            expect(res.data.children[0]).to.have.property('src', fixtureData.url);
        });

        it('should used the passed element for loading', function () {
            var img = new Image();
            var spy = sinon.spy(img, 'addEventListener');
            var res = new Resource(name, fixtureData.url, {
                loadType: Resource.LOAD_TYPE.IMAGE,
                metadata: { loadElement: img }
            });

            res.load();

            expect(spy).to.have.been.calledThrice;
            expect(img).to.have.property('src', fixtureData.url);

            spy.restore();
        });

        it('should used the passed element for loading, and skip assigning src', function () {
            var img = new Image();
            var spy = sinon.spy(img, 'addEventListener');
            var res = new Resource(name, fixtureData.url, {
                loadType: Resource.LOAD_TYPE.IMAGE,
                metadata: { loadElement: img, skipSource: true }
            });

            res.load();

            expect(spy).to.have.been.calledThrice;
            expect(img).to.have.property('src', '');

            spy.restore();
        });
    });

    describe('#_determineCrossOrigin', function () {
        it('should properly detect same-origin requests (#1)', function () {
            expect(res._determineCrossOrigin(
                'https://google.com',
                { hostname: 'google.com', port: '', protocol: 'https:' }
            )).to.equal('');
        });

        it('should properly detect same-origin requests (#2)', function () {
            expect(res._determineCrossOrigin(
                'https://google.com:443',
                { hostname: 'google.com', port: '', protocol: 'https:' }
            )).to.equal('');
        });

        it('should properly detect same-origin requests (#3)', function () {
            expect(res._determineCrossOrigin(
                'http://www.google.com:5678',
                { hostname: 'www.google.com', port: '5678', protocol: 'http:' }
            )).to.equal('');
        });

        it('should properly detect cross-origin requests (#1)', function () {
            expect(res._determineCrossOrigin(
                'https://google.com',
                { hostname: 'google.com', port: '123', protocol: 'https:' }
            )).to.equal('anonymous');
        });

        it('should properly detect cross-origin requests (#2)', function () {
            expect(res._determineCrossOrigin(
                'https://google.com',
                { hostname: 'google.com', port: '', protocol: 'http:' }
            )).to.equal('anonymous');
        });

        it('should properly detect cross-origin requests (#3)', function () {
            expect(res._determineCrossOrigin(
                'https://google.com',
                { hostname: 'googles.com', port: '', protocol: 'https:' }
            )).to.equal('anonymous');
        });

        it('should properly detect cross-origin requests (#4)', function () {
            expect(res._determineCrossOrigin(
                'https://google.com',
                { hostname: 'www.google.com', port: '123', protocol: 'https:' }
            )).to.equal('anonymous');
        });
    });

    describe('#_getExtension', function () {
        it('should return the proper extension', function () {
            res.url = 'http://www.google.com/image.png';
            expect(res._getExtension()).to.equal('png');

            res.url = 'http://domain.net/really/deep/path/that/goes/for/a/while/movie.wmv';
            expect(res._getExtension()).to.equal('wmv');

            res.url = 'http://somewhere.io/path.with.dots/and_a-bunch_of.symbols/data.txt';
            expect(res._getExtension()).to.equal('txt');

            res.url = 'http://nowhere.me/image.jpg?query=true&string=false&name=real';
            expect(res._getExtension()).to.equal('jpg');

            res.url = 'http://nowhere.me/image.jpeg?query=movie.wmv&file=data.json';
            expect(res._getExtension()).to.equal('jpeg');

            res.url = 'http://nowhere.me/image.jpeg?query=movie.wmv&file=data.json';
            expect(res._getExtension()).to.equal('jpeg');

            res.isDataUrl = true;
            res.url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAMSURBVBhXY2BgYAAAAAQAAVzN/2kAAAAASUVORK5CYII='; // eslint-disable-line max-len
            expect(res._getExtension()).to.equal('png');
        });
    });
});
