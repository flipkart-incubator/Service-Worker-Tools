const eventHelpers = require('../../src/helpers/eventHandlers');

const WHITESPACE_AND_NEW_LINE_CHARS_REGEX = /\r?\n|\r|\s/g;

describe('Event helper test suite', () => {
  it('install handler generation', () => {
    expect(eventHelpers.generateInstallHandler('ASSETS-1234', {
      credentials: true,
    }).replace(WHITESPACE_AND_NEW_LINE_CHARS_REGEX, '')).toBe(`function (event) {
        event.waitUntil(caches.open("ASSETS-1234").then(function (cache) {
            console.log("Opened cache");
            return cache.addAll(urlsToCache.map(function (urlToPrefetch) {
                return new Request(urlToPrefetch,{"credentials":true});
            })).then(function () {
                console.log("All resources have been fetched and cached.);
            });
        }));
    }`.replace(WHITESPACE_AND_NEW_LINE_CHARS_REGEX, ''));
  });
  it('Verifies message handler', () => {
    expect(eventHelpers.generateMessageHandler('DATA').replace(WHITESPACE_AND_NEW_LINE_CHARS_REGEX, '')).toBe(`function (event) {
        if(event.data) {
            if (event.data.type === "SKIP-WAITING") {
                self.skipWaiting();
                clients.matchAll().then(function (clientList) {
                    clientList.forEach(function(client) {
                        client.postMessage("RELOAD");            
                    });
                });
            }
            else if(event.data.type === "CLEAR-DATA") {
                caches.delete("DATA")
            }
        }
    }`.replace(WHITESPACE_AND_NEW_LINE_CHARS_REGEX, ''));
  });
  it('verifies the activation handler', () => {
    expect(eventHelpers.generateActivationHandler('ASSETS-1234').replace(WHITESPACE_AND_NEW_LINE_CHARS_REGEX, '')).toBe(`function (event) {
        event.waitUntil(
            caches.keys()
            .then(function (keys) {
                Promise.all(
                    keys.map(function (key) {
                        if (key !== "ASSETS-1234") {
                            return caches.delete(key);
                        }
                    })
                )
            })
        );
    }`.replace(WHITESPACE_AND_NEW_LINE_CHARS_REGEX, ''));
  });
});

