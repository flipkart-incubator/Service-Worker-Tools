'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var fs = require('fs');
var crypto = require('crypto');
var UglifyJS = require('uglify-js');
var eventHelpers = require('./helpers/eventHandlers');

function ServiceWorkerGenerator(options) {
  this.options = options;
}

var generateStaticAssetsFetchHandler = function generateStaticAssetsFetchHandler(staticRouting) {
  return 'function (event) {\n        var request = event.request.url,\n        hashFragmentStart = request.indexOf(\'#\');\n        if (hashFragmentStart > -1) {\n            request = request.substr(0, hashFragmentStart);\n        }\n        if (' + staticRouting + ') {\n            event.respondWith(caches.match(event.request).then(function (response) {\n                if (response) {\n                    console.log(event.request.url);\n                    return response;\n                }\n                return fetch(event.request);\n            }));\n        }\n    }';
};

var generateDynamicRouting = function generateDynamicRouting(dynamicCacheName, dynamicRouting) {
  return 'function (event) {\n        var request = event.request.url,\n        hashFragmentStart = request.indexOf(\'#\');\n        if (hashFragmentStart > -1) {\n            request = request.substr(0, hashFragmentStart);\n        }\n        if (' + dynamicRouting + ') {\n            event.respondWith(\n                fetch(event.request)\n                .then(function (networkResponse) {\n                    if (event.request.method === "GET") {\n                        return caches.open("' + dynamicCacheName + '")\n                            .then(function (cache) {\n                                cache.add(event.request, networkResponse);\n                                return networkResponse;\n                            });\n                    }\n                    return networkResponse;\n                })\n                .catch(function () {\n                    return caches.match(event.request);\n                })\n            )\n        }\n    }';
};

function generateRouting(type) {
  var parts = [];
  var routes = this.options[type] ? this.options[type].routes : [];
  routes.forEach(function (route) {
    switch (route.match) {
      case 'includes':
        parts.push('request.includes("' + route.uri + '")');
        break;
      case 'exact':
        parts.push('request === "' + route.uri + '"');
        break;
      case 'regex':
        parts.push('(' + new RegExp(route.uri) + ').test(request)');
        break;
      default:
        parts.push('request === "' + route.uri + '"');
    }
  });
  return parts.join(' || ');
}

function generateFileContent(options) {
  var networkFirstRoutes = generateRouting.bind(this)('networkFirst');
  var cacheFirstRoutes = generateRouting.bind(this)('cacheFirst');
  var fileContent = 'var urlsToCache = [' + options.staticAssets.map(function (asset) {
    if (asset !== '../../index.html') {
      return '"' + options.assetsPrefix + asset + '"';
    }
    return '"/"';
  }).join(',') + '];\n\n' + ('self.addEventListener("message", ' + eventHelpers.generateMessageHandler(options.networkFirstCacheName) + ')\n\n') + ('self.addEventListener("install",' + eventHelpers.generateInstallHandler(options.cacheFirstCacheName, options.fetchOptions) + ')\n\n') + ('self.addEventListener("activate", ' + eventHelpers.generateActivationHandler(options.cacheFirstCacheName) + ')\n\n');

  /* add cacheFirstHandler if there are static assets to fetch */
  if (cacheFirstRoutes !== '') {
    fileContent = fileContent + '\n\nself.addEventListener("fetch", ' + generateStaticAssetsFetchHandler(cacheFirstRoutes) + ')';
  }

  /* add networkFirstHandler if there are dynamic routes to fetch */
  if (networkFirstRoutes !== '') {
    fileContent = fileContent + '\n\nself.addEventListener("fetch", ' + generateDynamicRouting(options.networkFirstCacheName, networkFirstRoutes) + ')';
  }

  return fileContent;
}

function generateServiceWorkerFile(options) {
  var data = generateFileContent.bind(this)(options);
  var result = '';
  if (options.uglify) {
    var uglifyOptions = _typeof(options.uglify) === 'object' ? options.uglify : {};
    result = UglifyJS.minify(data, uglifyOptions).code;
  } else {
    result = data;
  }
  fs.writeFile('../service-worker.js', result, function (err) {
    if (err) {
      throw err;
    }
  });
}

ServiceWorkerGenerator.prototype.apply = function apply(compiler) {
  var self = this;
  var options = self.options;

  var cacheFirstCacheName = options.cacheFirst.cacheName;
  var networkFirstCacheName = options.networkFirst.cacheName;
  var uglify = options.uglify,
      assetsPrefix = options.assetsPrefix,
      _options$fetchOptions = options.fetchOptions,
      fetchOptions = _options$fetchOptions === undefined ? {} : _options$fetchOptions;

  compiler.plugin('emit', function (compilation, callback) {
    var assets = Object.keys(compilation.assets);
    var source = generateServiceWorkerFile.bind(self)({
      staticAssets: assets,
      cacheFirstCacheName: (cacheFirstCacheName || 'Assets') + '-' + crypto.createHash('sha256').update(assets.toString()).digest('base64'),
      networkFirstCacheName: networkFirstCacheName || 'Data',
      uglify: uglify,
      assetsPrefix: assetsPrefix,
      fetchOptions: fetchOptions
    });
    callback();
  });
};

module.exports = ServiceWorkerGenerator;