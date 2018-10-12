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

const createFrame = (id, innerHTML, classList) => {
    const frame = document.createElement('div');
    frame.setAttribute('id', id);
    frame.innerHTML = innerHTML;
    frame.classList.add(classList);
    document.body.appendChild(frame);
};

const appUpdateTemplate = "<div id='update-txt'><img src='https://retail.flixcart.com/www/fk-retail-vpp/icon-star.png' /><span id='message'>Catch up with the latest version.</span><a id='update-app'>Update</a></span><a id='ignore-update'>X</a></div>";

const offlineTemplate = "<div id='offline-txt'><img src='https://retail.flixcart.com/www/fk-retail-vpp/icon-plug.png' /><span id='message'>You are offline. All that you see could be outdated.</span></div>";

const inFlightRequestsTemplate = "<div id='in-flight-requsts-txt'><img src='https://retail.flixcart.com/www/fk-retail-vpp/icon-hourglass.svg' /><span id='message'>Waiting for this page to complete ongoing requests...</span></div>";


const hideFrame = id => document.getElementById(id).classList.add('hidden-frame');

const showFrame = id => document.getElementById(id).classList.remove('hidden-frame');

addEventListener('offline', () => showFrame('offline-notification-frame'));

addEventListener('online', () => hideFrame('offline-notification-frame'));

function updateExperience(sw) {
    let refreshing;
    createFrame('app-update-frame', appUpdateTemplate, ['hidden-frame']);
    createFrame('offline-notification-frame', offlineTemplate, ['hidden-frame']);
    createFrame('in-flight-requests-frame', inFlightRequestsTemplate, ['hidden-frame']);
    document.getElementById('ignore-update').addEventListener('click', () => hideFrame('app-update-frame'));
    navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        },
    );
    showFrame('app-update-frame');
    document.getElementById('update-app').addEventListener('click', () => {
        hideFrame('app-update-frame');
        showFrame('in-flight-requests-frame');
        sw.postMessage({
            type: 'SKIP-WAITING',
        });
    });
}

function injectServiceWorker({ defaultBehaviour = false, cb }) {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then((reg) => {
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (navigator.serviceWorker.controller && reg.waiting && newWorker.state === 'installed') {
                            const awaitingSW = reg.waiting;
                            if (!defaultBehaviour && cb && typeof cb === 'function') {
                                cb(awaitingSW);
                            } else if (defaultBehaviour) {
                                updateExperience(awaitingSW);
                            }
                        }
                    });
                });
            }, (err) => {
                throw new Error('Service worker registration failed: ', err);
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
