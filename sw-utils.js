'use strict';

function injectServiceWorker(updateCallback) {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register("/service-worker.js").then(function (reg) {
            reg.onupdatefound = function () {
                var newWorker = reg.installing;
                newWorker.addEventListener('statechange', function (e) {
                    if (navigator.serviceWorker.controller && reg.waiting && newWorker.state === "installed") {
                        var awaitingSW = reg.waiting;
                        if (updateCallback && typeof updateCallback === 'function') {
                            updateCallback(awaitingSW);
                        } else {
                            console.error("No updateCallback found.");
                        }
                    }
                });
            };
        }, function (err) {
            console.error('Service worker registration failed: ', err);
        });
        navigator.serviceWorker.addEventListener('message', function (event) {
            if (event.data === "RELOAD") {
                location.reload();
            }
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

module.exports = {
    injectServiceWorker: injectServiceWorker,
    updateServiceWorker: updateServiceWorker,
    unregisterServiceWorker: unregisterServiceWorker
};