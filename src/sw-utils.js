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

import { APP_UPDATE_TEMPLATE, OFFLINE_TEMPLATE, IN_FLIGHT_REQUESTS_TEMPLATE } from './constants';

const createFrame = (id, innerHTML, classList) => {
    const frame = document.createElement('div');
    frame.setAttribute('id', id);
    frame.innerHTML = innerHTML;
    frame.classList.add(classList);
    document.body.appendChild(frame);
};

const hideFrame = id => document.getElementById(id).classList.add('hidden-frame');

const showFrame = id => document.getElementById(id).classList.remove('hidden-frame');

function updateExperience(sw) {
    let refreshing;
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

function injectServiceWorker({ withUpdate = false, cb } = {}) {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then((reg) => {
                if (withUpdate) {
                    window.addEventListener('offline', () => showFrame('offline-notification-frame'));
                    window.addEventListener('online', () => hideFrame('offline-notification-frame'));
                    createFrame('app-update-frame', APP_UPDATE_TEMPLATE, ['hidden-frame']);
                    createFrame('offline-notification-frame', OFFLINE_TEMPLATE, ['hidden-frame']);
                    createFrame('in-flight-requests-frame', IN_FLIGHT_REQUESTS_TEMPLATE, ['hidden-frame']);
                }
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (navigator.serviceWorker.controller && reg.waiting && newWorker.state === 'installed') {
                            const awaitingSW = reg.waiting;
                            if (!withUpdate && cb && typeof cb === 'function') {
                                cb(awaitingSW);
                            } else if (withUpdate) {
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
