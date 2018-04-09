# fk-retail-service-worker
A build time webpack plugin that generates a service worker. 
Think in terms of strategies for routes in your application , and put them in a simple configuration. 

```
new ServiceWorkerGeneratorPlugin({
			cacheFirst: {
				cacheNamePrefix: "ASSETS",
				routes: [{
					uri: "/www/fk-retail-vpp/",
					match: "includes",
					ignoreHashFragment: false
				}]
			},
			networkFirst: {
				cacheNamePrefix: "DATA",
				routes: [{
					uri: "/vendor/",
					match: "includes",
					ignoreHashFragment: false
				}, {
					uri: "https://vendorhub.flipkart.com/isAuthenticated",
					match: "exact",
					ignoreHashFragment: false
				}]
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
