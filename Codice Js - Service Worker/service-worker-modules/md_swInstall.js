/*
Attiva il service worker non appena viene installato.
Fa il precaching degli elementi specificati nella lista di precaching se 'isPrecaching' è settato a true.
(NOTA: fare il precaching del file index.html provoca nel fetch sempre un riscontro positivo nel match della cache, per questo salviamo le request degli elementi di precache nella
lista precacheConfig.urls)
*/
function swInstall(event, isActiveOnStart, isPrecaching, precacheListConfig){
    activateOnStart(isActiveOnStart);
    if(isPrecaching){
        event.waitUntil(
            precacheListConfig.forEach(function (precacheConfig) { // Per ogni nome di cache specificato nel file di configurazione crea la cache e copia nella nuova cache creata gli assets statici designati.
                precaching(event, precacheConfig);
            })
        );
    }
}
/* Attiva il service worker non appena viene installato. */
function activateOnStart(isEnable){
    if(isEnable) {
        self.skipWaiting();  // previene waiting, significa che il service worker si "attiva" non appena ha finito l'installazione. Utilizzare solo se si vuole utilizzare il service worker fin dal primo loading page.
    }
}
/* Fa il precaching degli elementi specificati nella lista di precaching se 'isPrecaching' è settato a true, e inserisce le request di cui si è fatto il precaching nell'array urls */
function precaching(event, precacheConfig){
    return caches.open(precacheConfig.cacheName).then(function(cache){
        console.log('SW Install Event: 3. Service Worker ha aperto la cache'); // TEST
        cache.addAll(precacheConfig.precacheItems);
        cache.keys().then((keys) =>{
            precacheConfig.urls = keys;
        });
    });
}
