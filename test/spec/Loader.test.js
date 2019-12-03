'use strict';

describe('Loader', () => {
    let loader = null;

    beforeEach(() => {
        loader = new Loader(fixtureData.baseUrl);
    });

    describe('.use', () => {
        it('should add a middleware that runs after loading a resource', () => {
            Loader.use(() => { /* empty */ });

            expect(Loader._defaultMiddleware).to.have.length(1);

            loader = new Loader(fixtureData.baseUrl);

            expect(loader._middleware).to.have.length(1);
        });

        after(() => {
            Loader._defaultMiddleware.length = 0;
        });
    });

    it('should have exported correctly', () => {
        expect(Loader).to.have.property('DefaultMiddlewarePriority', 50);

        expect(Loader).to.have.property('AbstractLoadStrategy');
        expect(Loader).to.have.property('AudioLoadStrategy');
        expect(Loader).to.have.property('ImageLoadStrategy');
        expect(Loader).to.have.property('MediaElementLoadStrategy');
        expect(Loader).to.have.property('VideoLoadStrategy');
        expect(Loader).to.have.property('XhrLoadStrategy');
        expect(Loader).to.have.property('Resource');
        expect(Loader).to.have.property('ResourceType');
        expect(Loader).to.have.property('ResourceState');
        expect(Loader).to.have.property('async');

        expect(Loader).to.have.property('use');
    });

    it('should have correct properties', () => {
        expect(loader).to.have.property('baseUrl', fixtureData.baseUrl);
        expect(loader).to.have.property('progress', 0);
        expect(loader).to.have.property('concurrency', 10);
        expect(loader).to.have.property('loading', false);
        expect(loader).to.have.property('defaultQueryString', '');
        expect(loader).to.have.property('resources');

        expect(loader).to.have.property('onError');
        expect(loader).to.have.property('onLoad');
        expect(loader).to.have.property('onStart');
        expect(loader).to.have.property('onComplete');
        expect(loader).to.have.property('onProgress');
    });

    it('should have correct public methods', () => {
        expect(loader).to.have.property('add').instanceOf(Function);
        expect(loader).to.have.property('use').instanceOf(Function);
        expect(loader).to.have.property('reset').instanceOf(Function);
        expect(loader).to.have.property('load').instanceOf(Function);
    });

    describe('#baseUrl', () => {
        it('trims trailing slashes', () => {
            loader.baseUrl = '/a/b/';
            expect(loader.baseUrl).to.equal('/a/b');

            loader.baseUrl = '/c/d';
            expect(loader.baseUrl).to.equal('/c/d');
        });
    });

    describe('#addUrlResolver', () => {
        it('calls addUrlResolver', () => {
            const spy = sinon.spy();

            loader.addUrlResolver(() => { spy(); return ''; });
            loader._prepareUrl('', '');

            expect(spy).to.have.been.calledOnce;
        });

        it('uses the result of addUrlResolver', () => {
            loader.addUrlResolver((s) => s.replace('{token}', 'test'));

            const s = loader._prepareUrl('/{token}/', '/some/base/url');

            expect(s).to.equal('/some/base/url/test/');
        });

        it('calls multiple urlResolver, in order', () => {
            const spy1 = sinon.spy(s => s + '/foo');
            const spy2 = sinon.spy(s => s + '/bar');

            loader.addUrlResolver(spy1)
                .addUrlResolver(spy2);

            const s = loader._prepareUrl('init', '');

            expect(spy1).to.have.been.calledOnce;
            expect(spy2).to.have.been.calledOnce;
            expect(s).to.equal('init/foo/bar');
        });

        it('supports multiple functions as urlResolver', () => {
            loader.addUrlResolver((s) => s.replace('{token}', 'foo'))
                .addUrlResolver((s) => s.replace('{token2}', 'bar'));

            const s = loader._prepareUrl('/{token}/{token2}/', '/some/base/url');

            expect(s).to.equal('/some/base/url/foo/bar/');
        });
    });

    describe('#add', () => {
        const name = 'test-resource';
        const options = {
            crossOrigin: 'anonymous',
        };

        function callback() { /* empty */ }

        function checkResource(res, checks = {})
        {
            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', checks.name || checks.url || name);
            expect(res).to.have.property('url', checks.url || fixtureData.url);
            expect(res).to.have.property('_strategy').that.is.an.instanceOf(checks.strategy || Loader.XhrLoadStrategy);

            const co = typeof checks.crossOrigin === 'string'
                ? checks.crossOrigin
                : options.crossOrigin;

            expect(res._strategy.config).to.have.property('crossOrigin', co);
        }

        it('creates a resource using overload: (url)', () => {
            loader.add(fixtureData.url);

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            checkResource(res, { name: fixtureData.url });

            expect(res.onAfterMiddleware.handlers())
                .to.be.empty;
        });

        it('creates a resource using overload (name, url)', () => {
            loader.add(name, fixtureData.url);

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            checkResource(res);

            expect(res.onAfterMiddleware.handlers())
                .to.be.empty;
        });

        it('creates a resource using overload ({ url})', () => {
            loader.add({ url: fixtureData.url });

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            checkResource(res, { name: fixtureData.url });

            expect(res.onAfterMiddleware.handlers())
                .to.be.empty;
        });

        it('creates a resource using overload ({ name, url })', () => {
            loader.add({ name, url: fixtureData.url });

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            checkResource(res);

            expect(res.onAfterMiddleware.handlers())
                .to.be.empty;
        });

        it('creates a resource using overload ({ name, url, onComplete })', () => {
            loader.add({ name, url: fixtureData.url, onComplete: callback });

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            checkResource(res);

            expect(res.onAfterMiddleware.handlers())
                .to.not.be.empty
                .and.to.equal([callback]);
        });

        it('creates a resource using overload ({ url, onComplete })', () => {
            loader.add({ url: fixtureData.url, onComplete: callback });

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            checkResource(res, { name: fixtureData.url });

            expect(res.onAfterMiddleware.handlers())
                .to.not.be.empty
                .and.to.equal([callback]);
        });

        it('creates two resources using overload ([url1, url2])', () => {
            loader.add([fixtureData.url, fixtureData.dataUrlGif]);

            expect(loader._queue.length()).to.equal(2);

            const res0 = loader._queue._tasks[0].data;
            checkResource(res0, { url: fixtureData.url });

            expect(res0.onAfterMiddleware.handlers())
                .to.be.empty;

            const res1 = loader._queue._tasks[1].data;
            checkResource(res1, {
                url: fixtureData.dataUrlGif,
                strategy: Loader.ImageLoadStrategy,
                crossOrigin: '',
            });

            expect(res1.onAfterMiddleware.handlers())
                .to.be.empty;
        });

        it('throws an error if url isn\'t passed', () => {
            expect(loader.add).to.throw(Error);
            expect(() => loader.add(options)).to.throw(Error);
            expect(() => loader.add(callback)).to.throw(Error);
            expect(() => loader.add(options, callback)).to.throw(Error);
        });

        it('throws an error if we are already loading and you have no parent resource', () => {
            loader.add(fixtureData.url);

            loader.load();

            expect(() => loader.add(fixtureData.dataUrlGif)).to.throw(Error);
        });
    });

    describe('#use', () => {
        it('should add a middleware that runs after loading a resource', () => {
            loader.use(() => { /* empty */ });

            expect(loader._middleware).to.have.length(1);
        });
    });

    describe('#reset', () => {
        it('should reset the loading state of the loader', () => {
            loader.loading = true;
            expect(loader.loading).to.equal(true);

            loader.reset();
            expect(loader.loading).to.equal(false);
        });

        it('should reset the progress of the loader', () => {
            loader.progress = 100;
            expect(loader.progress).to.equal(100);

            loader.reset();
            expect(loader.progress).to.equal(0);
        });

        it('should reset the queue/buffer of the loader', () => {
            loader._queue.push('me');
            expect(loader._queue.length()).to.equal(1);
            expect(loader._queue.started).to.equal(true);

            loader.reset();
            expect(loader._queue.length()).to.equal(0);
            expect(loader._queue.started).to.equal(false);
        });

        it('should reset the resources of the loader', () => {
            loader.add(fixtureData.url);
            expect(loader.resources).to.not.be.empty;

            loader.reset();
            expect(loader.resources).to.be.empty;
        });

        it('with unloaded items continues to work', (done) => {
            const loader = new Loader(fixtureData.baseUrl, 2);

            loader.add(['hud.png', 'hud2.png', 'hud.json']).load();

            setTimeout(() => {
                const spy = sinon.spy();

                loader.reset();
                loader.add({ url: 'hud2.json', onComplete: spy }).load(() => {
                    expect(spy).to.have.been.calledOnce;
                    done();
                });
            }, 0);
        });
    });

    describe('#load', () => {
        it('should call start/complete when add was not called', (done) => {
            const spy = sinon.spy();
            const spy2 = sinon.spy();

            loader.onStart.add(spy);
            loader.onComplete.add(spy2);

            loader.load(() => {
                expect(spy).to.have.been.calledOnce;
                expect(spy2).to.have.been.calledOnce;
                done();
            });
        });

        it('should call start/complete when given an empty set of resources', (done) => {
            const spy = sinon.spy();
            const spy2 = sinon.spy();

            loader.onStart.add(spy);
            loader.onComplete.add(spy2);

            loader.add([]).load(() => {
                expect(spy).to.have.been.calledOnce;
                expect(spy2).to.have.been.calledOnce;
                done();
            });
        });

        it('should run middleware, after loading a resource', (done) => {
            const callOrder = [];
            const spy1 = sinon.spy((res, next) => { callOrder.push(1); next(); });
            const spy2 = sinon.spy((res, next) => { callOrder.push(2); next(); });

            loader.use(spy1);
            loader.use(spy2);

            loader.add(fixtureData.dataUrlGif);

            loader.load(() => {
                expect(callOrder).to.eql([1, 2]);
                expect(spy1).to.have.been.calledOnce;
                expect(spy2).to.have.been.calledOnce;
                done();
            });
        });

        it('should run middleware in priority order, after loading a resource', (done) => {
            const callOrder = [];
            const spy1 = sinon.spy((res, next) => { callOrder.push(1); next(); });
            const spy2 = sinon.spy((res, next) => { callOrder.push(2); next(); });

            loader.use(spy1);
            loader.use(spy2, 40);

            loader.add(fixtureData.dataUrlGif);

            loader.load(() => {
                expect(callOrder).to.eql([2, 1]);
                expect(spy1).to.have.been.calledOnce;
                expect(spy2).to.have.been.calledOnce;
                done();
            });
        });

        it('should properly load the resource', (done) => {
            const spy = sinon.spy((loader, resources) => {
                expect(spy).to.have.been.calledOnce;
                expect(loader.progress).to.equal(100);
                expect(loader.loading).to.equal(false);
                expect(loader.resources).to.equal(resources);

                expect(resources).to.not.be.empty;
                expect(resources.res).to.be.ok;
                expect(resources.res.isComplete).to.be.true;

                done();
            });

            loader.add('res', fixtureData.dataUrlGif);

            loader.load(spy);
        });
    });

    describe('#_prepareUrl', () => {
        it('should return the url as-is for absolute urls', () => {
            const u1 = 'http://domain.com/image.png';
            const u2 = 'https://domain.com';
            const u3 = '//myshare/image.png';
            const u4 = '//myshare/image.png?v=1#me';

            expect(loader._prepareUrl(u1, loader.baseUrl)).to.equal(u1);
            expect(loader._prepareUrl(u2, loader.baseUrl)).to.equal(u2);
            expect(loader._prepareUrl(u3, loader.baseUrl)).to.equal(u3);
            expect(loader._prepareUrl(u4, loader.baseUrl)).to.equal(u4);
        });

        it('should add the baseUrl for relative urls', () => {
            const b = fixtureData.baseUrl;
            const u1 = 'image.png';
            const u2 = '/image.png';
            const u3 = 'image.png?v=1';
            const u4 = '/image.png?v=1#me';

            expect(loader._prepareUrl(u1, loader.baseUrl)).to.equal(`${b}/${u1}`);
            expect(loader._prepareUrl(u2, loader.baseUrl)).to.equal(`${b}${u2}`);
            expect(loader._prepareUrl(u3, loader.baseUrl)).to.equal(`${b}/${u3}`);
            expect(loader._prepareUrl(u4, loader.baseUrl)).to.equal(`${b}${u4}`);
        });

        it('should add the queryString when set', () => {
            const b = fixtureData.baseUrl;
            const u1 = 'image.png';
            const u2 = '/image.png';

            loader.defaultQueryString = 'u=me&p=secret';

            expect(loader._prepareUrl(u1, loader.baseUrl))
                .to.equal(`${b}/${u1}?${loader.defaultQueryString}`);

            expect(loader._prepareUrl(u2, loader.baseUrl))
                .to.equal(`${b}${u2}?${loader.defaultQueryString}`);
        });

        it('should add the defaultQueryString when set', () => {
            const b = fixtureData.baseUrl;
            const u1 = 'image.png';
            const u2 = '/image.png';

            loader.defaultQueryString = 'u=me&p=secret';

            expect(loader._prepareUrl(u1, loader.baseUrl))
                .to.equal(`${b}/${u1}?${loader.defaultQueryString}`);

            expect(loader._prepareUrl(u2, loader.baseUrl))
                .to.equal(`${b}${u2}?${loader.defaultQueryString}`);
        });

        it('should add the defaultQueryString when if querystring already exists', () => {
            const b = fixtureData.baseUrl;
            const u1 = 'image.png?v=1';

            loader.defaultQueryString = 'u=me&p=secret';

            expect(loader._prepareUrl(u1, loader.baseUrl))
                .to.equal(`${b}/${u1}&${loader.defaultQueryString}`);
        });

        it('should add the defaultQueryString when hash exists', () => {
            const b = fixtureData.baseUrl;

            loader.defaultQueryString = 'u=me&p=secret';

            expect(loader._prepareUrl('/image.png#me', loader.baseUrl))
                .to.equal(`${b}/image.png?${loader.defaultQueryString}#me`);
        });

        it('should add the defaultQueryString when querystring and hash exists', () => {
            const b = fixtureData.baseUrl;

            loader.defaultQueryString = 'u=me&p=secret';

            expect(loader._prepareUrl('/image.png?v=1#me', loader.baseUrl))
                .to.equal(`${b}/image.png?v=1&${loader.defaultQueryString}#me`);
        });
    });

    describe('#_loadResource', () => {
        it('should load a resource passed into it', () => {
            const res = new Loader.Resource('mock', { url: fixtureData.url });

            res.load = sinon.spy();

            loader._loadResource(res);

            expect(res.load).to.have.been.calledOnce;
        });
    });

    describe('#_onStart', () => {
        it('should emit the `start` event', (done) => {
            loader.onStart.add((_l) => {
                expect(_l).to.equal(loader);

                done();
            });

            loader._onStart();
        });
    });

    describe('#_onComplete', () => {
        it('should emit the `complete` event', (done) => {
            loader.onComplete.add((_l, resources) => {
                expect(_l).to.equal(loader);
                expect(resources).to.equal(loader.resources);

                done();
            });

            loader._onComplete();
        });
    });

    describe('#_onLoad', () => {
        it('should emit the `progress` event', () => {
            const res = new Loader.Resource('mock', { url: fixtureData.url });
            const spy = sinon.spy();

            res._dequeue = sinon.spy();

            loader.onProgress.once(spy);

            loader._onLoad(res);

            expect(spy).to.have.been.calledOnce;
        });

        it('should emit the `error` event when the resource has an error', () => {
            const res = new Loader.Resource('mock', { url: fixtureData.url });
            const spy = sinon.spy();

            res._dequeue = sinon.spy();

            res.error = new Error('mock error');

            loader.onError.once(spy);

            loader._onLoad(res);

            expect(spy).to.have.been.calledOnce;
        });

        it('should emit the `load` event when the resource loads successfully', () => {
            const res = new Loader.Resource('mock', { url: fixtureData.url });
            const spy = sinon.spy();

            res._dequeue = sinon.spy();

            loader.onLoad.once(spy);

            loader._onLoad(res);

            expect(spy).to.have.been.calledOnce;
        });

        it('should run middleware', (done) => {
            const spy = sinon.spy();
            const res = {};

            res._dequeue = sinon.spy();

            loader.use(spy);

            loader._onLoad(res);

            setTimeout(() => {
                expect(spy).to.have.been.calledOnce
                    .and.calledOn(loader)
                    .and.calledWith(res);

                done();
            }, 16);
        });
    });

    describe('events', () => {
        describe('with no additional subresources', () => {
            it('should call progress for each loaded asset', (done) => {
                loader.add([
                    { name: 'hud', url: 'hud.png' },
                    { name: 'hud2', url: 'hud2.png' },
                ]);

                const spy = sinon.spy();

                loader.onProgress.add(spy);

                loader.load(() => {
                    expect(spy).to.have.been.calledTwice;
                    done();
                });
            });

            it('should call progress for each loaded asset, even with low concurrency', (done) => {
                const loader = new Loader(fixtureData.baseUrl, 1);

                loader.add([
                    { name: 'hud', url: 'hud.png' },
                    { name: 'hud2', url: 'hud2.png' },
                ]);

                const spy = sinon.spy();

                loader.onProgress.add(spy);

                loader.load(() => {
                    expect(spy).to.have.been.calledTwice;
                    done();
                });
            });

            it('should never have an invalid progress value', (done) => {
                const total = 7;
                let i = 0;

                for (; i < total; i++) {
                    loader.add([
                        { name: `hud_${i}`, url: 'hud.png' },
                    ]);
                }
                i = 0;
                loader.onProgress.add((loader) => {
                    i++;
                    expect(loader.progress).to.be.above(0);
                    if (i === total) {
                        expect(loader.progress).to.be.at.most(100);
                    }
                    else {
                        expect(loader.progress).to.be.below(100);
                    }
                });

                loader.load(() => {
                    expect(loader).to.have.property('progress', 100);
                    done();
                });
            });

            it('progress should be 100% on complete', (done) => {
                loader.add([
                    { name: 'hud', url: 'hud.png' },
                    { name: 'hud2', url: 'hud2.png' },
                ]);

                loader.load(() => {
                    expect(loader).to.have.property('progress', 100);
                    done();
                });
            });
        });

        describe('with one additional subresource', () => {
            it('should call progress for each loaded asset', (done) => {
                loader.add([
                    { name: 'hud2', url: 'hud2.png' },
                    { name: 'hud_atlas', url: 'hud.json' },
                ]);

                loader.use(spritesheetMiddleware());

                const spy = sinon.spy();

                loader.onProgress.add(spy);

                loader.load(() => {
                    expect(spy).to.have.been.calledThrice;
                    done();
                });
            });

            it('should call progress for each loaded asset, even with low concurrency', (done) => {
                const loader = new Loader(fixtureData.baseUrl, 1);

                loader.add([
                    { name: 'hud2', url: 'hud2.png' },
                    { name: 'hud_atlas', url: 'hud.json' },
                ]);

                loader.use(spritesheetMiddleware());

                const spy = sinon.spy();

                loader.onProgress.add(spy);

                loader.load(() => {
                    expect(spy).to.have.been.calledThrice;
                    done();
                });
            });

            it('should never have an invalid progress value', (done) => {
                loader.add([
                    { name: 'hud2', url: 'hud2.png' },
                    { name: 'hud_atlas', url: 'hud.json' },
                ]);

                loader.use(spritesheetMiddleware());

                const expectedProgressValues = [50, 75, 100];
                let i = 0;

                loader.onProgress.add((loader) => {
                    expect(loader).to.have.property('progress', expectedProgressValues[i++]);
                });

                loader.load(() => {
                    expect(loader).to.have.property('progress', 100);
                    done();
                });
            });

            it('progress should be 100% on complete', (done) => {
                loader.add([
                    { name: 'hud2', url: 'hud2.png' },
                    { name: 'hud_atlas', url: 'hud.json' },
                ]);

                loader.use(spritesheetMiddleware());

                loader.load(() => {
                    expect(loader).to.have.property('progress', 100);
                    done();
                });
            });
        });

        describe('with multiple additional subresources', () => {
            it('should call progress for each loaded asset', (done) => {
                loader.add([
                    { name: 'hud2', url: 'hud2.json' },
                    { name: 'hud_atlas', url: 'hud.json' },
                ]);

                loader.use(spritesheetMiddleware());

                const spy = sinon.spy();

                loader.onProgress.add(spy);

                loader.load(() => {
                    expect(spy).to.have.callCount(4);
                    done();
                });
            });

            it('should never have an invalid progress value', (done) => {
                loader.add([
                    { name: 'hud2', url: 'hud2.json' },
                    { name: 'hud_atlas', url: 'hud.json' },
                ]);

                loader.use(spritesheetMiddleware());

                const expectedProgressValues = [25, 50, 75, 100];
                let i = 0;

                loader.onProgress.add((loader) => {
                    expect(loader).to.have.property('progress', expectedProgressValues[i++]);
                });

                loader.load(() => {
                    expect(loader).to.have.property('progress', 100);
                    done();
                });
            });

            it('progress should be 100% on complete', (done) => {
                loader.add([
                    { name: 'hud2', url: 'hud2.json' },
                    { name: 'hud_atlas', url: 'hud.json' },
                ]);

                loader.use(spritesheetMiddleware());

                loader.load(() => {
                    expect(loader).to.have.property('progress', 100);
                    done();
                });
            });
        });
    });
});
