var loader = null;

describe('Loader', function () {
    beforeEach(function () {
        loader = new Loader();
    });

    it('should have correct properties', function () {
        expect(loader).to.have.property('baseUrl', '');
        expect(loader).to.have.property('queue');
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

            expect(loader.queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', url);
            expect(res).to.have.property('crossOrigin', options.crossOrigin);
            expect(res).to.have.property('loadType', options.loadType);
            expect(res).to.have.property('xhrType', options.xhrType);
            expect(res).to.have.property('_events')
                .that.has.property('afterMiddleware')
                .that.is.a('function');
        });

        it('creates a resource with just name, url, and options', function () {
            loader.add(name, url, options);

            expect(loader.queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', url);
            expect(res).to.have.property('crossOrigin', options.crossOrigin);
            expect(res).to.have.property('loadType', options.loadType);
            expect(res).to.have.property('xhrType', options.xhrType);
        });

        it('creates a resource with just name, url, and a callback', function () {
            loader.add(name, url, callback);

            expect(loader.queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', url);
            expect(res).to.have.property('_events')
                .that.has.property('afterMiddleware')
                .that.is.a('function');
        });

        it('creates a resource with just name and url', function () {
            loader.add(name, url);

            expect(loader.queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', url);
        });

        it('creates a resource with just url, options, and a callback', function () {
            loader.add(url, options, callback);

            expect(loader.queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', url);
            expect(res).to.have.property('url', url);
            expect(res).to.have.property('crossOrigin', options.crossOrigin);
            expect(res).to.have.property('loadType', options.loadType);
            expect(res).to.have.property('xhrType', options.xhrType);
            expect(res).to.have.property('_events')
                .that.has.property('afterMiddleware')
                .that.is.a('function');
        });

        it('creates a resource with just url and options', function () {
            loader.add(url, options);

            expect(loader.queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', url);
            expect(res).to.have.property('url', url);
            expect(res).to.have.property('crossOrigin', options.crossOrigin);
            expect(res).to.have.property('loadType', options.loadType);
            expect(res).to.have.property('xhrType', options.xhrType);
        });

        it('creates a resource with just url and a callback', function () {
            loader.add(url, callback);

            expect(loader.queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', url);
            expect(res).to.have.property('url', url);
            expect(res).to.have.property('_events')
                .that.has.property('afterMiddleware')
                .that.is.a('function');
        });

        it('creates a resource with just url', function () {
            loader.add(url);

            expect(loader.queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', url);
            expect(res).to.have.property('url', url);
        });

        it('creates a resource with just an object (name/url keys) and callback param', function () {
            loader.add({ name: name, url: url }, callback);

            expect(loader.queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', url);
            expect(res).to.have.property('_events')
                .that.has.property('afterMiddleware')
                .that.is.a('function');
        });

        it('creates a resource with just an object (name/url/callback keys)', function () {
            loader.add({ name: name, url: url, onComplete: callback });

            expect(loader.queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', url);
            expect(res).to.have.property('_events')
                .that.has.property('afterMiddleware')
                .that.is.a('function');
        });

        it('creates a resource with just an object (url/callback keys)', function () {
            loader.add({ url: url, onComplete: callback });

            expect(loader.queue.length()).to.equal(0);
            expect(loader._buffer).to.have.length(1);

            var res = loader._buffer[0];

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', url);
            expect(res).to.have.property('url', url);
            expect(res).to.have.property('_events')
                .that.has.property('afterMiddleware')
                .that.is.a('function');
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
        it('should add a middleware that runs after loading a resource');
    });

    describe('#reset', function () {
        it('should reset the progress of the loader');
        it('should reset the queue of the loader');
    });

    describe('#load', function () {
        it('should run the `before` middleware, before loading a resource');
        it('should run the `after` middleware, after loading a resource');
        it('should properly load the resource');
    });

    describe('#loadResource', function () {
        it('should run the before middleware before loading the resource');
        it('should load a resource passed into it');
    });

    describe('#_onComplete', function () {
        it('should emit the `complete` event');
    });

    describe('#_onLoad', function () {
        it('should emit the `progress` event');
        it('should emit the `error` event when the resource has an error');
        it('should emit the `load` event when the resource loads successfully');
        it('should run the after middleware');
    });

    describe('#_runMiddleware', function () {
        it('should run each middleware function');
    });
});
