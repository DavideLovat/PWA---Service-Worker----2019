/*
    Il seguente codice svolge due compiti:
    1. self.clients.claim() consente al service worker di poter intercettare le richieste (fetch) fin dal primo caricamento della pagina,
        piuttosto che attendere il refresh della pagina dopo la registrazione del service worker.
        (alcune richieste vengo perse, dipende da quanto il SW è veloce a installarsi)
    2. Svuoto la cache, se la versione della cache cambia.
*/

function swActivate(event, isFetchOnStart, cacheWhiteList){
    event.waitUntil(
        enableFetchOnStart(isFetchOnStart),
        clearCacheIfDifferent(cacheWhiteList)
    );
}
function enableFetchOnStart(isEnable){    
    if(isEnable){
        self.clients.claim();
    }
}
function clearCacheIfDifferent(cacheWhiteList) {
    caches.keys().then(function (cacheNames) {
        return Promise.all(
            cacheNames.map(function(cacheName) {
                if (!cacheWhiteList.includes(cacheName)){
                    console.log('REMOVE CACHE: ',cacheName);
                    return caches.delete(cacheName);
                }
            })
        );
    });
}

