'use strict';

var _constants = require('./constants');

var createFrame = function createFrame(id, innerHTML, classList) {
    var frame = document.createElement('div');
    frame.setAttribute('id', id);
    frame.innerHTML = innerHTML;
    frame.classList.add(classList);
    document.body.appendChild(frame);
};

var hideFrame = function hideFrame(id) {
    return document.getElementById(id).classList.add('hidden-frame');
};

var showFrame = function showFrame(id) {
    return document.getElementById(id).classList.remove('hidden-frame');
};

function updateExperience(_ref) {
    var sw = _ref.sw,
        _ref$onUpdateClick = _ref.onUpdateClick,
        onUpdateClick = _ref$onUpdateClick === undefined ? function () {
        return Promise.resolve();
    } : _ref$onUpdateClick;

    var refreshing = void 0;
    document.getElementById('ignore-update').addEventListener('click', function () {
        return hideFrame('app-update-frame');
    });
    navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
    showFrame('app-update-frame');
    document.getElementById('update-app').addEventListener('click', function () {
        onUpdateClick().then(function () {
            hideFrame('app-update-frame');
            showFrame('in-flight-requests-frame');
            sw.postMessage({
                type: 'SKIP-WAITING'
            });
        });
    });
}

function injectServiceWorker() {
    var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref2$withUpdate = _ref2.withUpdate,
        withUpdate = _ref2$withUpdate === undefined ? false : _ref2$withUpdate,
        cb = _ref2.cb,
        onUpdateClick = _ref2.onUpdateClick;

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').then(function (reg) {
            if (withUpdate) {
                window.addEventListener('offline', function () {
                    return showFrame('offline-notification-frame');
                });
                window.addEventListener('online', function () {
                    return hideFrame('offline-notification-frame');
                });
                createFrame('app-update-frame', _constants.APP_UPDATE_TEMPLATE, ['hidden-frame']);
                createFrame('offline-notification-frame', _constants.OFFLINE_TEMPLATE, ['hidden-frame']);
                createFrame('in-flight-requests-frame', _constants.IN_FLIGHT_REQUESTS_TEMPLATE, ['hidden-frame']);
            }
            reg.addEventListener('updatefound', function () {
                var newWorker = reg.installing;
                newWorker.addEventListener('statechange', function () {
                    if (navigator.serviceWorker.controller && reg.waiting && newWorker.state === 'installed') {
                        var awaitingSW = reg.waiting;
                        if (!withUpdate && cb && typeof cb === 'function') {
                            cb(awaitingSW);
                        } else if (withUpdate) {
                            updateExperience({ sw: awaitingSW, onUpdateClick: onUpdateClick });
                        }
                    }
                });
            });
        }, function (err) {
            throw new Error('Service worker registration failed: ', err);
        });
    }
}

function updateServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(function (registration) {
            registration.update();
        });
    }
}

function unregisterServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            registrations.forEach(function (registration) {
                registration.unregister();
            });
        });
    }
}

function clearData() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.controller.postMessage({
            type: 'CLEAR-DATA'
        });
    }
}

module.exports = {
    injectServiceWorker: injectServiceWorker,
    updateServiceWorker: updateServiceWorker,
    unregisterServiceWorker: unregisterServiceWorker,
    clearData: clearData
};