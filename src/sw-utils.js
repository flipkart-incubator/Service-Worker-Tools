

function injectServiceWorker(updateCallback) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (navigator.serviceWorker.controller && reg.waiting && newWorker.state === 'installed') {
              const awaitingSW = reg.waiting;
              if (updateCallback && typeof updateCallback === 'function') {
                updateCallback(awaitingSW);
              }
            }
          });
        });
      }, (err) => {
        throw new Error('Service worker registration failed: ', err);
      });
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data === 'RELOAD') {
        window.location.reload();
      }
    });
  }
}

function updateServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.update();
    });
  }
}

function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    });
  }
}

function clearData() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR-DATA',
    });
  }
}

module.exports = {
  injectServiceWorker,
  updateServiceWorker,
  unregisterServiceWorker,
  clearData,
};
