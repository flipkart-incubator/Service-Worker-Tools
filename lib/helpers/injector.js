'use strict';

var iframeStyles = function iframeStyles() {
    return 'position: fixed;top: 0;width: 410px;padding:5px;height: 55px;left: 50%;transform: translate(-50%);background-color:#FFF;box-shadow:0 2px 4px 0 rgba(204, 204, 204, 0.5);border:1px solid #EFEFEF;display: none';
};

var generateInjector = function generateInjector(_ref) {
    var fileName = _ref.fileName;
    return '\nconst appUpdateDoc ="<div>Please <span id=\'fetch-updates-link\'>click here </span> to get the latest version of the application.</div>";\nconst stateChangeHandler = (reg, newWorker, ifrm) => () => {\n    if (navigator.serviceWorker.controller && reg.waiting && newWorker.state === \'installed\') {\n        const awaitingSW = reg.waiting;\n        const updateLink = document.getElementById(\'app-update-frame\')\n            .contentWindow\n            .document\n            .getElementById(\'fetch-updates-link\');\n        ifrm.style.display = \'block\';\n        updateLink.style.color = \'#027cd5\';\n        updateLink.style.cursor = \'pointer\';\n        updateLink.style.textDecoration = \'underline\';\n        updateLink\n            .addEventListener(\'click\', () => {\n                awaitingSW.postMessage({\n                    type: \'SKIP-WAITING\',\n                });\n            });\n    }\n};\n\nconst messageHandler = (event) => {\n    if (event.data === \'RELOAD\') {\n        location.reload();\n    }\n};\n\nconst updateHandler = (reg, ifrm) => () => {\n    const newWorker = reg.installing;\n    newWorker.addEventListener(\'statechange\', stateChangeHandler(reg, newWorker, ifrm));\n};\n\nif (\'serviceWorker\' in navigator) {\n    navigator.serviceWorker.register(\'./' + fileName + '\')\n        .then((reg) => {\n            const ifrm = document.createElement(\'iframe\');\n            ifrm.setAttribute(\'id\', \'app-update-frame\');\n            ifrm.setAttribute(\'srcdoc\', appUpdateDoc);\n            ifrm.setAttribute(\'style\', \'' + iframeStyles() + '\');\n            document.body.appendChild(ifrm);\n            reg.addEventListener(\'updatefound\', updateHandler(reg, ifrm));\n            navigator.serviceWorker.addEventListener(\'message\', messageHandler);\n        }, (err) => {\n            throw new Error(\'Service worker registration failed: \', err);\n        });\n}';
};

module.exports = {
    generateInjector: generateInjector
};