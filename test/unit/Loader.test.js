var loader = null;

describe('Loader', function () {
    beforeEach(function () {
        loader = new Loader();
    });

    it('should have correct properties', function () {
        expect(loader).to.have.property('baseUrl', '');
        expect(loader).to.have.property('queue').instanceOf(Array);
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
        it('should add a resource to the queue', function () {
            loader.add('http://google.com');

            expect(loader.queue).to.have.length(1);
            expect(loader.queue[0]).to.be.an.instanceOf(Resource);
        });
    });

    describe('#before', function () {
        it('should add a middleware that runs before loading a resource');
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
