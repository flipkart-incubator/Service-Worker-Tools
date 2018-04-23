# fk-retail-service-worker
A webpack plugin that generates a service worker, and provides a set of utility methods to work with it. Think of the caching strategies you would like to apply ('cache first' or 'network first') and configure the plugin accordingly.

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
 
* cacheFirst / networkFirst
    * cacheName ( String ) - defaults to 'ASSETS' for 'cacheFirst' and 'DATA' for 'networkFirst'         
* uglify
    * https://github.com/webpack-contrib/uglifyjs-webpack-plugin
* assetsPrefix
    * to form URIs to the assets to be fetched during service worker installation
    * mandatory
* fetchOptions
    * options to be passed for the fetch calls for assets.
    If cookies needs to be passed with every fetch call, you’ll need to set ‘credentials’ to true

## Utility Methods ##
* ‘injectServiceWorker’ 
* ‘updateServiceWorker’ - use this to update your service worker.
   How frequently this happens is upto the client. For eg.  you could call this with every route change 
* ‘unregisterServiceWorker’
* ‘clearData’ - the ability to clear data cache whenever required.
   Think of shared systems and ACL and permissions. Cached data could cause problems. 
   We recommend clearing data cache with  every successful login.


## Contributing ##
* sourceCode for library is present in "src/"
    * Any changes should be made to this folder only.
    * To build run "npm run build".
    * Above command generates "lib/" folder which should be pushed along with your changes.
* We use babel to transpile es6 code to es5 code. (Presets used "babel-preset-es2015" with support for last two browsers.)
