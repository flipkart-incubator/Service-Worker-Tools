/**
 * Utility functions for Service Worker library.
 * @module SW_Utils
 * @exports injectServiceWorker
 * @exports updateServiceWorker
 * @exports unregisterServiceWorker
 * @exports clearData
 */


/**
 * Handles service worker installation.
 * @function injectServiceWorker
 * @param {funtion} updateCallback - Callback to be triggered when service worker update is found.
 */
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

/**
 * Handles service worker update.
 * @function updateServiceWorker
 */
function updateServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
            registration.update();
        });
    }
}

/**
 * Removes all existing service worker registration.
 * @function unregisterServiceWorker
 */
function unregisterServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => {
                registration.unregister();
            });
        });
    }
}

/**
 * Triggers CLEAR-DATA message for service worker.
 * @function clearData
 */
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
