
const appUpdateTemplate = "<div id='update-txt'><div>Application has been updated. Click the button below to get the latest version.</div><button id='update-app'>Update App</button></div>";


const generateInjector = ({ fileName }) => `
const stateChangeHandler = (reg, newWorker, appUpdateContainer) => () => {
    if (navigator.serviceWorker.controller && reg.waiting && newWorker.state === 'installed') {
        const awaitingSW = reg.waiting;
        const updateApp =document
            .getElementById('update-app');
        appUpdateContainer.classList.remove('hidden-frame');
        updateApp.addEventListener('click', () => {
            awaitingSW.postMessage({
                type: 'SKIP-WAITING',
            });
        });
    }
};

const messageHandler = (event) => {
    if (event.data === 'RELOAD') {
        location.reload();
    }
};

const updateHandler = (reg, appUpdateContainer) => () => {
    const newWorker = reg.installing;
    newWorker.addEventListener('statechange', stateChangeHandler(reg, newWorker, appUpdateContainer));
};

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./${fileName}')
        .then((reg) => {
            const appUpdateContainer = document.createElement('div');
            appUpdateContainer.setAttribute('id', 'app-update-frame');
            appUpdateContainer.innerHTML = "${appUpdateTemplate}";
            appUpdateContainer.classList.add('hidden-frame');
            document.body.appendChild(appUpdateContainer);
            reg.addEventListener('updatefound', ()  => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', stateChangeHandler(reg, newWorker, appUpdateContainer))
            });
            navigator.serviceWorker.addEventListener('message', messageHandler);
        }, (err) => {
            throw new Error('Service worker registration failed: ', err);
        });
}`;

module.exports = {
    generateInjector,
};

