'use strict';

var fs = require("fs"),
    crypto = require("crypto"),
    UglifyJS = require("uglify-js");

function ServiceWorkerGenerator(options) {
    this.options = options;

}

var generateInstallHandler = function(cacheFirstCacheName, fetchOptions) {
    return `function (event) {
        event.waitUntil(caches.open("${cacheFirstCacheName}").then(function (cache) {
            console.log("Opened cache");
            return cache.addAll(urlsToCache.map(function (urlToPrefetch) {
                return new Request(urlToPrefetch,${JSON.stringify(fetchOptions)});
            })).then(function () {
                console.log('All resources have been fetched and cached.');
            });
        }));
    }`;
}

var generateMessageHandler = function(networkFirstCacheName) {
    return `function (event) {
        if(event.data) {
            if (event.data.type === "SKIP-WAITING") {
                self.skipWaiting();
                clients.matchAll().then(function (clientList) {
                    clientList.forEach(function(client) {
                        client.postMessage("RELOAD");            
                    });
                });
            }
            else if(event.data.type === "CLEAR-DATA") {
                caches.delete("${networkFirstCacheName}")
            }
        }
    }`;
}  

var generateActivationHandler = function(cacheFirstCacheName) {
    return `function (event) {
        event.waitUntil(
            caches.keys()
            .then(function (keys) {
                Promise.all(
                    keys.map(function (key) {
                        if (key !== "${cacheFirstCacheName}") {
                            return caches.delete(key);
                        }
                    })
                )
            })
        );
    }`;
}

var generateStaticAssetsFetchHandler = function(staticRouting) {
    return `function (event) {
        var request = event.request.url,
        hashFragmentStart = request.indexOf('#');
        if (hashFragmentStart > -1) {
            request = request.substr(0, hashFragmentStart);
        }
        if (${staticRouting}) {
            event.respondWith(caches.match(event.request).then(function (response) {
                if (response) {
                    console.log(event.request.url);
                    return response;
                }
                return fetch(event.request);
            }));
        }
    }`;
}

var generateDynamicRouting = function(dynamicCacheName, dynamicRouting) {
    return `function (event) {
        var request = event.request.url,
        hashFragmentStart = request.indexOf('#');
        if (hashFragmentStart > -1) {
            request = request.substr(0, hashFragmentStart);
        }
        if (${dynamicRouting}) {
            event.respondWith(
                fetch(event.request)
                .then(function (networkResponse) {
                    if (event.request.method === "GET") {
                        return caches.open("${dynamicCacheName}")
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
    }`;
}

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

function generateFileContent(options) {
    var networkFirstRoutes = generateRouting.bind(this)("networkFirst"),
        cacheFirstRoutes = generateRouting.bind(this)("cacheFirst"),
        fileContent = `var urlsToCache = [${options.staticAssets.map(function (asset) {
            if (asset !== "../../index.html") {
                return "\"" + options.assetsPrefix + asset +  "\"";
            }
            return "\"/\"";

         }).join(',')}];\n\n` +
        `self.addEventListener("message", ${generateMessageHandler(options.networkFirstCacheName)})\n\n` +
        `self.addEventListener("install",${generateInstallHandler(options.cacheFirstCacheName, options.fetchOptions)})\n\n` +
        `self.addEventListener("activate", ${generateActivationHandler(options.cacheFirstCacheName)})\n\n`;

    /* add cacheFirstHandler if there are static assets to fetch */
    if (cacheFirstRoutes !== "") {
        fileContent = `${fileContent}\n\nself.addEventListener("fetch", ${generateStaticAssetsFetchHandler(cacheFirstRoutes)})`
    }

    /* add networkFirstHandler if there are dynamic routes to fetch */
    if (networkFirstRoutes !== "") {
        fileContent = `${fileContent}\n\nself.addEventListener("fetch", ${generateDynamicRouting(options.networkFirstCacheName,networkFirstRoutes)})`
    }

    return fileContent;
}

function generateServiceWorkerFile(options) {
    var data = generateFileContent.bind(this)(options);
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
        cacheFirstCacheName = (self.options.cacheFirst && self.options.cacheFirst.cacheName) ? self.options.cacheFirst.cacheName : 'static',
        networkFirstCacheName = (self.options.networkFirst && self.options.networkFirst.cacheName) ? self.options.networkFirst.cacheName : 'dynamic',
        uglify = self.options.uglify || {},
        assetsPrefix = self.options.assetsPrefix,
        fetchOptions = self.options.fetchOptions || {};

    compiler.plugin("emit", function (compilation, callback) {
        var assets = [];
        for (var fileName in compilation.assets) {
            assets.push(fileName);
        }
        generateServiceWorkerFile.bind(self)({
			staticAssets:assets,
			cacheFirstCacheName:cacheFirstCacheName + '-' + crypto.createHash("sha256").update(assets.toString()).digest("base64"),
			networkFirstCacheName,
			uglify,
            assetsPrefix,
            fetchOptions
		});
        callback();
    })
}

module.exports = ServiceWorkerGenerator;