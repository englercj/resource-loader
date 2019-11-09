# Resource Loader [![Build Status](https://travis-ci.org/englercj/resource-loader.svg?branch=master)](https://travis-ci.org/englercj/resource-loader)

A generic resource loader, made with web games in mind.

## Philosophy

This library was built to make it easier to load and prepare data asynchronously. The
goal was mainly to unify the many different APIs browsers expose for loading data and
smooth the differences between versions and vendors.

It is not a goal of this library to be a resource caching and management system,
just a loader. This library is for the actual mechanism of loading data. All
caching, resource management, knowing what is loaded and what isn't, deciding
what to load, etc, should all exist as logic outside of this library.

As a more concrete statement, your project should have a Resource Manager that
stores resources and manages data lifetime. When it decides something needs to be
loaded from a remote source, only then does it create a loader and load them.

## Usage

```js
// ctor
import { Loader } from 'resource-loader';

const loader = new Loader();

loader
    // Chainable `add` to enqueue a resource
    .add(url)

    // Chainable `use` to add a middleware that runs for each resource, *after* loading that resource.
    // This is useful to implement custom parsing modules (like spritesheet parsers).
    .use((resource, next) =>
    {
        // Be sure to call next() when you have completed your middleware work.
        next();
    })

    // The `load` method loads the queue of resources, and calls the passed in callback called once all
    // resources have loaded.
    .load((loader, resources) => {
        // resources is an object where the key is the name of the resource loaded and the value is the resource object.
        // They have a couple default properties:
        // - `url`: The URL that the resource was loaded from
        // - `error`: The error that happened when trying to load (if any)
        // - `data`: The raw data that was loaded
        // also may contain other properties based on the middleware that runs.
    });

// Throughout the process multiple signals can be dispatched.
loader.onStart.add(() => {}); // Called when a resource starts loading.
loader.onError.add(() => {}); // Called when a resource fails to load.
loader.onLoad.add(() => {}); // Called when a resource successfully loads.
loader.onProgress.add(() => {}); // Called when a resource finishes loading (success or fail).
loader.onComplete.add(() => {}); // Called when all resources have finished loading.
```

## Building

You will need to have [node][node] setup on your machine.

Then you can install dependencies and build:

```js
npm i && npm run build
```

That will output the built distributables to `./dist`.

[node]: http://nodejs.org/

## Supported Browsers

- IE 9+
- FF 13+
- Chrome 20+
- Safari 6+
- Opera 12.1+

## Upgrading to v4

- Before middleware has been removed, so no more `pre` function.
    * If you used `pre` middleware for url parsing, use the new `urlResolver` property instead.
- `crossOrigin` must now be a string if specified.
- `Resource.LOAD_TYPE` enum replaced with Load Strategies.
    * For example, `loadType: Resource.LOAD_TYPE.IMAGE` is now `strategy: Loader.ImageLoadStrategy`.
- `Resource.XHR_RESPONSE_TYPE` enum replaced with `XhrLoadStrategy.ResponseType`.
    * For example, `xhrType: Resource.XHR_RESPONSE_TYPE.DOCUMENT` is now `xhrType: Loader.XhrLoadStrategy.ResponseType.Document`.
- Overloads for the `add` function have been simplified.
    * The removed overloads were not widely used. See the docs for what is now valid.
