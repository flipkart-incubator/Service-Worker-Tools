"use strict";

var appUpdateTemplate = "<div id='update-txt'><div>Application has been updated. Click the button below to get the latest version.</div><button id='update-app'>Update App</button></div>";

var generateInjector = function generateInjector(_ref) {
    var fileName = _ref.fileName;
    return "\nconst stateChangeHandler = (reg, newWorker, appUpdateContainer) => () => {\n    if (navigator.serviceWorker.controller && reg.waiting && newWorker.state === 'installed') {\n        const awaitingSW = reg.waiting;\n        const updateApp =document\n            .getElementById('update-app');\n        appUpdateContainer.classList.remove('hidden-frame');\n        updateApp.addEventListener('click', () => {\n            awaitingSW.postMessage({\n                type: 'SKIP-WAITING',\n            });\n        });\n    }\n};\n\nconst messageHandler = (event) => {\n    if (event.data === 'RELOAD') {\n        location.reload();\n    }\n};\n\nconst updateHandler = (reg, appUpdateContainer) => () => {\n    const newWorker = reg.installing;\n    newWorker.addEventListener('statechange', stateChangeHandler(reg, newWorker, appUpdateContainer));\n};\n\nif ('serviceWorker' in navigator) {\n    navigator.serviceWorker.register('./" + fileName + "')\n        .then((reg) => {\n            const appUpdateContainer = document.createElement('div');\n            appUpdateContainer.setAttribute('id', 'app-update-frame');\n            appUpdateContainer.innerHTML = \"" + appUpdateTemplate + "\";\n            appUpdateContainer.classList.add('hidden-frame');\n            document.body.appendChild(appUpdateContainer);\n            reg.addEventListener('updatefound', ()  => {\n                const newWorker = reg.installing;\n                newWorker.addEventListener('statechange', stateChangeHandler(reg, newWorker, appUpdateContainer))\n            });\n            navigator.serviceWorker.addEventListener('message', messageHandler);\n        }, (err) => {\n            throw new Error('Service worker registration failed: ', err);\n        });\n}";
};

module.exports = {
    generateInjector: generateInjector
};