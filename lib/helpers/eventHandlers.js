"use strict";

var generateInstallHandler = function generateInstallHandler(cacheFirstCacheName, fetchOptions) {
    return "function (event) {\n    event.waitUntil(caches.open(\"" + cacheFirstCacheName + "\").then(function (cache) {\n        console.log(\"Opened cache\");\n        return cache.addAll(urlsToCache.map(function (urlToPrefetch) {\n            return new Request(urlToPrefetch," + JSON.stringify(fetchOptions) + ");\n        })).then(function () {\n            console.log(\"All resources have been fetched and cached.\");\n        });\n    }));\n}";
};

var generateMessageHandler = function generateMessageHandler(networkFirstCacheName) {
    return "function (event) {\n    if(event.data) {\n        if (event.data.type === \"SKIP-WAITING\") {\n            return self.skipWaiting();    \n        }\n        else if(event.data.type === \"CLEAR-DATA\") {\n            caches.delete(\"" + networkFirstCacheName + "\")\n        }\n    }\n}";
};

var generateActivationHandler = function generateActivationHandler(cacheFirstCacheName) {
    return "function (event) {\n    event.waitUntil(\n        caches.keys()\n        .then(function (keys) {\n            return Promise.all(\n                keys.map(function (key) {\n                    if (key !== \"" + cacheFirstCacheName + "\") {\n                        return caches.delete(key);\n                    }\n                })\n            )\n        })\n    );\n}";
};

module.exports = {
    generateInstallHandler: generateInstallHandler,
    generateMessageHandler: generateMessageHandler,
    generateActivationHandler: generateActivationHandler
};