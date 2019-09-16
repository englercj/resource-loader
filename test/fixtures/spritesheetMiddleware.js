'use strict';

(() => {
    window.spritesheetMiddleware = function spritesheetMiddlewareFactory() {
        return function spritesheetMiddleware(resource, next) {
            // skip if no data, its not json, or it isn't spritesheet data
            if (!resource.data || resource.type !== Loader.ResourceType.Json || !resource.data.frames) {
                next();

                return;
            }

            const route = dirname(resource.url.replace(this.baseUrl, ''));

            const loadOptions = {
                name: `${resource.name}_image`,
                url: `${route}/${resource.data.meta.image}`,
                crossOrigin: resource.crossOrigin,
                strategy: Loader.ImageLoadStrategy,
                parentResource: resource,
                onComplete: (/* res */) => next(),
            };

            // load the image for this sheet
            this.add(loadOptions);
        };
    };

    function dirname(path) {
        const result = posixSplitPath(path);
        const root = result[0];
        let dir = result[1];

        if (!root && !dir) {
            // No dirname whatsoever
            return '.';
        }

        if (dir) {
            // It has a dirname, strip trailing slash
            dir = dir.substr(0, dir.length - 1);
        }

        return root + dir;
    }

    const splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^/]+?|)(\.[^./]*|))(?:[/]*)$/;

    function posixSplitPath(filename) {
        return splitPathRe.exec(filename).slice(1);
    }
})();
