'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fs = require('fs');
var crypto = require('crypto');
var UglifyJS = require('uglify-js');
var eventHelpers = require('./helpers/eventHandlers');
var path = require('path');
var injectorHelpers = require('./helpers/injector');

var generateStaticAssetsFetchHandler = function generateStaticAssetsFetchHandler(staticRouting) {
    return 'function (event) {\n\tvar request = event.request.url,\n\thashFragmentStart = request.indexOf(\'#\');\n\tif (hashFragmentStart > -1) {\n\t\trequest = request.substr(0, hashFragmentStart);\n\t}\n\tif (' + staticRouting + ') {\n\t\tevent.respondWith(caches.match(event.request).then(function (response) {\n\t\t\tif (response) {\n\t\t\t\tconsole.log(event.request.url);\n\t\t\t\treturn response;\n\t\t\t}\n\t\t\treturn fetch(event.request);\n\t\t}));\n\t}\n}';
};

var generateDynamicRouting = function generateDynamicRouting(dynamicCacheName, dynamicRouting) {
    return 'function (event) {\n\tvar request = event.request.url,\n\thashFragmentStart = request.indexOf(\'#\');\n\tif (hashFragmentStart > -1) {\n\t\trequest = request.substr(0, hashFragmentStart);\n\t}\n\tif (' + dynamicRouting + ') {\n\t\tevent.respondWith(\n\t\t\tfetch(event.request)\n\t\t\t.then(function (networkResponse) {\n\t\t\t\tif (event.request.method === "GET") {\n\t\t\t\t\treturn caches.open("' + dynamicCacheName + '")\n\t\t\t\t\t\t.then(function (cache) {\n\t\t\t\t\t\t\tcache.put(event.request, networkResponse.clone());\n\t\t\t\t\t\t\treturn networkResponse;\n\t\t\t\t\t\t});\n\t\t\t\t}\n\t\t\t\treturn networkResponse;\n\t\t\t})\n\t\t\t.catch(function () {\n\t\t\t\treturn caches.match(event.request);\n\t\t\t})\n\t\t)\n\t}\n}';
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

    if (cacheFirstRoutes !== '') {
        fileContent = fileContent + '\n\nself.addEventListener("fetch", ' + generateStaticAssetsFetchHandler(cacheFirstRoutes) + ')';
    }

    if (networkFirstRoutes !== '') {
        fileContent = fileContent + '\n\nself.addEventListener("fetch", ' + generateDynamicRouting(options.networkFirstCacheName, networkFirstRoutes) + ')';
    }

    return fileContent;
}

function generateServiceWorkerFile(options) {
    var data = generateFileContent.bind(this)(options);
    var output = options.output;

    var result = '';
    if (options.uglify) {
        var uglifyOptions = _typeof(options.uglify) === 'object' ? options.uglify : {};
        result = UglifyJS.minify(data, uglifyOptions).code;
    } else {
        result = data;
    }
    fs.writeFile(path.resolve(output.path, output.fileName), result, function (err) {
        if (err) {
            throw err;
        }
    });
}

function generateInjector(_ref) {
    var outputPath = _ref.outputPath,
        fileName = _ref.fileName;

    fs.writeFile(path.resolve(outputPath, 'service-worker-injector.js'), injectorHelpers.generateInjector({ fileName: fileName }), function (err) {
        if (err) {
            throw err;
        }
    });
}

var ServiceWorkerGenerator = function () {
    function ServiceWorkerGenerator(options) {
        _classCallCheck(this, ServiceWorkerGenerator);

        this.options = options;
    }

    _createClass(ServiceWorkerGenerator, [{
        key: 'apply',
        value: function apply(compiler) {
            var _this = this;

            var options = this.options;

            var cacheFirstCacheName = options.cacheFirst.cacheName;
            var networkFirstCacheName = options.networkFirst.cacheName;
            var uglify = options.uglify,
                assetsPrefix = options.assetsPrefix,
                _options$fetchOptions = options.fetchOptions,
                fetchOptions = _options$fetchOptions === undefined ? {} : _options$fetchOptions,
                _options$output = options.output,
                output = _options$output === undefined ? {
                fileName: 'service-worker.js',
                path: '../'
            } : _options$output;

            compiler.plugin('emit', function (compilation, callback) {
                var assets = Object.keys(compilation.assets);
                generateServiceWorkerFile.bind(_this)({
                    staticAssets: assets,
                    cacheFirstCacheName: (cacheFirstCacheName || 'Assets') + '-' + crypto.createHash('sha256').update(assets.toString()).digest('base64'),
                    networkFirstCacheName: networkFirstCacheName || 'Data',
                    uglify: uglify,
                    assetsPrefix: assetsPrefix,
                    fetchOptions: fetchOptions,
                    output: output
                });
                generateInjector({
                    outputPath: output.path,
                    fileName: output.fileName
                });
                callback();
            });
        }
    }]);

    return ServiceWorkerGenerator;
}();

module.exports = ServiceWorkerGenerator;