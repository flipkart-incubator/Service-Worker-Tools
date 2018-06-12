
const iframeStyles = () => 'position: fixed;top: 0;width: 410px;padding:5px;height: 1110px;left: 50%;transform: translate(-50%);background-color:#f0f5ea;box-shadow:0 0 1px rgba(94,164,0,.9);font-size:13px;border:1px solid #EFEFEF;display: none';

/* eslint-disable import/prefer-default-export */
const generateInjector = ({ fileName }) => `
const appUpdateDoc ="<div id='update-txt'><div>Application has been updated. Click the button below to get the latest version.</div><button id='update-app'>Update App</button></div>";
const stateChangeHandler = (reg, newWorker, ifrm) => () => {
    if (navigator.serviceWorker.controller && reg.waiting && newWorker.state === 'installed') {
        const awaitingSW = reg.waiting;
        const appUpdateFrame = document.getElementById('app-update-frame');
        const updateText= appUpdateFrame
            .contentWindow
            .document
            .getElementById('update-txt');
        const updateApp = appUpdateFrame
            .contentWindow
            .document
            .getElementById('update-app');
        ifrm.style.display = 'block';
        updateText.style.color = '#4b583a';
        updateText.style.cursor = 'pointer';
        updateApp.style.color = '#fff';
        updateApp.style.backgroundColor = '#4caf50';
        updateApp.style.marginTop = '10px';
        updateApp.style.padding = '8px';
        updateApp.style.borderRadius = '3px';
        updateApp.style.outline = "none";
        updateApp.style.cursor = 'pointer';
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

const updateHandler = (reg, ifrm) => () => {
    const newWorker = reg.installing;
    newWorker.addEventListener('statechange', stateChangeHandler(reg, newWorker, ifrm));
};

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./${fileName}')
        .then((reg) => {
            const ifrm = document.createElement('iframe');
            ifrm.setAttribute('id', 'app-update-frame');
            ifrm.setAttribute('srcdoc', appUpdateDoc);
            ifrm.setAttribute('style', '${iframeStyles()}');
            document.body.appendChild(ifrm);
            reg.addEventListener('updatefound', updateHandler(reg, ifrm));
            navigator.serviceWorker.addEventListener('message', messageHandler);
        }, (err) => {
            throw new Error('Service worker registration failed: ', err);
        });
}`;

module.exports = {
    generateInjector,
};

