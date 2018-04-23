'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var fs = require('fs');
var crypto = require('crypto');
var UglifyJS = require('uglify-js');

function ServiceWorkerGenerator(options) {
    this.options = options;
}

var generateInstallHandler = function generateInstallHandler(cacheFirstCacheName, fetchOptions) {
    return 'function (event) {\n        event.waitUntil(caches.open("' + cacheFirstCacheName + '").then(function (cache) {\n            console.log("Opened cache");\n            return cache.addAll(urlsToCache.map(function (urlToPrefetch) {\n                return new Request(urlToPrefetch,' + JSON.stringify(fetchOptions) + ');\n            })).then(function () {\n                console.log(\'All resources have been fetched and cached.\');\n            });\n        }));\n    }';
};

var generateMessageHandler = function generateMessageHandler(networkFirstCacheName) {
    return 'function (event) {\n        if(event.data) {\n            if (event.data.type === "SKIP-WAITING") {\n                self.skipWaiting();\n                clients.matchAll().then(function (clientList) {\n                    clientList.forEach(function(client) {\n                        client.postMessage("RELOAD");            \n                    });\n                });\n            }\n            else if(event.data.type === "CLEAR-DATA") {\n                caches.delete("' + networkFirstCacheName + '")\n            }\n        }\n    }';
};

var generateActivationHandler = function generateActivationHandler(cacheFirstCacheName) {
    return 'function (event) {\n        event.waitUntil(\n            caches.keys()\n            .then(function (keys) {\n                Promise.all(\n                    keys.map(function (key) {\n                        if (key !== "' + cacheFirstCacheName + '") {\n                            return caches.delete(key);\n                        }\n                    })\n                )\n            })\n        );\n    }';
};

var generateStaticAssetsFetchHandler = function generateStaticAssetsFetchHandler(staticRouting) {
    return 'function (event) {\n        var request = event.request.url,\n        hashFragmentStart = request.indexOf(\'#\');\n        if (hashFragmentStart > -1) {\n            request = request.substr(0, hashFragmentStart);\n        }\n        if (' + staticRouting + ') {\n            event.respondWith(caches.match(event.request).then(function (response) {\n                if (response) {\n                    console.log(event.request.url);\n                    return response;\n                }\n                return fetch(event.request);\n            }));\n        }\n    }';
};

var generateDynamicRouting = function generateDynamicRouting(dynamicCacheName, dynamicRouting) {
    return 'function (event) {\n        var request = event.request.url,\n        hashFragmentStart = request.indexOf(\'#\');\n        if (hashFragmentStart > -1) {\n            request = request.substr(0, hashFragmentStart);\n        }\n        if (' + dynamicRouting + ') {\n            event.respondWith(\n                fetch(event.request)\n                .then(function (networkResponse) {\n                    if (event.request.method === "GET") {\n                        return caches.open("' + dynamicCacheName + '")\n                            .then(function (cache) {\n                                cache.add(event.request, networkResponse);\n                                return networkResponse;\n                            });\n                    }\n                    return networkResponse;\n                })\n                .catch(function () {\n                    return caches.match(event.request);\n                })\n            )\n        }\n    }';
};

function generateRouting(type) {
    var parts = [];
    var routes = this.options[type] ? this.options[type].routes : [];
    routes.forEach(function (route) {
        if (route.match === 'includes') {
            parts.push('request.includes("' + route.uri + '")');
        } else if (route.match === 'exact') {
            parts.push('request === "' + route.uri + '"');
        }
    });
    return parts.join(' || ');
}

function generateFileContent(options) {
    var networkFirstRoutes = generateRouting.bind(this)('networkFirst');
    var cacheFirstRoutes = generateRouting.bind(this)('cacheFirst');
    var fileContent = 'var urlsToCache = [' + options.staticAssets.map(function (asset) {
        if (asset !== '../../index.html') {
            return '"' + options.assetsPrefix + asset + '"';
        }
        return '"/"';
    }).join(',') + '];\n\n' + ('self.addEventListener("message", ' + generateMessageHandler(options.networkFirstCacheName) + ')\n\n') + ('self.addEventListener("install",' + generateInstallHandler(options.cacheFirstCacheName, options.fetchOptions) + ')\n\n') + ('self.addEventListener("activate", ' + generateActivationHandler(options.cacheFirstCacheName) + ')\n\n');

    /* add cacheFirstHandler if there are static assets to fetch */
    if (cacheFirstRoutes !== '') {
        fileContent = fileContent + '\n\nself.addEventListener("fetch", ' + generateStaticAssetsFetchHandler(cacheFirstRoutes) + ')';
    }

    /* add networkFirstHandler if there are dynamic routes to fetch */
    if (networkFirstRoutes !== '') {
        fileContent = fileContent + '\n\nself.addEventListener("fetch", ' + generateDynamicRouting(options.networkFirstCacheName, networkFirstRoutes) + ')';
    }

    return fileContent;
}

function generateServiceWorkerFile(options) {
    var data = generateFileContent.bind(this)(options);
    var result = '';
    if (options.uglify) {
        var uglifyOptions = _typeof(options.uglify) === 'object' ? options.uglify : {};
        result = UglifyJS.minify(data, uglifyOptions).code;
    } else {
        result = data;
    }

    fs.writeFile('../service-worker.js', result, function (err) {
        if (err) {
            throw err;
        }
    });
}

ServiceWorkerGenerator.prototype.apply = function apply(compiler) {
    var self = this;
    var options = self.options;

    var cacheFirstCacheName = options.cacheFirst.cacheName;
    var networkFirstCacheName = options.networkFirst.cacheName;
    var uglify = options.uglify,
        assetsPrefix = options.assetsPrefix,
        fetchOptions = options.fetchOptions;

    compiler.plugin('emit', function (compilation, callback) {
        var assets = Object.keys(compilation.assets);
        generateServiceWorkerFile.bind(self)({
            staticAssets: assets,
            cacheFirstCacheName: (cacheFirstCacheName || 'Assets') + '-' + crypto.createHash('sha256').update(assets.toString()).digest('base64'),
            networkFirstCacheName: networkFirstCacheName || 'Data',
            uglify: uglify,
            assetsPrefix: assetsPrefix,
            fetchOptions: fetchOptions
        });
        callback();
    });
};

module.exports = ServiceWorkerGenerator;