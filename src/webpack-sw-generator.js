
const fs = require('fs');
const UglifyJS = require('uglify-js');
const eventHelpers = require('./helpers/eventHandlers');

function ServiceWorkerGenerator(options) {
  this.options = options;
}

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

function generateFileContent(options) {
  const networkFirstRoutes = generateRouting.bind(this)('networkFirst');
  const cacheFirstRoutes = generateRouting.bind(this)('cacheFirst');
  let fileContent = `var urlsToCache = [${options.staticAssets.map((asset) => {
    if (asset !== '../../index.html') {
      return `"${options.assetsPrefix}${asset}"`;
    }
    return '"/"';
  }).join(',')}];\n\n` +
        `self.addEventListener("message", ${eventHelpers.generateMessageHandler(options.networkFirstCacheName)})\n\n` +
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

ServiceWorkerGenerator.prototype.apply = function apply(compiler) {
  const self = this;
  const { options } = self;
  const cacheFirstCacheName = options.cacheFirst.cacheName;
  const networkFirstCacheName = options.networkFirst.cacheName;
  const { uglify, assetsPrefix, fetchOptions = {} } = options;
  compiler.plugin('emit', (compilation, callback) => {
    const source = generateServiceWorkerFile.bind(self)({
      staticAssets: Object.keys(compilation.assets),
      cacheFirstCacheName: `${cacheFirstCacheName || 'Assets'}-${Date.now()}`,
      networkFirstCacheName: networkFirstCacheName || 'Data',
      uglify,
      assetsPrefix,
      fetchOptions,
    });
    compilation.assets['service-worker.js'] = {
      source() {
        return source;
      },
      size() {
        return source.length;
      },
    };
    callback();
  });
};

module.exports = ServiceWorkerGenerator;
