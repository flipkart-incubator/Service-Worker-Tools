'use strict';

var fs = require("fs"),
    crypto = require("crypto"),
    UglifyJS = require("uglify-js");

function ServiceWorkerGenerator(options) {
    this.options = options;
}

var installHandler = function (event) {
    event.waitUntil(caches.open(STATIC_ASSETS_CACHE_NAME).then(function (cache) {
        console.log("Opened cache");
        return cache.addAll(urlsToCache.map(function (urlToPrefetch) {
            return new Request(urlToPrefetch, {
                credentials: 'include'
            });
        })).then(function () {
            console.log('All resources have been fetched and cached.');
        });
    }));
}

var messageHandler = function (event) {
    if (event.data === "SKIP-WAITING") {
        self.skipWaiting();
        clients.matchAll().then(function (clientList) {
            clientList.forEach(function(client) {
                client.postMessage("RELOAD");            
            });
        });
    }

}

var activationHandler = function (event) {
    // delete any caches that aren't in expectedCaches
    event.waitUntil(
        caches.keys()
        .then(function (keys) {
            Promise.all(
                keys.map(function (key) {
                    if (key.startsWith(STATIC_ASSETS_CACHE_PREFIX) && key !== STATIC_ASSETS_CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            )
        })
    );
}

var staticAssetsFetchHandler = function (event) {
    var request = event.request.url;
    hashFragmentStart = request.indexOf('#');
    if (hashFragmentStart > -1) {
        request = request.substr(0, hashFragmentStart);
    }
    if (STATIC_ROUTES_BUILD) {
        event.respondWith(caches.match(event.request).then(function (response) {
            if (response) {
                console.log(event.request.url);
                return response;
            }
            return fetch(event.request);
        }));
    }
}

var networkFirstHandler = function (event) {
    var request = event.request.url;
    hashFragmentStart = request.indexOf('#');
    if (hashFragmentStart > -1) {
        request = request.substr(0, hashFragmentStart);
    }
    if (DYNAMIC_ROUTES_BUILD) {
        event.respondWith(
            fetch(event.request)
            .then(function (networkResponse) {
                if (event.request.method === "GET") {
                    return caches.open(DYNAMIC_ASSETS_CACHE_NAME)
                        .then(function (cache) {
                            cache.add(event.request, networkResponse);
                            return networkResponse;
                        });
                }
                return networkResponse;
            })
            .catch(function () {
                return caches.match(event.request);
            })
        )
    }
};

function generateRouting(type) {
    var parts = [],
        routes = this.options[type].routes || [];
    routes.forEach(function (route) {
        if (route.match === "includes") {
            parts.push(`request.includes("${route.uri}")`);
        } else if (route.match === "exact") {
            parts.push(`request === "${route.uri}"`)
        }
    });
    return parts.join(" || ");
}

function generateFileContent() {
    var networkFirstRoutes = generateRouting.bind(this)("networkFirst"),
        cacheFirstRoutes = generateRouting.bind(this)("cacheFirst"),
        fileContent = `var urlsToCache = [URLS_TO_CACHE];\n\n` +
        `self.addEventListener("message", ${messageHandler})\n\n` +
        `self.addEventListener("install",${installHandler})\n\n` +
        `self.addEventListener("activate", ${activationHandler})\n\n`;

    /* add cacheFirstHandler if there are static assets to fetch */
    if (cacheFirstRoutes !== "") {
        fileContent = `${fileContent}\n\nself.addEventListener("fetch", ${staticAssetsFetchHandler.toString().replace(/STATIC_ROUTES_BUILD/, cacheFirstRoutes)})`
    }

    /* add networkFirstHandler if there are dynamic routes to fetch */
    if (networkFirstRoutes !== "") {
        fileContent = `${fileContent}\n\nself.addEventListener("fetch", ${networkFirstHandler.toString().replace(/DYNAMIC_ROUTES_BUILD/, networkFirstRoutes)})`
    }

    return fileContent;
}

function generateServiceWorkerFile(options) {
    var data = generateFileContent.bind(this)()
        .replace(/URLS_TO_CACHE/, options.staticAssets.map(function (asset) {
            if (asset !== "../../index.html") {
                return "\"" + options.assetsPrefix + asset +  "\"";
            }
            return "\"/\"";

        }).join(','))
        .replace(/STATIC_ASSETS_CACHE_PREFIX/g, "\"" + options.staticAssetsCachePrefix + "\"")
        .replace(/STATIC_ASSETS_CACHE_NAME/g, "\"" + options.staticAssetsCacheName + "\"")
        .replace(/DYNAMIC_ASSETS_CACHE_NAME/g, "\"" + options.dynamicAssetsCacheName + "\"");
    
    var result = "";
    if(options.uglify) {
        var uglifyOptions = typeof options.uglify === "object" ? options.uglify : {};
        result = UglifyJS.minify(data, uglifyOptions).code;
    } else {
        result = data;
    }
    
    fs.writeFile("../service-worker.js", result, function (err) {
        if (err) {
            throw err;
        }
        console.log("Service-worker generated.");
    })
}

ServiceWorkerGenerator.prototype.apply = function (compiler) {
    var self = this,
        cacheFirstNamePrefix = (self.options && self.options.cacheFirst && self.options.cacheFirst.cacheNamePrefix) || 'static',
        networkFirstNamePrefix = (self.options && self.options.networkFirst && self.options.networkFirst.cacheNamePrefix) || 'dynamic',
        uglify = (self.options && self.options.uglify) || false,
        assetsPrefix = self.options.assetsPrefix;

    compiler.plugin("emit", function (compilation, callback) {
        var assets = [];
        for (var fileName in compilation.assets) {
            assets.push(fileName);
        }
        generateServiceWorkerFile.bind(self)({
			staticAssets:assets,
			cacheFirstNamePrefix:cacheFirstNamePrefix,
			staticAssetsCacheName:cacheFirstNamePrefix + '-' + crypto.createHash("sha256").update(assets.toString()).digest("base64"),
			networkFirstNamePrefix:networkFirstNamePrefix,
			uglify:uglify,
			assetsPrefix:assetsPrefix
		});
        callback();
    })
}

module.exports = ServiceWorkerGenerator;