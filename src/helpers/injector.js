
const appUpdateTemplate = "<div id='update-txt'><div>Catch up with the latest version.</div><button id='update-app'>Update</button><button id='ignore-update'>Ignore</button></div>";

const offlineTemplate = '<div>You are offline. All that you see could be outdated.</div>';

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
    return frame;
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
            const appUpdateContainer = createFrame("app-update-frame","${appUpdateTemplate}", ['hidden-frame']);
            const offlineMessageContainer = createFrame("offline-notification-frame", "${offlineTemplate}", ['hidden-frame']);
            document.body.appendChild(appUpdateContainer); 
            document.body.appendChild(offlineMessageContainer); 
            document.getElementById('ignore-update').addEventListener('click', () => hideFrame('app-update-frame'));
            reg.addEventListener('updatefound', (e)  => {
                const newWorker = reg.installing;
                newWorker && newWorker.addEventListener('statechange', (e) => {
                    if (navigator.serviceWorker.controller && reg.waiting && e.target.state === 'installed') {
                        const awaitingSW = reg.waiting;
                        showFrame('app-update-frame')
                        document.getElementById('update-app').addEventListener('click', () => {
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

