var loader = null,
    baseUrl = '/fixtures';

describe('Loader', function () {
    beforeEach(function () {
        loader = new Loader(baseUrl);
    });

    it('should have correct properties', function () {
        expect(loader).to.have.property('baseUrl', baseUrl);
        expect(loader).to.have.property('progress', 0);
    });

    it('should have correct public methods', function () {
        expect(loader).to.have.property('add').instanceOf(Function);
        expect(loader).to.have.property('before').instanceOf(Function);
        expect(loader).to.have.property('after').instanceOf(Function);
        expect(loader).to.have.property('reset').instanceOf(Function);
        expect(loader).to.have.property('load').instanceOf(Function);
    });

    describe('#add', function () {
        var name = 'test-resource',
            url = 'http://localhost/file',
            options = {
                crossOrigin: true,
                loadType: Resource.LOAD_TYPE.IMAGE,
                xhrType: Resource.XHR_RESPONSE_TYPE.DOCUMENT
            },
            callback = function () {};

        it('creates a resource using all arguments', function () {
            loader.add(name, url, options, callback);

            expect(loader._queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', url);
            expect(res).to.have.property('crossOrigin', options.crossOrigin ? 'anonymous' : null);
            expect(res).to.have.property('loadType', options.loadType);
            expect(res).to.have.property('xhrType', options.xhrType);

            expect(res.listeners('afterMiddleware'))
                .to.not.be.empty;
        });

        it('creates a resource with just name, url, and options', function () {
            loader.add(name, url, options);

            expect(loader._queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', url);
            expect(res).to.have.property('crossOrigin', options.crossOrigin ? 'anonymous' : null);
            expect(res).to.have.property('loadType', options.loadType);
            expect(res).to.have.property('xhrType', options.xhrType);
        });

        it('creates a resource with just name, url, and a callback', function () {
            loader.add(name, url, callback);

            expect(loader._queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', url);

            expect(res.listeners('afterMiddleware'))
                .to.not.be.empty
                .and.to.equal([callback]);
        });

        it('creates a resource with just name and url', function () {
            loader.add(name, url);

            expect(loader._queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', url);
        });

        it('creates a resource with just url, options, and a callback', function () {
            loader.add(url, options, callback);

            expect(loader._queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', url);
            expect(res).to.have.property('url', url);
            expect(res).to.have.property('crossOrigin', options.crossOrigin ? 'anonymous' : null);
            expect(res).to.have.property('loadType', options.loadType);
            expect(res).to.have.property('xhrType', options.xhrType);

            expect(res.listeners('afterMiddleware'))
                .to.not.be.empty
                .and.to.equal([callback]);
        });

        it('creates a resource with just url and options', function () {
            loader.add(url, options);

            expect(loader._queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', url);
            expect(res).to.have.property('url', url);
            expect(res).to.have.property('crossOrigin', options.crossOrigin ? 'anonymous' : null);
            expect(res).to.have.property('loadType', options.loadType);
            expect(res).to.have.property('xhrType', options.xhrType);
        });

        it('creates a resource with just url and a callback', function () {
            loader.add(url, callback);

            expect(loader._queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', url);
            expect(res).to.have.property('url', url);

            expect(res.listeners('afterMiddleware'))
                .to.not.be.empty
                .and.to.equal([callback]);
        });

        it('creates a resource with just url', function () {
            loader.add(url);

            expect(loader._queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', url);
            expect(res).to.have.property('url', url);
        });

        it('creates a resource with just an object (name/url keys) and callback param', function () {
            loader.add({ name: name, url: url }, callback);

            expect(loader._queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', url);

            expect(res.listeners('afterMiddleware'))
                .to.not.be.empty
                .and.to.equal([callback]);
        });

        it('creates a resource with just an object (name/url/callback keys)', function () {
            loader.add({ name: name, url: url, onComplete: callback });

            expect(loader._queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', url);

            expect(res.listeners('afterMiddleware'))
                .to.not.be.empty
                .and.to.equal([callback]);
        });

        it('creates a resource with just an object (url/callback keys)', function () {
            loader.add({ url: url, onComplete: callback });

            expect(loader._queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', url);
            expect(res).to.have.property('url', url);

            expect(res.listeners('afterMiddleware'))
                .to.not.be.empty
                .and.to.equal([callback]);
        });

        it('throws an error if url isn\'t passed', function () {
            expect(loader.add).to.throw(Error);
            expect(function () { loader.add(options); }).to.throw(Error);
            expect(function () { loader.add(callback); }).to.throw(Error);
            expect(function () { loader.add(options, callback); }).to.throw(Error);
        });
    });

    describe('#before', function () {
        it('should add a middleware that runs before loading a resource', function () {
            loader.before(function () {});

            expect(loader._beforeMiddleware).to.have.length(1);
        });
    });

    describe('#after', function () {
        it('should add a middleware that runs after loading a resource', function () {
            loader.after(function () {});

            expect(loader._afterMiddleware).to.have.length(1);
        });
    });

    describe('#reset', function () {
        it('should reset the loading state of the loader', function () {
            loader.loading = true;
            expect(loader.loading).to.equal(true);

            loader.reset();
            expect(loader.loading).to.equal(false);
        });

        it('should reset the progress of the loader', function () {
            loader.progress = 100;
            loader._progressChunk = 100;
            expect(loader.progress).to.equal(100);
            expect(loader._progressChunk).to.equal(100);

            loader.reset();
            expect(loader.progress).to.equal(0);
            expect(loader._progressChunk).to.equal(0);
        });

        it('should reset the queue/buffer of the loader', function () {
            loader._buffer.push('me');
            loader._numToLoad = 1;
            loader._queue.push('me');
            expect(loader._buffer.length).to.equal(1);
            expect(loader._numToLoad).to.equal(1);
            expect(loader._queue.length()).to.equal(1);
            expect(loader._queue.started).to.equal(true);

            loader.reset();
            expect(loader._buffer.length).to.equal(0);
            expect(loader._numToLoad).to.equal(0);
            expect(loader._queue.length()).to.equal(0);
            expect(loader._queue.started).to.equal(false);
        });

        it('should reset the resources of the loader', function () {
            loader.resources = { hey: 'there' };
            expect(loader.resources).to.not.be.empty;

            loader.reset();
            expect(loader.resources).to.be.empty;
        });
    });

    describe('#load', function () {
        it('should run the `before` middleware, before loading a resource');
        it('should run the `after` middleware, after loading a resource');
        it('should properly load the resource');
    });

    describe('#_loadResource', function () {
        it('should run the before middleware before loading the resource');
        it('should load a resource passed into it');
    });

    describe('#_onComplete', function () {
        it('should emit the `complete` event', function (done) {
            loader.on('complete', function (_l, resources) {
                expect(_l).to.equal(loader);
                expect(resources).to.equal(loader.resources);

                done();
            });

            loader._onComplete();
        });
    });

    describe('#_onLoad', function () {
        it('should emit the `progress` event');
        it('should emit the `error` event when the resource has an error');
        it('should emit the `load` event when the resource loads successfully');
        it('should run the after middleware');
    });

    describe('#_runMiddleware', function () {
        it('should run each middleware function', function () {
            var res = {},
                noop = function () {};

            var spy = sinon.spy(function (resource, next) {
                expect(resource).to.equal(res);
                next();
            });

            loader.pre(spy).before(spy);

            expect(loader._beforeMiddleware).to.have.length(2);

            loader._runMiddleware(res, loader._beforeMiddleware, noop);

            expect(spy).to.have.been.calledTwice;
        });
    });

    describe('events', function () {
        it('should call progress for each loaded asset', function (done) {
            loader.add([
                { name: 'hud', url: 'hud.png' },
                { name: 'hud2', url: 'hud2.png' }
            ]);

            var spy = sinon.spy();

            loader.on('progress', spy);

            loader.load(function () {
                expect(spy).to.have.been.calledTwice;
                done();
            });

        });

        it('progress should be 100% on complete', function (done) {
            loader.add([
                { name: 'hud', url: 'hud.png' },
                { name: 'hud2', url: 'hud2.png' }
            ]);

            loader.load(function () {
                expect(loader).to.have.property('progress', 100);
                done();
            });
        });

        it('should call progress for each loaded asset, even when a middleware adds more resources', function (done) {
            loader.add([
                { name: 'hud2', url: 'hud2.png' },
                { name: 'hud_atlas', url: 'hud.json' }
            ]);

            loader.use(spritesheetMiddleware());

            var spy = sinon.spy();

            loader.on('progress', spy);

            loader.load(function () {
                expect(spy).to.have.been.calledThrice;
                done();
            });
        });

        it('progress should be 100% on complete, even when a middleware adds more resources', function (done) {
            loader.add([
                { name: 'hud2', url: 'hud2.png' },
                { name: 'hud_atlas', url: 'hud.json' }
            ]);

            loader.use(spritesheetMiddleware());

            loader.load(function () {
                expect(loader).to.have.property('progress', 100);
                done();
            });
        });
    })
});
