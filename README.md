# Asset Loader [![Build Status](https://travis-ci.org/englercj/asset-loader.svg?branch=master)](https://travis-ci.org/englercj/asset-loader)

A generic asset loader, made with web games in mind.

## Usage

```js
// ctor
var loader = new Loader();

// chainable `add` to enqueue a resource
loader.add(url, options);

// chainable `before` to add a middleware that runs for each resource, *before* loading a resource.
// this is useful to implement custom caching modules (using filesystem, indexeddb, memory, etc).
loader.before(cachingMiddleware);

// chainable `after` to add a middleware that runs for each resource, *after* loading a resource.
// this is useful to implement custom parsing modules (like spritesheet parsers, spine parser, etc).
loader.after(parsingMiddleware);


// `load` method loads the queue of resources, and calls the passed in callback called once all
// resources have loaded.
loader.load(function (resources) {
    // resources is an array of resource objects that have a couple properties:
    // - `url`: The URL that the resource was loaded from
    // - `error`: The error that happened when trying to load (if any)
    // - `data`: The raw data that was loaded
    // also may contain other properties based on the middleware that runs.
});

// throughout the process multiple events can happen.
loader.on('progress', ...); // called once per loaded/errored file
loader.on('error', ...); // called once per errored file
loader.on('load', ...); // called once per loaded file
loader.on('complete', ...); // called once when the queued resources all load.
```

## Building

You will need to have [node][node] and [gulp][gulp] setup on your machine.

Then you can install dependencies and build:

```js
npm i && npm run build
```

That will output the built distributables to `./dist`.

[node]:       http://nodejs.org/
[gulp]:       http://gulpjs.com/

## Supported Browsers

- IE 10+
- FF 13+
- Chrome 20+
- Safari 6+
- Opera 12.1+

## To Do:

- IE 9 support
