/**
 * Utility functions for Service Worker library.
 * @module SW_Generator
 * @requires fs - For writing generated service worker to file.
 * @requires crypto - For creating hash for static assets cache.
 * @requires uglify-js - For uglifying generated service worker for production builds.
 * @exports ServiceWorkerGenerator
 */

const crypto = require('crypto');
const UglifyJS = require('uglify-js');
const eventHelpers = require('./helpers/eventHandlers');
const _ = require('lodash');

/**
 * Returns static assets fetch handler for service worker.
 * @function generateStaticAssetsFetchHandler
 * @param {string} staticRouting - Routes for which static assets are handled by SW.
 */
const generateStaticAssetsFetchHandler = staticRouting => `function (event) {
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

/**
 * Returns dynamic assets fetch handler for service worker.
 * @function generateDynamicRouting
 * @param {string} dynamicCacheName - Cache name for storage of dynamically fetched requests.
 * @param {string} dynamicRouting - Routes for which dynamic assets are handled by SW.
 * */
const generateDynamicRouting = (dynamicCacheName, dynamicRouting) => `function (event) {
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
							cache.put(event.request, networkResponse.clone());
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

/**
 * Returns routes for fetch handlers.
 * @function generateRouting
 * @param {string} type - type of expression matching to be done (exact/includes/regex).
 * */
function generateRouting(type) {
    const parts = [];
    const routes = this.options[type] ? this.options[type].routes : [];
    routes.forEach((route) => {
        switch (route.match) {
        case 'includes':
            parts.push(`request.includes("${route.uri}")`);
            break;
        case 'exact':
            parts.push(`request === "${route.uri}"`);
            break;
        case 'regex':
            parts.push(`(${(new RegExp(route.uri))}).test(request)`);
            break;
        default:
            parts.push(`request === "${route.uri}"`);
        }
    });
    return parts.join(' || ');
}

/**
 * Returns service worker contents that need to be written into file.
 * @function generateFileContent
 * @param {object} options - options for file content generation.
 * */
function generateFileContent(options) {
    const networkFirstRoutes = generateRouting.bind(this)('networkFirst');
    const cacheFirstRoutes = generateRouting.bind(this)('cacheFirst');
    let fileContent = `var urlsToCache = [${options.staticAssets.map((asset) => {
        if (asset !== '../../index.html') {
            return `"${options.assetsPrefix}${asset}"`;
        }
        return '"/"';
    }).join(',')}];\n\n` +
	`self.addEventListener("message", ${eventHelpers.generateMessageHandler(_.pick(options, ['networkFirstCacheName', 'hooks']))})\n\n` +
	`self.addEventListener("install",${eventHelpers.generateInstallHandler(options.cacheFirstCacheName, options.fetchOptions)})\n\n` +
	`self.addEventListener("activate", ${eventHelpers.generateActivationHandler(options.cacheFirstCacheName)})\n\n`;

    /* add cacheFirstHandler if there are static assets to fetch */
    if (cacheFirstRoutes !== '') {
        fileContent = `${fileContent}\n\nself.addEventListener("fetch", ${generateStaticAssetsFetchHandler(cacheFirstRoutes)})`;
    }

    /* add networkFirstHandler if there are dynamic routes to fetch */
    if (networkFirstRoutes !== '') {
        fileContent = `${fileContent}\n\nself.addEventListener("fetch", ${generateDynamicRouting(options.networkFirstCacheName, networkFirstRoutes)})`;
    }

    return fileContent;
}

/**
 * Write service worker contents to a file.
 * @function generateServiceWorkerFile
 * @param {object} options - options for file content writing.
 * */
function generateServiceWorkerFile(options) {
    const data = generateFileContent.bind(this)(options);
    let result = '';
    if (options.uglify) {
        const uglifyOptions = typeof options.uglify === 'object' ? options.uglify : {};
        result = UglifyJS.minify(data, uglifyOptions).code;
    } else {
        result = data;
    }
    return result;
}

/**
 * Leverages webpack compiler to create a webpack plugin that generates service worker.
 * @class ServiceWorkerGenerator
 * @param {object} options - options for service worker generator webpack plugin.
 * */
class ServiceWorkerGenerator {
    constructor(options) {
        this.options = options;
    }
    apply(compiler) {
        const { options } = this;
        const cacheFirstCacheName = options.cacheFirst.cacheName;
        const networkFirstCacheName = options.networkFirst.cacheName;
        const {
            uglify, assetsPrefix, fetchOptions = {},
        } = options;
        compiler.plugin('emit', (compilation, callback) => {
            const assets = Object.keys(compilation.assets);
            const source = generateServiceWorkerFile.bind(this)({
                staticAssets: assets,
                cacheFirstCacheName: `${cacheFirstCacheName || 'Assets'}-${crypto.createHash('sha256').update(assets.toString()).digest('base64')}`, // assets hash prevents removal of static cache if no assets have changed
                networkFirstCacheName: networkFirstCacheName || 'Data',
                uglify,
                assetsPrefix,
                fetchOptions,
            });
            compilation.assets['service-worker.js'] = {
                source: () => Buffer.from(source),
                size() { return Buffer.byteLength(source); },
            };
            callback();
        });
    }
}

module.exports = ServiceWorkerGenerator;
