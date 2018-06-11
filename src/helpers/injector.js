
const iframeStyles = () => 'position: fixed;top: 0;width: 410px;padding:5px;height: 55px;left: 50%;transform: translate(-50%);background-color:#FFF;box-shadow:0 2px 4px 0 rgba(204, 204, 204, 0.5);border:1px solid #EFEFEF;display: none';

/* eslint-disable import/prefer-default-export */
const generateInjector = ({ fileName }) => `
const appUpdateDoc ="<div>Please <span id='fetch-updates-link'>click here </span> to get the latest version of the application.</div>";
const stateChangeHandler = (reg, newWorker, ifrm) => () => {
    if (navigator.serviceWorker.controller && reg.waiting && newWorker.state === 'installed') {
        const awaitingSW = reg.waiting;
        const updateLink = document.getElementById('app-update-frame')
            .contentWindow
            .document
            .getElementById('fetch-updates-link');
        ifrm.style.display = 'block';
        updateLink.style.color = '#027cd5';
        updateLink.style.cursor = 'pointer';
        updateLink.style.textDecoration = 'underline';
        updateLink
            .addEventListener('click', () => {
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

