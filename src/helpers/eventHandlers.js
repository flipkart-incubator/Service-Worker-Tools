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

const generateMessageHandler = networkFirstCacheName => `function (event) {
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

const generateActivationHandler = cacheFirstCacheName => `function (event) {
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

module.exports = {
  generateInstallHandler,
  generateMessageHandler,
  generateActivationHandler,
};

