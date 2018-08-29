
const appUpdateTemplate = "<div id='update-txt'><img src='https://retail.flixcart.com/www/fk-retail-vpp/icon-star.png' /><span id='message'>Catch up with the latest version.</span><a id='update-app'>Update</a></span><a id='ignore-update'>X</a></div>";

const offlineTemplate = "<div id='offline-txt'><img src='https://retail.flixcart.com/www/fk-retail-vpp/icon-plug.png' /><span id='message'>You are offline. All that you see could be outdated.</span></div>";

const inFlightRequestsTemplate = "<div id='in-flight-requsts-txt'><span id='message'>Waiting for this page to complete ongoing requests...</span></div>";

const generateInjector = ({ fileName }) => `
const messageHandler = (event) => {
    if (event.data === 'RELOAD') {
        location.reload();
    }
};

const createFrame = (id, innerHTML, classList) => {
    const frame  = document.createElement('div');
    frame.setAttribute('id', id);
    frame.innerHTML = innerHTML;
    frame.classList.add(classList);
    document.body.appendChild(frame);
}

const hideFrame = (id) => document.getElementById(id).classList.add('hidden-frame');

const showFrame = (id) => document.getElementById(id).classList.remove('hidden-frame');

addEventListener('offline', () => showFrame("offline-notification-frame"));

addEventListener('online', () => hideFrame("offline-notification-frame"));

var refreshing;

navigator.serviceWorker.addEventListener('controllerchange',
  function() {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  }
);

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./${fileName}')
        .then((reg) => {
            createFrame("app-update-frame","${appUpdateTemplate}", ['hidden-frame']);
            createFrame("offline-notification-frame", "${offlineTemplate}", ['hidden-frame']);
            createFrame("in-flight-requests-frame", "${inFlightRequestsTemplate}", ['hidden-frame']);
            document.getElementById('ignore-update').addEventListener('click', () => hideFrame('app-update-frame'));
            reg.addEventListener('updatefound', (e)  => {
                const newWorker = reg.installing;
                newWorker && newWorker.addEventListener('statechange', (e) => {
                    if (navigator.serviceWorker.controller && reg.waiting && e.target.state === 'installed') {
                        const awaitingSW = reg.waiting;
                        showFrame('app-update-frame')
                        document.getElementById('update-app').addEventListener('click', () => {
                            hideFrame('app-update-frame');
                            showFrame('in-flight-requests-frame');
                            awaitingSW.postMessage({
                                type: 'SKIP-WAITING',
                            });
                        });
                    }
                })
            });
            navigator.serviceWorker.addEventListener('message', messageHandler);
        }, (err) => {
            throw new Error('Service worker registration failed: ', err);
        });
}`;

module.exports = {
    generateInjector,
};

