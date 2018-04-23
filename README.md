# fk-retail-service-worker
A webpack plugin that generates a service worker, and provides a set of utility methods to work with it. 

## Usage Examples ##
```
var ServiceWorkerGeneratorPlugin = require("fk-retail-service-worker/webpack-sw-generator");
...
...
new ServiceWorkerGeneratorPlugin({
            cacheFirst: {
                cacheName: "ASSETS",
                routes: [{
                    uri: "/www/fk-retail-vpp/",
                    match: "includes",
                    ignoreHashFragment: false
                }]
            },
            networkFirst: {
                cacheName: "DATA",
                routes: []
            },
            uglify: {
                mangle: {
                    toplevel: true
                },
                compress: {
                    warnings: false,
                    drop_console: true
                }
            },
            assetsPrefix:"https://retail.flixcart.com/www/fk-retail-vpp/"
        })
```

## Options ##
Think of caching strategies you would like to apply and configure the plugin accordingly. Bifurcate your application routes into ‘cache first’ ,  ‘network first’ and configure accordingly. 

* cacheFirst / networkFirst
    * cacheName ( String ) - defaults to 'ASSETS' for 'cacheFirst' and 'DATA' for 'networkFirst'         
* uglify
    * https://github.com/webpack-contrib/uglifyjs-webpack-plugin
* assetsPrefix
    * to form URIs to the assets to be fetched during service worker installation
    * mandatory
* fetchOptions
    * options to be passed for the fetch calls for assets.
    If ‘cookie’ needs to be passed with every fetch call, you’ll      need to set ‘credentials’ to true

## Utility Methods ##
* ‘injectServiceWorker’ 
* ‘updateServiceWorker’ - use this to update your service worker.
   How frequently this happens is upto the client. For eg.  you could call this with every route change 
* ‘unregisterServiceWorker’
* ‘clearData’ - the ability to clear data cache whenever required.
   Think of shared systems and ACL and permissions. Cached data could cause problems. 
   We recommend clearing data cache with  every successful login.




