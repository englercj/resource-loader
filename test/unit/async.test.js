describe('async', function () {
    describe('queue', function () {
        it('basics', function (done) {
            var callOrder = [];
            var delays = [40, 20, 60, 20];

            // worker1: --1-4
            // worker2: -2---3
            // order of completion: 2,1,4,3

            var q = async.queue(function (task, callback) {
                setTimeout(function () {
                    callOrder.push('process ' + task);
                    callback('error', 'arg');
                }, delays.shift());
            }, 2);

            q.push(1, function (err, arg) {
                expect(err).to.equal('error');
                expect(arg).to.equal('arg');
                expect(q.length()).to.equal(1);
                callOrder.push('callback ' + 1);
            });
            q.push(2, function (err, arg) {
                expect(err).to.equal('error');
                expect(arg).to.equal('arg');
                expect(q.length()).to.equal(2);
                callOrder.push('callback ' + 2);
            });
            q.push(3, function (err, arg) {
                expect(err).to.equal('error');
                expect(arg).to.equal('arg');
                expect(q.length()).to.equal(0);
                callOrder.push('callback ' + 3);
            });
            q.push(4, function (err, arg) {
                expect(err).to.equal('error');
                expect(arg).to.equal('arg');
                expect(q.length()).to.equal(0);
                callOrder.push('callback ' + 4);
            });
            expect(q.length()).to.equal(4);
            expect(q.concurrency).to.equal(2);

            q.drain = function () {
                expect(callOrder).to.eql([
                    'process 2', 'callback 2',
                    'process 1', 'callback 1',
                    'process 4', 'callback 4',
                    'process 3', 'callback 3'
                ]);
                expect(q.concurrency).to.equal(2);
                expect(q.length()).to.equal(0);
                done();
            };
        });

        it('default concurrency', function (done) {
            var callOrder = [];
            var delays = [40, 20, 60, 20];

            // order of completion: 1,2,3,4

            var q = async.queue(function (task, callback) {
                setTimeout(function () {
                    callOrder.push('process ' + task);
                    callback('error', 'arg');
                }, delays.shift());
            });

            q.push(1, function (err, arg) {
                expect(err).to.equal('error');
                expect(arg).to.equal('arg');
                expect(q.length()).to.equal(3);
                callOrder.push('callback ' + 1);
            });
            q.push(2, function (err, arg) {
                expect(err).to.equal('error');
                expect(arg).to.equal('arg');
                expect(q.length()).to.equal(2);
                callOrder.push('callback ' + 2);
            });
            q.push(3, function (err, arg) {
                expect(err).to.equal('error');
                expect(arg).to.equal('arg');
                expect(q.length()).to.equal(1);
                callOrder.push('callback ' + 3);
            });
            q.push(4, function (err, arg) {
                expect(err).to.equal('error');
                expect(arg).to.equal('arg');
                expect(q.length()).to.equal(0);
                callOrder.push('callback ' + 4);
            });
            expect(q.length()).to.equal(4);
            expect(q.concurrency).to.equal(1);

            q.drain = function () {
                expect(callOrder).to.eql([
                    'process 1', 'callback 1',
                    'process 2', 'callback 2',
                    'process 3', 'callback 3',
                    'process 4', 'callback 4'
                ]);
                expect(q.concurrency).to.equal(1);
                expect(q.length()).to.equal(0);
                done();
            };
        });

        it('zero concurrency', function (done) {
            expect(function () {
                async.queue(function (task, callback) {
                    callback(null, task);
                }, 0);
            }).to.throw();
            done();
        });

        it('error propagation', function (done) {
            var results = [];

            var q = async.queue(function (task, callback) {
                callback(task.name === 'foo' ? new Error('fooError') : null);
            }, 2);

            q.drain = function () {
                expect(results).to.eql(['bar', 'fooError']);
                done();
            };

            q.push({ name: 'bar' }, function (err) {
                if (err) {
                    results.push('barError');

                    return;
                }

                results.push('bar');
            });

            q.push({ name: 'foo' }, function (err) {
                if (err) {
                    results.push('fooError');

                    return;
                }

                results.push('foo');
            });
        });

        it('global error handler', function (done) {
            var results = [];

            var q = async.queue(function (task, callback) {
                callback(task.name === 'foo' ? new Error('fooError') : null);
            }, 2);

            q.error = function (error, task) {
                expect(error).to.exist;
                expect(error.message).to.equal('fooError');
                expect(task.name).to.equal('foo');
                results.push('fooError');
            };

            q.drain = function () {
                expect(results).to.eql(['fooError', 'bar']);
                done();
            };

            q.push({ name: 'foo' });

            q.push({ name: 'bar' }, function (error) {
                expect(error).to.not.exist;
                results.push('bar');
            });
        });

        // The original queue implementation allowed the concurrency to be changed only
        // on the same event loop during which a task was added to the queue. This
        // test attempts to be a more robust test.
        // Start with a concurrency of 1. Wait until a leter event loop and change
        // the concurrency to 2. Wait again for a later loop then verify the concurrency
        // Repeat that one more time by chaning the concurrency to 5.
        it('changing concurrency', function (done) {
            var q = async.queue(function (task, callback) {
                setTimeout(function () {
                    callback();
                }, 10);
            }, 1);

            for (var i = 0; i < 50; i++) {
                q.push('');
            }

            q.drain = function () {
                done();
            };

            setTimeout(function () {
                expect(q.concurrency).to.equal(1);
                q.concurrency = 2;
                setTimeout(function () {
                    expect(q.running()).to.equal(2);
                    q.concurrency = 5;
                    setTimeout(function () {
                        expect(q.running()).to.equal(5);
                    }, 40);
                }, 40);
            }, 40);
        });

        it('push without callback', function (done) {
            var callOrder = [];
            var delays = [40, 20, 60, 20];

            // worker1: --1-4
            // worker2: -2---3
            // order of completion: 2,1,4,3

            var q = async.queue(function (task, callback) {
                setTimeout(function () {
                    callOrder.push('process ' + task);
                    callback('error', 'arg');
                }, delays.shift());
            }, 2);

            q.push(1);
            q.push(2);
            q.push(3);
            q.push(4);

            q.drain = function () {
                expect(callOrder).to.eql([
                    'process 2',
                    'process 1',
                    'process 4',
                    'process 3'
                ]);
                done();
            };
        });

        it('push with non-function', function (done) {
            var q = async.queue(function () {}, 1);

            expect(function () {
                q.push({}, 1);
            }).to.throw();
            done();
        });

        it('unshift', function (done) {
            var queueOrder = [];

            var q = async.queue(function (task, callback) {
                queueOrder.push(task);
                callback();
            }, 1);

            q.unshift(4);
            q.unshift(3);
            q.unshift(2);
            q.unshift(1);

            setTimeout(function () {
                expect(queueOrder).to.eql([1, 2, 3, 4]);
                done();
            }, 100);
        });

        it('too many callbacks', function (done) {
            var q = async.queue(function (task, callback) {
                callback();
                expect(function () {
                    callback();
                }).to.throw();
                done();
            }, 2);

            q.push(1);
        });

        it('idle', function (done) {
            var q = async.queue(function (task, callback) {
                // Queue is busy when workers are running
                expect(q.idle()).to.equal(false);
                callback();
            }, 1);

            // Queue is idle before anything added
            expect(q.idle()).to.equal(true);

            q.unshift(4);
            q.unshift(3);
            q.unshift(2);
            q.unshift(1);

            // Queue is busy when tasks added
            expect(q.idle()).to.equal(false);

            q.drain = function () {
                // Queue is idle after drain
                expect(q.idle()).to.equal(true);
                done();
            };
        });

        it('pause', function (done) {
            var callOrder = [];
            var taskTimeout = 80;
            var pauseTimeout = taskTimeout * 2.5;
            var resumeTimeout = taskTimeout * 4.5;
            var tasks = [1, 2, 3, 4, 5, 6];

            var elapsed = (function () {
                var start = Date.now();

                return function () {
                    return Math.round((Date.now() - start) / taskTimeout) * taskTimeout;
                };
            })();

            var q = async.queue(function (task, callback) {
                callOrder.push('process ' + task);
                callOrder.push('timeout ' + elapsed());
                callback();
            });

            function pushTask() {
                var task = tasks.shift();

                if (!task) { return; }
                setTimeout(function () {
                    q.push(task);
                    pushTask();
                }, taskTimeout);
            }
            pushTask();

            setTimeout(function () {
                q.pause();
                expect(q.paused).to.equal(true);
            }, pauseTimeout);

            setTimeout(function () {
                q.resume();
                expect(q.paused).to.equal(false);
            }, resumeTimeout);

            setTimeout(function () {
                expect(callOrder).to.eql([
                    'process 1', 'timeout ' + taskTimeout,
                    'process 2', 'timeout ' + (taskTimeout * 2),
                    'process 3', 'timeout ' + (taskTimeout * 5),
                    'process 4', 'timeout ' + (taskTimeout * 5),
                    'process 5', 'timeout ' + (taskTimeout * 5),
                    'process 6', 'timeout ' + (taskTimeout * 6)
                ]);
                done();
            }, (taskTimeout * tasks.length) + pauseTimeout + resumeTimeout);
        });

        it('pause in worker with concurrency', function (done) {
            var callOrder = [];
            var q = async.queue(function (task, callback) {
                if (task.isLongRunning) {
                    q.pause();
                    setTimeout(function () {
                        callOrder.push(task.id);
                        q.resume();
                        callback();
                    }, 50);
                }
                else {
                    callOrder.push(task.id);
                    setTimeout(callback, 10);
                }
            }, 10);

            q.push({ id: 1, isLongRunning: true });
            q.push({ id: 2 });
            q.push({ id: 3 });
            q.push({ id: 4 });
            q.push({ id: 5 });

            q.drain = function () {
                expect(callOrder).to.eql([1, 2, 3, 4, 5]);
                done();
            };
        });

        it('pause with concurrency', function (done) {
            var callOrder = [];
            var taskTimeout = 40;
            var pauseTimeout = taskTimeout / 2;
            var resumeTimeout = taskTimeout * 2.75;
            var tasks = [1, 2, 3, 4, 5, 6];

            var elapsed = (function () {
                var start = Date.now();

                return function () {
                    return Math.round((Date.now() - start) / taskTimeout) * taskTimeout;
                };
            })();

            var q = async.queue(function (task, callback) {
                setTimeout(function () {
                    callOrder.push('process ' + task);
                    callOrder.push('timeout ' + elapsed());
                    callback();
                }, taskTimeout);
            }, 2);

            for (var i = 0; i < tasks.length; ++i) {
                q.push(tasks[i]);
            }

            setTimeout(function () {
                q.pause();
                expect(q.paused).to.equal(true);
            }, pauseTimeout);

            setTimeout(function () {
                q.resume();
                expect(q.paused).to.equal(false);
            }, resumeTimeout);

            setTimeout(function () {
                expect(q.running()).to.equal(2);
            }, resumeTimeout + 10);

            setTimeout(function () {
                expect(callOrder).to.eql([
                    'process 1', 'timeout ' + taskTimeout,
                    'process 2', 'timeout ' + taskTimeout,
                    'process 3', 'timeout ' + (taskTimeout * 4),
                    'process 4', 'timeout ' + (taskTimeout * 4),
                    'process 5', 'timeout ' + (taskTimeout * 5),
                    'process 6', 'timeout ' + (taskTimeout * 5)
                ]);
                done();
            }, (taskTimeout * tasks.length) + pauseTimeout + resumeTimeout);
        });

        it('start paused', function (done) {
            var q = async.queue(function (task, callback) {
                setTimeout(function () {
                    callback();
                }, 40);
            }, 2);

            q.pause();

            q.push(1);
            q.push(2);
            q.push(3);

            setTimeout(function () {
                q.resume();
            }, 5);

            setTimeout(function () {
                expect(q._tasks.length).to.equal(1);
                expect(q.running()).to.equal(2);
                q.resume();
            }, 15);

            q.drain = function () {
                done();
            };
        });

        it('kill', function (done) {
            var q = async.queue(function (/* task, callback */) {
                setTimeout(function () {
                    throw new Error('Function should never be called');
                }, 20);
            }, 1);

            q.drain = function () {
                throw new Error('Function should never be called');
            };

            q.push(0);

            q.kill();

            setTimeout(function () {
                expect(q.length()).to.equal(0);
                done();
            }, 40);
        });

        it('events', function (done) {
            var calls = [];
            var q = async.queue(function (task, cb) {
                // nop
                calls.push('process ' + task);
                setTimeout(cb, 10);
            }, 3);

            q.concurrency = 3;

            q.saturated = function () {
                expect(q.running()).to.equal(3, 'queue should be saturated now');
                calls.push('saturated');
            };
            q.empty = function () {
                expect(q.length()).to.equal(0, 'queue should be empty now');
                calls.push('empty');
            };
            q.drain = function () {
                expect(q.length() === 0 && q.running() === 0)
                    .to.equal(true, 'queue should be empty now and no more workers should be running');
                calls.push('drain');
                expect(calls).to.eql([
                    'process foo',
                    'process bar',
                    'saturated',
                    'process zoo',
                    'foo cb',
                    'saturated',
                    'process poo',
                    'bar cb',
                    'empty',
                    'saturated',
                    'process moo',
                    'zoo cb',
                    'poo cb',
                    'moo cb',
                    'drain'
                ]);
                done();
            };
            q.push('foo', function () { calls.push('foo cb'); });
            q.push('bar', function () { calls.push('bar cb'); });
            q.push('zoo', function () { calls.push('zoo cb'); });
            q.push('poo', function () { calls.push('poo cb'); });
            q.push('moo', function () { calls.push('moo cb'); });
        });

        it('empty', function (done) {
            var calls = [];
            var q = async.queue(function (task, cb) {
                // nop
                calls.push('process ' + task);
                setTimeout(cb, 1);
            }, 3);

            q.drain = function () {
                expect(q.length() === 0 && q.running() === 0)
                    .to.equal(true, 'queue should be empty now and no more workers should be running');
                calls.push('drain');
                expect(calls).to.eql([
                    'drain'
                ]);
                done();
            };
            q.push();
        });

        it('saturated', function (done) {
            var saturatedCalled = false;
            var q = async.queue(function (task, cb) {
                setTimeout(cb, 1);
            }, 2);

            q.saturated = function () {
                saturatedCalled = true;
            };
            q.drain = function () {
                expect(saturatedCalled).to.equal(true, 'saturated not called');
                done();
            };

            q.push('foo');
            q.push('bar');
            q.push('baz');
            q.push('moo');
        });

        it('started', function (done) {
            var q = async.queue(function (task, cb) {
                cb(null, task);
            });

            expect(q.started).to.equal(false);
            q.push();
            expect(q.started).to.equal(true);
            done();
        });

        context('q.saturated(): ', function () {
            it('should call the saturated callback if tasks length is concurrency', function (done) {
                var calls = [];
                var q = async.queue(function (task, cb) {
                    calls.push('process ' + task);
                    setTimeout(cb, 1);
                }, 4);

                q.saturated = function () {
                    calls.push('saturated');
                };
                q.empty = function () {
                    expect(calls.indexOf('saturated')).to.be.above(-1);
                    setTimeout(function () {
                        expect(calls).eql([
                            'process foo0',
                            'process foo1',
                            'process foo2',
                            'saturated',
                            'process foo3',
                            'foo0 cb',
                            'saturated',
                            'process foo4',
                            'foo1 cb',
                            'foo2 cb',
                            'foo3 cb',
                            'foo4 cb'
                        ]);
                        done();
                    }, 50);
                };
                q.push('foo0', function () { calls.push('foo0 cb'); });
                q.push('foo1', function () { calls.push('foo1 cb'); });
                q.push('foo2', function () { calls.push('foo2 cb'); });
                q.push('foo3', function () { calls.push('foo3 cb'); });
                q.push('foo4', function () { calls.push('foo4 cb'); });
            });
        });

        context('q.unsaturated(): ', function () {
            it('should have a default buffer property that equals 25% of the concurrenct rate', function (done) {
                var calls = [];
                var q = async.queue(function (task, cb) {
                    // nop
                    calls.push('process ' + task);
                    setTimeout(cb, 1);
                }, 10);

                expect(q.buffer).to.equal(2.5);
                done();
            });
            it('should allow a user to change the buffer property', function (done) {
                var calls = [];
                var q = async.queue(function (task, cb) {
                    // nop
                    calls.push('process ' + task);
                    setTimeout(cb, 1);
                }, 10);

                q.buffer = 4;
                expect(q.buffer).to.not.equal(2.5);
                expect(q.buffer).to.equal(4);
                done();
            });
            it('should call the unsaturated callback if tasks length is less than concurrency minus buffer', function (done) {
                var calls = [];
                var q = async.queue(function (task, cb) {
                    calls.push('process ' + task);
                    setTimeout(cb, 1);
                }, 4);

                q.unsaturated = function () {
                    calls.push('unsaturated');
                };
                q.empty = function () {
                    expect(calls.indexOf('unsaturated')).to.be.above(-1);
                    setTimeout(function () {
                        expect(calls).eql([
                            'process foo0',
                            'process foo1',
                            'process foo2',
                            'process foo3',
                            'foo0 cb',
                            'unsaturated',
                            'process foo4',
                            'foo1 cb',
                            'unsaturated',
                            'foo2 cb',
                            'unsaturated',
                            'foo3 cb',
                            'unsaturated',
                            'foo4 cb',
                            'unsaturated'
                        ]);
                        done();
                    }, 50);
                };
                q.push('foo0', function () { calls.push('foo0 cb'); });
                q.push('foo1', function () { calls.push('foo1 cb'); });
                q.push('foo2', function () { calls.push('foo2 cb'); });
                q.push('foo3', function () { calls.push('foo3 cb'); });
                q.push('foo4', function () { calls.push('foo4 cb'); });
            });
        });
    });

    describe('eachSeries', function () {
        function eachIteratee(args, x, callback) {
            setTimeout(function () {
                args.push(x);
                callback();
            }, x * 25);
        }

        function eachNoCallbackIteratee(done, x, callback) {
            expect(x).to.equal(1);
            callback();
            done();
        }

        it('eachSeries', function (done) {
            var args = [];

            async.eachSeries([1, 3, 2], eachIteratee.bind(this, args), function (err) {
                expect(err).to.equal(undefined, err + ' passed instead of \'null\'');
                expect(args).to.eql([1, 3, 2]);
                done();
            });
        });

        it('empty array', function (done) {
            async.eachSeries([], function (x, callback) {
                expect(false).to.equal(true, 'iteratee should not be called');
                callback();
            }, function (err) {
                if (err) {
                    throw err;
                }

                expect(true).to.equal(true, 'should call callback');
            });
            setTimeout(done, 25);
        });

        it('array modification', function (done) {
            var arr = [1, 2, 3, 4];

            async.eachSeries(arr, function (x, callback) {
                setTimeout(callback, 1);
            }, function () {
                expect(true).to.equal(true, 'should call callback');
            });

            arr.pop();
            arr.splice(0, 1);

            setTimeout(done, 50);
        });

        // bug #782.  Remove in next major release
        it('single item', function (done) {
            var sync = true;

            async.eachSeries([1], function (i, cb) {
                cb(null);
            }, function () {
                expect(sync).to.equal(true, 'callback not called on same tick');
            });
            sync = false;
            done();
        });

        // bug #782.  Remove in next major release
        it('single item', function (done) {
            var sync = true;

            async.eachSeries([1], function (i, cb) {
                cb(null);
            }, function () {
                expect(sync).to.equal(true, 'callback not called on same tick');
            });
            sync = false;
            done();
        });

        it('error', function (done) {
            var callOrder = [];

            async.eachSeries([1, 2, 3], function (x, callback) {
                callOrder.push(x);
                callback('error');
            }, function (err) {
                expect(callOrder).to.eql([1]);
                expect(err).to.equal('error');
            });
            setTimeout(done, 50);
        });

        it('no callback', function (done) {
            async.eachSeries([1], eachNoCallbackIteratee.bind(this, done));
        });
    });
});
