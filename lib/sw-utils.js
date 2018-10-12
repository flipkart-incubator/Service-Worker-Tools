'use strict';

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

function updateExperience(sw) {
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
        hideFrame('app-update-frame');
        showFrame('in-flight-requests-frame');
        sw.postMessage({
            type: 'SKIP-WAITING'
        });
    });
}

function injectServiceWorker() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref$defaultBehaviour = _ref.defaultBehaviour,
        defaultBehaviour = _ref$defaultBehaviour === undefined ? false : _ref$defaultBehaviour,
        cb = _ref.cb;

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').then(function (reg) {
            if (defaultBehaviour) {
                var appUpdateTemplate = "<div id='update-txt'><img src='https://retail.flixcart.com/www/fk-retail-vpp/icon-star.png' /><span id='message'>Catch up with the latest version.</span><a id='update-app'>Update</a></span><a id='ignore-update'>X</a></div>";
                var offlineTemplate = "<div id='offline-txt'><img src='https://retail.flixcart.com/www/fk-retail-vpp/icon-plug.png' /><span id='message'>You are offline. All that you see could be outdated.</span></div>";
                var inFlightRequestsTemplate = "<div id='in-flight-requsts-txt'><img src='https://retail.flixcart.com/www/fk-retail-vpp/icon-hourglass.svg' /><span id='message'>Waiting for this page to complete ongoing requests...</span></div>";
                window.addEventListener('offline', function () {
                    return showFrame('offline-notification-frame');
                });
                window.addEventListener('online', function () {
                    return hideFrame('offline-notification-frame');
                });
                createFrame('app-update-frame', appUpdateTemplate, ['hidden-frame']);
                createFrame('offline-notification-frame', offlineTemplate, ['hidden-frame']);
                createFrame('in-flight-requests-frame', inFlightRequestsTemplate, ['hidden-frame']);
            }
            reg.addEventListener('updatefound', function () {
                var newWorker = reg.installing;
                newWorker.addEventListener('statechange', function () {
                    if (navigator.serviceWorker.controller && reg.waiting && newWorker.state === 'installed') {
                        var awaitingSW = reg.waiting;
                        if (!defaultBehaviour && cb && typeof cb === 'function') {
                            cb(awaitingSW);
                        } else if (defaultBehaviour) {
                            updateExperience(awaitingSW);
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