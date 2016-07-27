(function () {
    window.spritesheetMiddleware = function spritesheetMiddleware() {
        return function (resource, next) {
            // skip if no data, its not json, or it isn't spritesheet data
            if (!resource.data || !resource.isJson || !resource.data.frames) {
                next();

                return;
            }

            var loadOptions = {
                crossOrigin: resource.crossOrigin,
                loadType: Resource.LOAD_TYPE.IMAGE
            };

            var route = dirname(resource.url.replace(this.baseUrl, ''));
            var name = resource.name + '_image';
            var url = route + '/' + resource.data.meta.image;

            // load the image for this sheet
            this.add(name, url, loadOptions, function (/* res */) { next(); });
        };
    };

    function dirname(path) {
        var result = posixSplitPath(path);
        var root = result[0];
        var dir = result[1];

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

    var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;

    function posixSplitPath(filename) {
        return splitPathRe.exec(filename).slice(1);
    }
})();
