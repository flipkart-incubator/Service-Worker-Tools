'use strict';

function injectServiceWorker(updateCallback) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').then(function (reg) {
      reg.addEventListener('updatefound', function () {
        var newWorker = reg.installing;
        newWorker.addEventListener('statechange', function () {
          if (navigator.serviceWorker.controller && reg.waiting && newWorker.state === 'installed') {
            var awaitingSW = reg.waiting;
            if (updateCallback && typeof updateCallback === 'function') {
              updateCallback(awaitingSW);
            }
          }
        });
      });
    }, function (err) {
      throw new Error('Service worker registration failed: ', err);
    });
    navigator.serviceWorker.addEventListener('message', function (event) {
      if (event.data === 'RELOAD') {
        window.location.reload();
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