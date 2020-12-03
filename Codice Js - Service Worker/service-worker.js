/*
  SERVICE WORKER LIFECYCLE

  Installing ----> Activate -----> Idle <-----> Fetch
      |                            | ^
      |                            | |
      |                            | |
      v                            v |
    Error                       Terminated

*/
const _modules = {  // moduli da caricare nello script principale del service worker. NOTA: gli stessi moduli hanno al loro interno delle chiamate a moduli.
    install: '/assets/js/service-worker-modules/md_swInstall.js',
    activate: '/assets/js/service-worker-modules/md_swActivate.js',
    fetch: '/assets/js/service-worker-modules/md_swFetch.js',
    notification: '/assets/js/service-worker-modules/md_swNotification.js',
};

const _version = 1; // versione della cache, se si cambia la versione della cache, le cache con versione più vecchia vengono eliminate quando viene fatto l'update del SW (update avviene quando si fa una modifica nel file principale, il browser lo rileva automaticamente)

const _swSettings =
    {
        mainCache: 'cache_MAIN' + _version,
        cacheList: { // * Lista delle cache usate dal service worker.
            mainCache: 'cache_MAIN' + _version,
            postCache: 'cache_POSTrequest' + _version,
            getCache: 'cache_GETrequest' + _version,
            specialCache: 'cache_SPECIAL' + _version,
        },
        cacheWhiteList:[ // * Lista delle cache che si vuole preservare (quindi da non rimuovere) durante l'Update del service worker.
            'cache_MAIN' + _version,   // qui vengono inserite le richieste che non sono dei tipi specificati qui sotto.
            'cache_POSTrequest' + _version,    // qui vengono inserite le richieste di tipo POST.
            'cache_GETrequest' + _version, // qui vengono inserite le richieste di tipo GET.
            'cache_SPECIAL' + _version,    // qui vengono inseriti i file speciali di angular "main.js, vendor.js, polyfills.js, runtime.js, styles.js".
        ],
        isPrecaching: false,    // abilita o disabilita l'inserimento in cache di assets statici durante la fase di installazione del service worker.
        isFetch: true,  // abilita o disabilita la gestione degli eventi fetch da parte del service worker.
        activateOnStart : true, // abilita il service worker non appena viene caricata la pagina principale invece di aspettare il refresh della pagina.
        fetchOnStart: true,    // consente al service worker di poter intercettare le richieste (fetch) fin dal primo caricamento della pagina
        enableLazyLoading: false,   // INUTILIZZATO
        enableCachingLogic: false,  // abilita la logica di caching che ci permette di gestire le risorse in cache in base alle esigenze dell'app.  //  INUTILIZZATO
    };
const _precacheListConfig = [
    {
        cacheName: 'cache_MAIN' + _version,
        precacheItems: [
            // IMPORTANTE: utilizzare questa dichiarazione '/' per copiare il file 'index.html' nella cache e non come '/index.html'.
            // Altrimenti nel fetch quando si cerca di fare il match tra la risorsa richiesta e quella salvata in cache si riceverà una cache miss file,
            // in quanto nella cache il file index.html è salvato con url "http://localhost:4200/index.html" se si usa la dichiarazione index.html',
            // mentre nella request della pagina principale l'url compare sempre come "http://localhost:4200/" senza "index.html" alla fine.
            '/',    // IMPORTATE: potrebbe dare problemi nella fase di fetch, sembra che quando si fa check del match nella cache, se il file "index.html" è memorizzato in cache, si ottiene sempre un riscontro positivo con qualsiasi request.
            '/assets/js/service-worker-registration.js'
        ],
        urls: [],   // lista delle request dei precacheItems.
        // add other elements as you prefear.
    },
    // add other caches(objects) to the array.
];

// * -----------------------------------------------------EVENTS--------------------------------------------------- * \\

// ********************************************************************************************************************************************************* \\
// * EVENT INSTALL:
// * Evento che consente di effettuare il precaching, ovvero inserire in cache pagine e file statici del sito web prima di intercettarne le richieste.
// * ------------------------------------------------------------------------------------------------------------------------------------------------------
// * A registrazione completata del service worker, il browser ne tenta l’installazione richiamando l’evento install.
// * ------------------------------------------------------------------------------------------------------------------------------------------------------
// * Installazione avviene solo se il service worker viene considerato nuovo, e si verifica solo in due casi:
// * 1- Il sito non possiede attualmente alcun service worker.
// * 2- Esiste una reale differenza in termini di byte tra il nuovo service worker e quello precedentemente installato.
// * ------------------------------------------------------------------------------------------------------------------------------------------------------
// * The install event only fires when the service worker file is found to be new - either different to an existing service worker (byte-wise compared),
// * or the first service worker encountered for this page/site.
// * If there is already an active service worker, the new service worker will be installed in the background - but not made active until there are no pages still using the old service worker.
// * Il nuovo service worker diventerà operativo al prossimo caricamento di pagina, quando il vecchio service worker viene sostituito.
// * Solo un service worker (o una sola versione di service worker) per volta può essere eseguito nello stesso contesto temporale.
// * ------------------------------------------------------------------------------------------------------------------------------------------------------
// * self.skipWaiting() prevents the waiting, meaning the service worker activates as soon as it's finished installing.
// ********************************************************************************************************************************************************* \\
// * Evento Install * //
importScripts(_modules.install);
self.addEventListener('install', function(event){
    swInstall(event, _swSettings.activateOnStart, _swSettings.isPrecaching, _precacheListConfig);
});

// ********************************************************************************************************************************************************* \\
// * EVENT ACTIVATE (UPDATE SERVICE WORKER):
// * The activate event will fire every time you make connection to your service worker.
// * This is a good place to cache any extra (possibily dynamic) files, along with cleaning up old caches and things associated with the previous version of your service worker.
// * Dopo l'attivazione il service worker sarà in grado di effettuare fetching di risorse o restare in attesa di altri eventi.
// * ------------------------------------------------------------------------------------------------------------------------------------------------------
// * Once activated, the service worker controls all pages that load within its scope, and starts listening for events from those pages.
// * However, pages in your app that were loaded before the service worker activation will not be under service worker control.
// * The new service worker will only take over when you close and reopen your app, or if the service worker calls clients.claim().
// * Until then, requests from this page will not be intercepted by the new service worker.
// * This is intentional as a way to ensure consistency in your site.
// * --- IMPORTANTE:
// * --- Di DEFAULT il nuovo service worker diventa operativo al REFRESH della pagina o DOPO AVER RICHIAMATO IL METODO clients.claim().
// * --- Fino a quel momento le eventuali richieste non saranno intercettate.
// * Codice da eseguire su attivazione del service worker.
// * This event listener is a good place to clean up outdated caches

// * Dopo la fase di registrazione e installazione del service worker, si passa alla fase di attivazione del SW,
// * in questa fase possiamo gestire la cache:
// * Cancellando qualsiasi old caches in the install step,
// * and any old service worker, which keeps control of all the current pages, will suddenly stop being able to serve files from that cache.
// * Il seguente codice svolge due compiti:
// * 1. self.clients.claim() consente al service worker di poter intercettare le richieste (fetch) fin dal primo caricamento della pagina,
// *    piuttosto che attendere il refresh della pagina dopo la registrazione del service worker.
// * 2. Svuoto la cache, se la versione del service worker cambia.
// * ------------------------------------------------------------------------------------------------------------------------------------------------------
// * register the client at first load itself use "self.clients.claim()", consente al service worker di poter intercettare le richieste (fetch) fin dal primo caricamento della pagina (alcune richieste vengo perse, dipende da quanto il SW è veloce a installarsi).
// ********************************************************************************************************************************************************* \\
// * Evento Activate * //
importScripts(_modules.activate);
self.addEventListener('activate', function(event)
{
    console.log("SW Activate Event: 1. Service Worker Attivazione."); // TEST
    swActivate(event, _swSettings.fetchOnStart, _swSettings.cacheWhiteList);
});

// ********************************************************************************************************************************************************* \\
// * EVENT FETCH:
// * L'evento fetch permette al service worker di agire come framemwork tra l’applicazione web e la rete
// * Il service worker non utilizza cache a meno che non siamo noi a dirlo, quindi di default il comportamento nella fase di fetch delle risorse sarà quello nativo del browser.
// * Implementando l'evento fetch il service worker intercetta ogni richiesta HTTP del browser e risponde a quest’ultimo prendendo la risorsa dalla cache senza doverla scaricare dalla rete.
// IMPORTANTE: Clone the response. A response is a stream
// and because we want the browser to consume the response
// as well as the cache consuming the response, we need
// to clone it so we have two streams.
// ********************************************************************************************************************************************************* \\
// * Evento Fetch * //
/*importScripts(_modules.fetch);
self.addEventListener('fetch', function (event) {
    swFetch(event, _swSettings.isFetch);
});*/
importScripts(_modules.fetch);
self.addEventListener('fetch', function (event) {
    swFetch(event, _swSettings.isFetch);
});




// PUSH NOTIFICATION EVENTS - IN SVILUPPO //

// * Evento notification dismissed by user * //
importScripts(_modules.notification);
self.addEventListener('notificationclose', function(event) {
    notificationClosed(event)
});

// * Evento clicks on the notification * //
self.addEventListener('notificationclick', function(event) {
    var notification = event.notification;
    var primaryKey = notification.data.primaryKey;
    var action = event.action;

    if (action === 'close') {
        notification.close();
    } else {
        clients.openWindow('http://www.example.com');
        notification.close();
    }
});
