'use strict';

describe('Loader', () => {
    let loader = null;

    beforeEach(() => {
        loader = new Loader(fixtureData.baseUrl);
    });

    it('should have correct properties', () => {
        expect(loader).to.have.property('baseUrl', fixtureData.baseUrl);
        expect(loader).to.have.property('progress', 0);
    });

    it('should have correct public methods', () => {
        expect(loader).to.have.property('add').instanceOf(Function);
        expect(loader).to.have.property('pre').instanceOf(Function);
        expect(loader).to.have.property('use').instanceOf(Function);
        expect(loader).to.have.property('reset').instanceOf(Function);
        expect(loader).to.have.property('load').instanceOf(Function);
    });

    describe('#add', () => {
        const name = 'test-resource';
        const options = {
            crossOrigin: true,
            loadType: Loader.Resource.LOAD_TYPE.IMAGE,
            xhrType: Loader.Resource.XHR_RESPONSE_TYPE.DOCUMENT,
        };

        function callback() { /* empty */ }

        it('creates a resource using all arguments', () => {
            loader.add(name, fixtureData.url, options, callback);

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', fixtureData.url);
            expect(res).to.have.property('crossOrigin', options.crossOrigin ? 'anonymous' : null);
            expect(res).to.have.property('loadType', options.loadType);
            expect(res).to.have.property('xhrType', options.xhrType);

            expect(res.onAfterMiddleware.handlers())
                .to.not.be.empty
                .and.to.equal([callback]);
        });

        it('creates a resource with just name, url, and options', () => {
            loader.add(name, fixtureData.url, options);

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', fixtureData.url);
            expect(res).to.have.property('crossOrigin', options.crossOrigin ? 'anonymous' : null);
            expect(res).to.have.property('loadType', options.loadType);
            expect(res).to.have.property('xhrType', options.xhrType);
        });

        it('creates a resource with just name, url, and a callback', () => {
            loader.add(name, fixtureData.url, callback);

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', fixtureData.url);

            expect(res.onAfterMiddleware.handlers())
                .to.not.be.empty
                .and.to.equal([callback]);
        });

        it('creates a resource with just name and url', () => {
            loader.add(name, fixtureData.url);

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', fixtureData.url);
        });

        it('creates a resource with just url, options, and a callback', () => {
            loader.add(fixtureData.url, options, callback);

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', fixtureData.url);
            expect(res).to.have.property('url', fixtureData.url);
            expect(res).to.have.property('crossOrigin', options.crossOrigin ? 'anonymous' : null);
            expect(res).to.have.property('loadType', options.loadType);
            expect(res).to.have.property('xhrType', options.xhrType);

            expect(res.onAfterMiddleware.handlers())
                .to.not.be.empty
                .and.to.equal([callback]);
        });

        it('creates a resource with just url and options', () => {
            loader.add(fixtureData.url, options);

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', fixtureData.url);
            expect(res).to.have.property('url', fixtureData.url);
            expect(res).to.have.property('crossOrigin', options.crossOrigin ? 'anonymous' : null);
            expect(res).to.have.property('loadType', options.loadType);
            expect(res).to.have.property('xhrType', options.xhrType);
        });

        it('creates a resource with just url and a callback', () => {
            loader.add(fixtureData.url, callback);

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', fixtureData.url);
            expect(res).to.have.property('url', fixtureData.url);

            expect(res.onAfterMiddleware.handlers())
                .to.not.be.empty
                .and.to.equal([callback]);
        });

        it('creates a resource with just url', () => {
            loader.add(fixtureData.url);

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', fixtureData.url);
            expect(res).to.have.property('url', fixtureData.url);
        });

        it('creates a resource with just an object (name/url keys) and callback param', () => {
            loader.add({ name, url: fixtureData.url }, callback);

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', fixtureData.url);

            expect(res.onAfterMiddleware.handlers())
                .to.not.be.empty
                .and.to.equal([callback]);
        });

        it('creates a resource with just an object (name/url/callback keys)', () => {
            loader.add({ name, url: fixtureData.url, onComplete: callback });

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', name);
            expect(res).to.have.property('url', fixtureData.url);

            expect(res.onAfterMiddleware.handlers())
                .to.not.be.empty
                .and.to.equal([callback]);
        });

        it('creates a resource with just an object (url/callback keys)', () => {
            loader.add({ url: fixtureData.url, onComplete: callback });

            expect(loader._queue.length()).to.equal(1);

            const res = loader._queue._tasks[0].data;

            expect(res).to.be.an.instanceOf(Resource);
            expect(res).to.have.property('name', fixtureData.url);
            expect(res).to.have.property('url', fixtureData.url);

            expect(res.onAfterMiddleware.handlers())
                .to.not.be.empty
                .and.to.equal([callback]);
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

    describe('#before', () => {
        it('should add a middleware that runs before loading a resource', () => {
            loader.pre(() => { /* empty */ });

            expect(loader._beforeMiddleware).to.have.length(1);
        });
    });

    describe('#after', () => {
        it('should add a middleware that runs after loading a resource', () => {
            loader.use(() => { /* empty */ });

            expect(loader._afterMiddleware).to.have.length(1);
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
                loader.add('hud2.json', spy).load(() => {
                    expect(spy).to.have.been.calledOnce;
                    done();
                });
            }, 0);
        });
    });

    describe('#load', () => {
        it('should run the `before` middleware, before loading a resource', (done) => {
            const spy = sinon.spy((res, next) => next());
            const spy2 = sinon.spy((res, next) => next());

            loader.pre(spy);
            loader.pre(spy2);

            loader.add(fixtureData.dataUrlGif);

            loader.load(() => {
                expect(spy).to.have.been.calledOnce;
                expect(spy2).to.have.been.calledOnce;
                done();
            });
        });

        it('should stop running the `before` middleware when one calls complete()', (done) => {
            const spy = sinon.spy((res, next) => {
                res.complete();
                next();
            });
            const spy2 = sinon.spy((res, next) => next());

            loader.pre(spy);
            loader.pre(spy2);

            loader.add(fixtureData.dataUrlGif);

            loader.load(() => {
                expect(spy).to.have.been.calledOnce;
                expect(spy2).to.have.not.been.called;
                done();
            });
        });

        it('should run the `after` middleware, after loading a resource', (done) => {
            const spy = sinon.spy((res, next) => next());
            const spy2 = sinon.spy((res, next) => next());

            loader.use(spy);
            loader.use(spy2);

            loader.add(fixtureData.dataUrlGif);

            loader.load(() => {
                expect(spy).to.have.been.calledOnce;
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

            expect(loader._prepareUrl(u1)).to.equal(u1);
            expect(loader._prepareUrl(u2)).to.equal(u2);
            expect(loader._prepareUrl(u3)).to.equal(u3);
            expect(loader._prepareUrl(u4)).to.equal(u4);
        });

        it('should add the baseUrl for relative urls (no trailing slash on baseUrl)', () => {
            const b = fixtureData.baseUrl;
            const u1 = 'image.png';
            const u2 = '/image.png';
            const u3 = 'image.png?v=1';
            const u4 = '/image.png?v=1#me';

            expect(loader._prepareUrl(u1)).to.equal(`${b}/${u1}`);
            expect(loader._prepareUrl(u2)).to.equal(`${b}${u2}`);
            expect(loader._prepareUrl(u3)).to.equal(`${b}/${u3}`);
            expect(loader._prepareUrl(u4)).to.equal(`${b}${u4}`);
        });

        it('should add the baseUrl for relative urls (yes trailing slash on baseUrl)', () => {
            const b = loader.baseUrl = '/base/';
            const u1 = 'image.png';
            const u2 = '/image.png';
            const u3 = 'image.png?v=1';
            const u4 = '/image.png?v=1#me';

            expect(loader._prepareUrl(u1)).to.equal(`${b}${u1}`);
            expect(loader._prepareUrl(u2)).to.equal(`${b}${u2}`);
            expect(loader._prepareUrl(u3)).to.equal(`${b}${u3}`);
            expect(loader._prepareUrl(u4)).to.equal(`${b}${u4}`);
        });

        it('should add the defaultQueryString when set', () => {
            const b = fixtureData.baseUrl;
            const u1 = 'image.png';
            const u2 = '/image.png';

            loader.defaultQueryString = 'u=me&p=secret';

            expect(loader._prepareUrl(u1))
                .to.equal(`${b}/${u1}?${loader.defaultQueryString}`);

            expect(loader._prepareUrl(u2))
                .to.equal(`${b}${u2}?${loader.defaultQueryString}`);
        });

        it('should add the defaultQueryString when if querystring already exists', () => {
            const b = fixtureData.baseUrl;
            const u1 = 'image.png?v=1';

            loader.defaultQueryString = 'u=me&p=secret';

            expect(loader._prepareUrl(u1))
                .to.equal(`${b}/${u1}&${loader.defaultQueryString}`);
        });

        it('should add the defaultQueryString when hash exists', () => {
            const b = fixtureData.baseUrl;

            loader.defaultQueryString = 'u=me&p=secret';

            expect(loader._prepareUrl('/image.png#me'))
                .to.equal(`${b}/image.png?${loader.defaultQueryString}#me`);
        });

        it('should add the defaultQueryString when querystring and hash exists', () => {
            const b = fixtureData.baseUrl;

            loader.defaultQueryString = 'u=me&p=secret';

            expect(loader._prepareUrl('/image.png?v=1#me'))
                .to.equal(`${b}/image.png?v=1&${loader.defaultQueryString}#me`);
        });
    });

    describe('#_loadResource', () => {
        it('should run the before middleware before loading the resource', () => {
            const spy = sinon.spy();
            const res = {};

            loader.pre(spy);

            loader._loadResource(res);

            expect(spy).to.have.been.calledOnce
                .and.calledOn(loader)
                .and.calledWith(res);
        });

        it('should load a resource passed into it', () => {
            const res = new Loader.Resource('mock', fixtureData.url);

            res.load = sinon.spy();

            loader._loadResource(res);

            expect(res.load).to.have.been.calledOnce;
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
            const res = new Loader.Resource('mock', fixtureData.url);
            const spy = sinon.spy();

            res._dequeue = sinon.spy();

            loader.onProgress.once(spy);

            loader._onLoad(res);

            expect(spy).to.have.been.calledOnce;
        });

        it('should emit the `error` event when the resource has an error', () => {
            const res = new Loader.Resource('mock', fixtureData.url);
            const spy = sinon.spy();

            res._dequeue = sinon.spy();

            res.error = new Error('mock error');

            loader.onError.once(spy);

            loader._onLoad(res);

            expect(spy).to.have.been.calledOnce;
        });

        it('should emit the `load` event when the resource loads successfully', () => {
            const res = new Loader.Resource('mock', fixtureData.url);
            const spy = sinon.spy();

            res._dequeue = sinon.spy();

            loader.onLoad.once(spy);

            loader._onLoad(res);

            expect(spy).to.have.been.calledOnce;
        });

        it('should run the after middleware', () => {
            const spy = sinon.spy();
            const res = {};

            res._dequeue = sinon.spy();

            loader.use(spy);

            loader._onLoad(res);

            expect(spy).to.have.been.calledOnce
                .and.calledOn(loader)
                .and.calledWith(res);
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
                loader.add([
                    { name: 'hud', url: 'hud.png' },
                    { name: 'hud2', url: 'hud2.png' },
                ]);

                loader.onProgress.add((loader) => {
                    expect(loader.progress).to.at.least(0).and.at.most(100);
                });

                loader.load(() => {
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

                loader.onProgress.add((loader) => {
                    expect(loader.progress).to.at.least(0).and.at.most(100);
                });

                loader.load(() => {
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

                loader.onProgress.add((loader) => {
                    expect(loader.progress).to.at.least(0).and.at.most(100);
                });

                loader.load(() => {
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
