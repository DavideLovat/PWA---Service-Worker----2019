importScripts('/assets/js/service-worker-modules/md_swCacheLogic.js');
const _fetchSetting = {
    formatsNotAllowed: [    // formati non permessi che non devono essere inseriti in cache // INUTILIZZATO
        "audio",
        //"audioworklet",
        //"document",
        //"embed",
        //"font",
        "image",
        //"manifest",
        //"object",
        //"paintworklet",
        //"report",
        //"script",
        //"serviceworker",
        //"sharedworker",
        //"style",
        //"track",
        "video",
        //"worker",
        //"xslt",
    ],
    methodsList: ['GET','HEAD','POST','PUT','DELETE','CONNECT','OPTIONS','TRACE','PATCH'],  // metodi di cui si può fare il fetch // INUTILIZZATO
    cacheList: { // * Lista delle cache // UTILIZZO SOLO LA 'mainCache' poichè ho riscontrato dei comportamenti anomali nella cache.
        mainCache: 'cache_MAIN' + _version,
        postCache: 'cache_POSTrequest' + _version,
        getCache: 'cache_GETrequest' + _version,
        specialCache: 'cache_SPECIAL' + _version,
    },
    specialList: {  // Lista dei file di Angular che vanno inseriti in 'cache_SPECIAL'
        toCache: [
            'main',
            'runtime',
            'polyfills',
            'styles',
            'vendor',
        ],
        inCache:[],
    },
    isSpecialCache: false,  // abilita o disabilita l'inserimento dei file speciali di angular nella cache // INUTILIZZATO
    cacheKey: 'cacheKey',   // ATTRIBUTO DA INSERITO NELL'HEADER DI UNA RICHIESTA CHE DEVE ESSERE SALVATA NELLA CACHE.
    rejectList: ['/sockjs-node/info',], // lista delle richieste che non devono essere gestite dall'evento fetch // INUTILIZZATO
};
// _logicManagerSettings è utilizzato solo dalla funzione di Alex per la gestione della logica di cache.
const _logicManagerSettings = { // opzioni per la creazione della funzione di gestione della logica di cache. // FUNZIONA SOLO SE SI SETTA 'isActive': true. In fase di SVILUPPO.
    isActive: false,    // la richiesta nella fetch viene gestita con la logica di caching implementata da Alessandro.
    /*
    'functionLogic' è un'oggetto funzione, contiene un riferimento alla funzione per la gestione della logica della cache, inizialmente è settata a null.
    il sw deve fare una chiamata ad urlLogic per ricevere indietro la funzione (parameters e body stored in un json) che dice al sw come gestire le risorse in cache.
    Dalla risposta alla richiesta "analyze Url" creiamo una funzione che viene assegnata alla variabile functionLogic (vedi la gestione dell'event fetch in sw).
    */
    functionLogic: null,
    urlLogic: 'http://localhost:5000/',
    updateDictionary: {}, // Dizionario formato dalla coppia (key,value) con (key = "nome url request", value = boolean che indica se la risorsa in cache deve essere aggiornata ).
};
// * (CacheFirst) //
/* ---------------------------------------------------------------------------------------------------------------------
Strategia di base.
Offline web apps will rely heavily on the cache, a cache first is the best option.
If there is a Response in the cache, the Request will be fulfilled using the cached response and the network will not be used at all.
If there isn't a cached response, the Request will be fulfilled by a network request and the response will be cached so that the next request is served directly from the cache.
/* ---------------------------------------------------------------------------------------------------------------------*/
/*
Funzione richiamata nell'EVENTO FETCH del service worker.
Questa è l'unica funzione utilizzata nell'evento fetch tutti gli altri metodi sono impiegati per gestire la logica di fetch e di caching.
*/
/*
IMPORTANTE:
    Questo codice era stato implementato per gestire cache multiple attualmente utilizzo una sola cache 'cache_Main' in quanto ho riscontrato uno stupido problema:
    infatti ho utilizzo 'caches.match' che mi permette di fare il match  nelle cache senza aprirle chiamandole per nome (cioè non faccio caches.open(NOMECACHE).then(cache => {//fai la tua magia}).
    Le risorse memorizzate utilizzando la CACHE API sono permanenti ma ho riscontrato un problema nell'utilizzo del metodo 'caches.match'.
    Infatti sembra che quando si chiude il client e si riapre la sessione dopo qualche ora il SW è ancora presente e anche la memoria occupata, ma i nomi delle cache e le risorse non ci sono.
    Fare una chiamata caches.match() non da alcun HIT. Infatti caches.match da riscontro negativo, nonstante con google dev tools si vede che la cache non è vuota ma c'è dello spazio occupato.
    È quindi necessario fare una chiamata alla cache per nome altrimenti non è possibile referenziare le risorse memorizzate nella cache.

    Se si vogliono implementare le cache multiple bisogna modificare il codice in modo che si aprano tutte le cache e si controllino per il match altrimenti non funziona niente alameno questo è
    quello che ho riscontrato io.

    Se vuoi implementare le cache multiple devi anche modificare la funzione 'selectCache(request, cacheList)' nel modulo 'md_swCacheLogic.js' rimuovendo il codice commentato.
*/
/*
CODICE:
    1. Controlla se la risorsa richiesta dal client è in cache. Se c'è un match con le risorse momorizzate nella cache (o nelle cache) allora ritorna la risposta senza fare alcuna richiesta al network.
    2. Se la risorsa non è nella cache allora fai una fetch. (NOTA ci sono alcune fetch che lanciano un errore (vedi spiegazione sotto) e sono gestite ritornando una risposta nulla, se non si gestiscono il service worker si bloccherebbe)
    2.1 Esegui il codice di King David OPPURE Esegui il codice di Alex il Macedone che non è stato completato.
    3. Controlla se la richiesta rispetta uno dei tre parametri richiesti:
        1. la richiesta ha l'attributo chiave 'cacheKey' nell'header e quindi deve essere messa in cache
        2. la richiesta è un file angular cioè (main, polyfills, ecc.. )
        3. la richiesta è una risorsa inserita in cache nella fase di precaching (installazione del SW)
    4. se riscontro positivo nel punto 3 : metti la coppia (request, response) nella cache.
    5. ritorna la risposta al client in ogni caso.

    ERRORI IN UNA RICHIESTA FETCH:
    Gli errori della fetch devono (e vengono) gestiti per evitare che il service worker si blocchi e faccia il fetch anche delle altre richieste
    (non sono sicuro che si blocchi visto che google dev tools mi ha dato dei problemi ingannandomi XD, comunque le fetch che danno errore vengono gestite per sicurezza).
    Il metodo respondWith() di un'evento 'FetchEvent' per ragioni di sicurezza segue delle regole globali che si possono trovare
    a questo link: https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/respondWith
    Il problema è il seguente:
    In generale alcune 'request' hanno un valore detto 'mode' che può assumere i seguenti valori: same-origin, no-cors, cors, navigate, manual, ecc.
    https://developer.mozilla.org/en-US/docs/Web/API/Request/mode
    Quando la 'mode' di una 'request' e il ''type' di una response sono impostati come segue:
    (req, resp) = (no-cors, opaque); (manual, opaquedirect); (same-origin, cors)
    il metodo 'respondWith' impone dei vincoli nella gestione della richiesta.
    Sono tre i problemi che sorgono:
        -You cannot return Response objects of type "cors" if the fetchEvent.request object's mode is "same-origin".
            ciò significa che se ci troviamo una request con mode settata a "same-origin" di tipo "cors", e facciamo una fetch non riusciamo a ottenere una risposta, e un'errore viene lanciato
            dallo script. Questo comporta la perdita della risposta. Tradotto ci troviamo senza il file da restituire al client.
            Inoltre siccome 'respondWith' prevents the browser's default fetch handling non sono in grado di aggirare il problema lasciando che sia il browser a gestire la fetch in quanto
            finché non richiedo la risorsa con un fetch e ottengo la risposta non posso controllare anche il valore 'type' per sapere se è settato a "cors".
        -You can only return Response objects of type "opaqueredirect" if the fetchEvent.request object's mode is "manual".
        -You can only return Response objects of type "opaque" if the fetchEvent.request object's mode is "no-cors".  This prevents the leaking of private data.
            https://blog.fullstacktraining.com/what-is-an-opaque-response/
            - the status is "0" (and not a regular HTTP status code - like 200)
            - the statusText is empty
            - the headers object is also empty
            - It's important to remember that the Cache Storage API's add() and addAll() methods only allow to cache results where the status code is in the 2xx range
              so caching an opaque response fails.
*/

function swFetch(event, isFetch){
    if(isFetch && 'caches' in self)
    {
        console.log("request: ", event.request.url);
        event.respondWith(caches.open(_fetchSetting.cacheList.mainCache).then((cache) => {
            return cache.match(getRequestToMatch(event.request)).then((cacheResponse) => {
                if (cacheResponse && notLogicManagerOrUpdate()) {
                    console.log("HIT: ", event.request.url);
                    return cacheResponse;
                } else {
                    console.log("MISS: ", event.request.url);
                    return networkResponseCaching(event.request);
                }
            })
        }));
    }
    else
    {
        if(!isFetch)
            console.error("service worker fetch disabled in settings");
        if(!('caches' in self))
            console.error("browser doesn't support cache API");
    }

}

/*
Impiegata dalla logica di Caching implementata da Alex. Controlla se la logica di caching è stata abilitata o se si deve fare l'update delle risorse nel dizionario.
Controllo se la risorsa della request non richiede di essere aggiornata(cioè non è presente nell'"updateDictionary" come chiave).
*/
function notLogicManagerOrUpdate(){
    return (!_logicManagerSettings.isActive || (_logicManagerSettings.isActive && !_logicManagerSettings.updateDictionary[cacheResponse.url]));
}
/*

*/
function isPrecacheItem(request, isPrecaching){
    if(isPrecaching){
        for(cache in _precacheListConfig){
            for(requestKey in _precacheListConfig[cache].urls){
                if(_precacheListConfig[cache].urls[requestKey].url === request.url){
                    return true;
                }
            }
        }
    }
    return false;
}
// INUTILIZZATA dovrebbe essere utilizzata in concomitanza con la rejectList per scartare alcune richieste ma per ora non serve.
function isServeRequestRejected(request){
    return false;
}
// INUTILIZZATA gestisce i metodi GET , POST ecc.
function isMethodAllowed(method, methodsList){
    return methodsList.includes(method);
}
// controlla se nell'header della richiesta c'è un valore chiave. se presente la risorsa deve essere messa in cache.
function isRequestKey(request){
    return request.headers.get(_fetchSetting.cacheKey)
}
// INUTILIZZATA serve a bloccare le risorse di tipo Immagine video audio ecc. in base a quello che è stato specificato nella lista.
function isFormatAllowed(format, typeNotAllowedList){
    return !typeNotAllowedList.includes(format);
}
/*
    serve a gestire le richieste con metodo POST da tutte le altre. Infatti la API Cache non è in grado di memorizzare richieste POST e
    dobbiamo memorizzare solo l'url, inoltre siccome non possiamo accedere al Payload nell'header di una request con metodo POST utilizziamo
    una chiave per identificare la risorsa. bisogna memorizzare l'url + la chiave nella cache sotto forma di stringa così siamo in grado di effettuare una ricerca nella
    cache che ci garantisca un match in quanto non c'è altro modo per controllare i parametri della richiesta una volta messi nella cache.
    Inoltre la chiave ci serve anche perché i valori nel payload di una POST cambiano ad ogni richiesta quindi non potremmo fare affidamento su questi nemmeno se accessibili.
*/
function getRequestToMatch(request){
    return request.method === 'POST'? makePOSTrequest(request): request;

}
/*
    Se una request produce una MISS in cache allora esegue questo blocco di codice.
    - faccio una chiamata fetch al network inviando la request
    - quando ricevo la response controllo che sia valida, cioè status == 200 diversa da type = error , la risposta non è nulla
    - se è valida, inseriscila in cache
    - se non è valida non fa nulla
    - ritorna la risposta al client in ogni caso.

    _logicManagerSettings.isActive serve a gestire il caso della logica di Alex che è da implementare.
*/
async function networkResponseCaching(request){
    let response = null;
    try {
        response = await fetch(request);
    }catch(error){
        //throw Error('errore fetch');
        console.error('errore fetch: ', error, request);
        let init = { "status" : 200 , "statusText" : "I am a custom service worker response!" };
        return new Response(null, init);
    }
    if(isResponseValid(response.clone())){
        if(!_logicManagerSettings.isActive){
            if(isRequestKey(request) || (isSpecialRequest(request, _fetchSetting.specialList) || isPrecacheItem(request, _swSettings.isPrecaching))) {
                console.log("ADD: ", response);
                cacheManager(request, response.clone(), _cacheSettings.operations.addToCache); //funzione caricata dal modulo md_cacheLogic.
            }
        }else if(_logicManagerSettings.isActive){
            response =  await logicManager(request, _logicManagerSettings.functionLogic,
                _logicManagerSettings.urlLogic,
                _logicManagerSettings.updateDictionary,
                response.clone());
        }
    }
    return response;
}

function isResponseValid(response){
    return response && isResponseStatus(response.status) && isResponseType(response.type);
    //return response && response.status === 200 && response.type === 'basic';
}
function isResponseStatus(status){
    return status >= 200 && status < 300 ;  // API Cache accetta solo risposte con status 2xx range
    //return status === 200;
    //return status !== 404;
}
function isResponseType(type){
    return type !== 'error'

}
