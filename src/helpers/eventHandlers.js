/**
 * Helper functions for Service Worker library.
 * @module Helper
 * @exports generateInstallHandler
 * @exports generateMessageHandler
 * @exports generateMessageHandler
 */

/**
 * Returns install handler for service worker.
 * @function generateInstallHandler
 * @param {string} cacheFirstCacheName
 * @param {string} fetchOptions
 */
const generateInstallHandler = (cacheFirstCacheName, fetchOptions) => `function (event) {
    event.waitUntil(caches.open("${cacheFirstCacheName}").then(function (cache) {
        console.log("Opened cache");
        return cache.addAll(urlsToCache.map(function (urlToPrefetch) {
            return new Request(urlToPrefetch,${JSON.stringify(fetchOptions)});
        })).then(function () {
            console.log("All resources have been fetched and cached.");
        });
    }));
}`;

/**
 * Returns message handler for service worker.
 * @param {string} networkFirstCacheName
 */
const generateMessageHandler = options => `function (event) {
        if(event.data) {
            if (event.data.type === "SKIP-WAITING") {
                ${options.hooks.beforeUpdate ? `${options.hooks.beforeUpdate.toString()}()` : ''}
                return self.skipWaiting();    
            }
            else if(event.data.type === "CLEAR-DATA") {
                caches.delete("${options.networkFirstCacheName}")
            }
        }
    }`;

/**
 * Returns activation handler for service worker.
 * @param {string} cacheFirstCacheName
 */
const generateActivationHandler = cacheFirstCacheName => `function (event) {
    event.waitUntil(
        caches.keys()
        .then(function (keys) {
            return Promise.all(
                keys.map(function (key) {
                    if (key !== "${cacheFirstCacheName}") {
                        return caches.delete(key);
                    }
                })
            )
        })
    );
}`;

module.exports = {
    generateInstallHandler,
    generateMessageHandler,
    generateActivationHandler,
};

