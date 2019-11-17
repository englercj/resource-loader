'use strict';

const Resource = Loader.Resource;

describe('Resource', () => {
    let request;
    let res;
    let xhr;
    let clock;
    const name = 'test-resource';

    before(() => {
        xhr = sinon.useFakeXMLHttpRequest();
        xhr.onCreate = (req) => {
            request = req;
        };
        clock = sinon.useFakeTimers();
    });

    after(() => {
        xhr.restore();
        clock.restore();
    });

    beforeEach(() => {
        request = null;
        res = new Resource(name, { url: fixtureData.url });
    });

    it('should construct properly with only a URL passed', () => {
        expect(res).to.have.property('name', name);
        expect(res).to.have.property('children').that.is.empty;
        expect(res).to.have.property('data', null);
        expect(res).to.have.property('type', Loader.ResourceType.Unknown);
        expect(res).to.have.property('error', '');
        expect(res).to.have.property('progressChunk', 0);

        expect(res).to.have.property('url', fixtureData.url);
        expect(res).to.have.property('isLoading', false);
        expect(res).to.have.property('isComplete', false);

        expect(res).to.have.property('onStart');
        expect(res).to.have.property('onProgress');
        expect(res).to.have.property('onComplete');
        expect(res).to.have.property('onAfterMiddleware');
    });

    it('should construct properly with options passed', () => {
        const res = new Resource(name, {
            url: fixtureData.url,
            crossOrigin: 'anonymous',
            strategy: Loader.ImageLoadStrategy,
            xhrType: Loader.XhrLoadStrategy.ResponseType.Blob,
            some: 'thing',
        });

        expect(res).to.have.property('name', name);
        expect(res).to.have.property('children').that.is.empty;
        expect(res).to.have.property('data', null);
        expect(res).to.have.property('type', Loader.ResourceType.Unknown);
        expect(res).to.have.property('error', '');
        expect(res).to.have.property('progressChunk', 0);

        expect(res).to.have.property('url', fixtureData.url);
        expect(res).to.have.property('isLoading', false);
        expect(res).to.have.property('isComplete', false);

        expect(res).to.have.property('onStart');
        expect(res).to.have.property('onProgress');
        expect(res).to.have.property('onComplete');
        expect(res).to.have.property('onAfterMiddleware');
    });

    describe('#abort', () => {
        it('should abort in-flight XHR requests', () => {
            res.load();

            res._strategy._xhr.abort = sinon.spy();

            res.abort();

            expect(res._strategy._xhr.abort).to.have.been.calledOnce;
        });

        it('should abort in-flight XDR requests');

        it('should abort in-flight Image requests', () => {
            const res = new Resource(name, {
                url: fixtureData.url,
                strategy: Loader.ImageLoadStrategy,
            });

            res.load();

            expect(res._strategy._element.src).to.equal(fixtureData.url);

            res.abort();

            expect(res._strategy._element.src).to.not.equal(fixtureData.url);
        });

        it('should abort in-flight Video requests', () => {
            const res = new Resource(name, {
                url: fixtureData.url,
                strategy: Loader.VideoLoadStrategy,
            });

            res.load();

            expect(res._strategy._element.firstChild).to.exist;

            res.abort();

            expect(res._strategy._element.firstChild).to.not.exist;
        });

        it('should abort in-flight Audio requests', () => {
            const res = new Resource(name, {
                url: fixtureData.url,
                strategy: Loader.AudioLoadStrategy,
            });

            res.load();

            expect(res._strategy._element.firstChild).to.exist;

            res.abort();

            expect(res._strategy._element.firstChild).to.not.exist;
        });
    });

    describe('#load', () => {
        it('should emit the start event', () => {
            const spy = sinon.spy();

            res.onStart.add(spy);

            res.load();

            expect(request).to.exist;
            expect(spy).to.have.been.calledWith(res);
        });

        it('should emit the complete event', () => {
            const spy = sinon.spy();

            res.onComplete.add(spy);

            res.load();

            request.respond(200, fixtureData.dataJsonHeaders, fixtureData.dataJson);

            expect(request).to.exist;
            expect(spy).to.have.been.calledWith(res);
        });

        it('should load using a data url', (done) => {
            const res = new Resource(name, { url: fixtureData.dataUrlGif });

            res.onComplete.add(() => {
                expect(res).to.have.property('data').instanceOf(Image)
                    .and.is.an.instanceOf(HTMLImageElement)
                    .and.have.property('src', fixtureData.dataUrlGif);

                done();
            });

            res.load();
        });

        it('should load using a svg data url', (done) => {
            const res = new Resource(name, { url: fixtureData.dataUrlSvg });

            res.onComplete.add(() => {
                expect(res).to.have.property('data').instanceOf(Image)
                    .and.is.an.instanceOf(HTMLImageElement)
                    .and.have.property('src', fixtureData.dataUrlSvg);

                done();
            });

            res.load();
        });

        it('should load using XHR', (done) => {
            res.onComplete.add(() => {
                expect(res).to.have.property('data', fixtureData.dataJson);
                done();
            });

            res.load();

            expect(request).to.exist;

            request.respond(200, fixtureData.dataJsonHeaders, fixtureData.dataJson);
        });

        it('should load using Image', () => {
            const res = new Resource(name, { url: fixtureData.url, strategy: Loader.ImageLoadStrategy });

            res.load();

            expect(res._strategy).to.be.an.instanceOf(Loader.ImageLoadStrategy);

            expect(res._strategy).to.have.property('_element')
                .that.is.an.instanceOf(Image)
                .and.is.an.instanceOf(HTMLImageElement)
                .and.have.property('src', fixtureData.url);
        });

        it('should load using Audio', () => {
            const res = new Resource(name, { url: fixtureData.url, strategy: Loader.AudioLoadStrategy });

            res.load();

            expect(res._strategy).to.be.an.instanceOf(Loader.AudioLoadStrategy);

            expect(res._strategy).to.have.property('_element')
                .that.is.an.instanceOf(HTMLAudioElement);

            expect(res._strategy._element.children).to.have.length(1);
            expect(res._strategy._element.children[0]).to.have.property('src', fixtureData.url);
        });

        it('should load using Video', () => {
            const res = new Resource(name, { url: fixtureData.url, strategy: Loader.VideoLoadStrategy });

            res.load();

            expect(res._strategy).to.be.an.instanceOf(Loader.VideoLoadStrategy);

            expect(res._strategy).to.have.property('_element')
                .that.is.an.instanceOf(HTMLVideoElement);

            expect(res._strategy._element.children).to.have.length(1);
            expect(res._strategy._element.children[0]).to.have.property('src', fixtureData.url);
        });

        it('should used the passed element for loading', () => {
            const img = new Image();
            const spy = sinon.spy(img, 'addEventListener');
            const res = new Resource(name, {
                url: fixtureData.url,
                strategy: Loader.ImageLoadStrategy,
                loadElement: img,
            });

            res.load();

            expect(spy).to.have.been.calledTwice;
            expect(img).to.have.property('src', fixtureData.url);

            spy.restore();
        });
    });

    describe('#load with timeout', () => {
        it('should abort XHR loads', (done) => {
            const res = new Resource(name, { url: fixtureData.url, strategy: Loader.XhrLoadStrategy, timeout: 100 });

            res.onComplete.add(() => {
                expect(res).to.have.property('error').to.be.a('string');
                expect(res).to.have.property('data').equal(null);
                done();
            });

            res.load();

            expect(request).to.exist;
            request.triggerTimeout();
        });

        it('should abort Image loads', (done) => {
            const res = new Resource(name, { url: fixtureData.url, strategy: Loader.ImageLoadStrategy, timeout: 1000 });

            res.onComplete.add(() => {
                expect(res).to.have.property('error').to.be.a('string');
                done();
            });

            res.load();

            expect(res._strategy).to.have.property('_element')
                .that.is.an.instanceOf(Image)
                .and.is.an.instanceOf(HTMLImageElement)
                .and.have.property('src', fixtureData.url);

            clock.tick(1100);
        });

        it('should abort Audio loads', (done) => {
            const res = new Resource(name, { url: fixtureData.url, strategy: Loader.AudioLoadStrategy, timeout: 1000 });

            res.onComplete.add(() => {
                expect(res).to.have.property('error').to.be.a('string');
                done();
            });

            res.load();

            expect(res._strategy).to.have.property('_element')
                .that.is.an.instanceOf(HTMLAudioElement);

            expect(res._strategy._element.children).to.have.length(1);
            expect(res._strategy._element.children[0]).to.have.property('src', fixtureData.url);

            clock.tick(1100);
        });

        it('should abort Video loads', (done) => {
            const res = new Resource(name, { url: fixtureData.url, strategy: Loader.VideoLoadStrategy, timeout: 1000 });

            res.onComplete.add(() => {
                expect(res).to.have.property('error').to.be.a('string');
                done();
            });

            res.load();

            expect(res._strategy).to.have.property('_element')
                .that.is.an.instanceOf(HTMLVideoElement);

            expect(res._strategy._element.children).to.have.length(1);
            expect(res._strategy._element.children[0]).to.have.property('src', fixtureData.url);

            clock.tick(1100);
        });
    });

    describe('#load inside cordova', () => {
        beforeEach(() => {
            xhr.status = 0;
        });

        it('should load resource even if the status is 0', () => {
            res._strategy._xhr.responseText = 'I am loaded resource';
            res._strategy._onLoad();

            expect(res.isComplete).to.equal(true);
        });

        it('should load resource with array buffer data', () => {
            res._strategy._xhr.responseType = Loader.XhrLoadStrategy.ResponseType.Buffer;
            res._strategy._onLoad();

            expect(res.isComplete).to.equal(true);
        });
    });

    describe('#_determineCrossOrigin', () => {
        it('should properly detect same-origin requests (#1)', () => {
            expect(res._determineCrossOrigin(
                'https://google.com',
                { hostname: 'google.com', port: '', protocol: 'https:' }
            )).to.equal('');
        });

        it('should properly detect same-origin requests (#2)', () => {
            expect(res._determineCrossOrigin(
                'https://google.com:443',
                { hostname: 'google.com', port: '', protocol: 'https:' }
            )).to.equal('');
        });

        it('should properly detect same-origin requests (#3)', () => {
            expect(res._determineCrossOrigin(
                'http://www.google.com:5678',
                { hostname: 'www.google.com', port: '5678', protocol: 'http:' }
            )).to.equal('');
        });

        it('should properly detect cross-origin requests (#1)', () => {
            expect(res._determineCrossOrigin(
                'https://google.com',
                { hostname: 'google.com', port: '123', protocol: 'https:' }
            )).to.equal('anonymous');
        });

        it('should properly detect cross-origin requests (#2)', () => {
            expect(res._determineCrossOrigin(
                'https://google.com',
                { hostname: 'google.com', port: '', protocol: 'http:' }
            )).to.equal('anonymous');
        });

        it('should properly detect cross-origin requests (#3)', () => {
            expect(res._determineCrossOrigin(
                'https://google.com',
                { hostname: 'googles.com', port: '', protocol: 'https:' }
            )).to.equal('anonymous');
        });

        it('should properly detect cross-origin requests (#4)', () => {
            expect(res._determineCrossOrigin(
                'https://google.com',
                { hostname: 'www.google.com', port: '123', protocol: 'https:' }
            )).to.equal('anonymous');
        });
        it('should properly detect cross-origin requests (#5) - sandboxed iframe', () => {
            const originalOrigin = window.origin;

            // Set origin to 'null' to simulate sandboxed iframe without 'allow-same-origin' attribute
            window.origin = 'null';
            expect(res._determineCrossOrigin(
                'http://www.google.com:5678',
                { hostname: 'www.google.com', port: '5678', protocol: 'http:' }
            )).to.equal('anonymous');
            // Restore origin to prevent test leakage.
            window.origin = originalOrigin;
        });
    });

    describe('#_getExtension', () => {
        it('should return the proper extension', () => {
            let url;

            url = 'http://www.google.com/image.png';
            expect(Loader.getExtension(url)).to.equal('png');

            url = 'http://domain.net/really/deep/path/that/goes/for/a/while/movie.wmv';
            expect(Loader.getExtension(url)).to.equal('wmv');

            url = 'http://somewhere.io/path.with.dots/and_a-bunch_of.symbols/data.txt';
            expect(Loader.getExtension(url)).to.equal('txt');

            url = 'http://nowhere.me/image.jpg?query=true&string=false&name=real';
            expect(Loader.getExtension(url)).to.equal('jpg');

            url = 'http://nowhere.me/image.jpeg?query=movie.wmv&file=data.json';
            expect(Loader.getExtension(url)).to.equal('jpeg');

            url = 'http://nowhere.me/image.jpeg?query=movie.wmv&file=data.json';
            expect(Loader.getExtension(url)).to.equal('jpeg');

            url = 'http://nowhere.me/image.jpeg?query=movie.wmv&file=data.json#/derp.mp3';
            expect(Loader.getExtension(url)).to.equal('jpeg');

            url = 'http://nowhere.me/image.jpeg?query=movie.wmv&file=data.json#/derp.mp3&?me=two';
            expect(Loader.getExtension(url)).to.equal('jpeg');

            url = 'http://nowhere.me/image.jpeg#nothing-to-see-here?query=movie.wmv&file=data.json#/derp.mp3&?me=two'; // eslint-disable-line max-len
            expect(Loader.getExtension(url)).to.equal('jpeg');

            url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAMSURBVBhXY2BgYAAAAAQAAVzN/2kAAAAASUVORK5CYII='; // eslint-disable-line max-len
            expect(Loader.getExtension(url)).to.equal('png');
        });
    });
});
