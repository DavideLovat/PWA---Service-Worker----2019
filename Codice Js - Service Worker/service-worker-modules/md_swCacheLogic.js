importScripts('/assets/js/service-worker-modules/md_swSpecialRequest.js');
const _cacheSettings = {
    operations: {
        addToCache: 'add',
        deleteFromCache: 'delete',
    },
};
/*
    1. Apre la cache chiamandola per nome.
    2. Avvia la logica di gestione della cache: attualmente di default aggiunge semplicemente l'elemento in cache per ogni richiesta.
*/
async function cacheManager(request,response, operation){
    let cache = null;
    try{
     cache = await caches.open(selectCache(request, _fetchSetting.cacheList));
    } catch(error){
        console.error("errore apertura cache ", error, "\n", request);
        return;
    }
    try{
    storeInCacheLogic(cache, request, response.clone(), operation);
    } catch(error){
        console.error("errore in logica di store della cache: ", error);
    }
}
/*
Seleziona la cache su cui effettuare le operazioni desiderate.
Attualmente il codice non gestisce le cache multiple infatti ritorna sempre mainCache.
Ci sono 4 cache nella gesione delle cache multiple:
1. cache speciale dove vengono inseriti i file di angular
2. cache post e get per le richieste con metodo post e get
3. cache main che è quella di default, qui vengono inseriti tutti i file che non rientrano nei primi tre casi.
*/
function selectCache(request, cacheList){
    if(isSpecialRequest(request, _fetchSetting.specialList)){
        return cacheList.mainCache;
        //return cacheList.specialCache;
    }
    else if(request.method === 'POST'){
        return cacheList.mainCache;
        //return cacheList.postCache;
    }
    else if(request.method === 'GET'){
        return cacheList.mainCache;
        //return cacheList.getCache;
    }
    else {
        return cacheList.mainCache;
    }
}
/*
in base al valore dell'argomento passata a 'operation'
1- aggiunge la risorsa (req, response) in cache
2 - rimuove la risorsa (req, response) dalla cache
....
*/
function storeInCacheLogic(cache, request, response, operation){
    switch(operation){
        case _cacheSettings.operations.addToCache:
            addToCache(cache, request, response.clone());
            break;
        case _cacheSettings.operations.deleteFromCache:
            deleteFromCache(cache, request);
            break;
        default:
            addToCache(cache, request, response.clone());
            break;
    }
}
/* aggiunge risorsa in cache */
function addToCache(cache, request, response){
    let storeRequest = request;
    if (request.method === 'POST') {
        storeRequest = makePOSTrequest(request);
    }
    cache.put(storeRequest, response);
}
/* crea una request di tipo POST da inserire nella cache in quanto la CACHE API non è in grado di inserire direttamente una request con metodo POST in memoria*/
function makePOSTrequest(request) {
    let key = request.headers.get(_fetchSetting.cacheKey);
    if ( key && key !== '' && !isSpecialRequest(request, _fetchSetting.specialList)){
        return request.url + '?' + key;
    }
    return request.url;
}
/*
    rimuove la risorsa dalla cache
*/
function deleteFromCache(cache,request){
    let removeRequest = request;
    if (request.method === 'POST') {
        removeRequest = makePOSTrequest(request);
    }
    cache.delete(removeRequest);
}

// BUILD LOGIC FUNCTION - FUNZIONI DI ALEX

async function logicManager(request, functionLogic, urlLogic, updateDictionary, response){
    let funLogicManager = functionLogic;
    let policy = null;
    let logicConstructor = await buildLogicConstructor(functionLogic, urlLogic, response.clone());
    if( logicConstructor ){
        funLogicManager = new Function (logicConstructor.params, logicConstructor.body);
    }
    /*
        Se ad "funLogicManager" è stata assegnata la funzione di gestione della logica di caching (quindi non è nulla),
        allora ricaviamo la politica di gestione della risorsa contenuta in "response" passando la "response" alla funzione appena creata.
        NOTA: attualmente (18-10-2019) la politica di gestione è un semplice oggetto di testing con i seguenti attributi:
        policy:
        {
            cache:  boolean,    // se true la risorsa va inserita in cache.
            update: boolean,    // se true la risorsa è in cache e va aggiornata.
        }
        VEDI FUNZION DI TESTING analyze() qui sotto.
    */
    if(funLogicManager) {
        _logicManagerSettings.functionLogic = funLogicManger;
        policy = funLogicManager(response.clone());
    }
    let responseToCache = null;
    /*
        se esiste una politica di gestione della response allora:
        - aggiorna l'elemento con chiave "response.url" nel dizionario memorizzando come valore dell'elemento la "policy.update", che sarà true o false.
        - se la "policy.cache" è settata a true allora la risorsa deve essere clonata e successivamente inserita in cache.
    */
    if(policy){
        const responseToCheck = response.clone();
        updateDictionary[responseToCheck.url] = policy.update;
        if(policy.cache){
            responseToCache = responseToCheck.clone();
        }
    }
    // Controllo se la risposta è da inserire in cache e la inserisce finalmente nella cache.
    if(responseToCache!=null){
        cacheManager(request, response.clone(), _cacheSettings.operations.addToCache);
    }
    return response;
}
/*
    Controlliamo l'url della response ritornato dal server, se l'url della response è diverso dall'"urlLogic", cioè da 'http://localhost:5000/function',
    significa che il client ha richiesto una risorsa che deve essere sottoposta al controllo della logica di caching,
    cioè dobbiamo interpellare il server che restituirà al sw la funzione che si occupa della logica di caching di tutte le risorse/ assets statici.
    Quindi il sw fa una richiesta fetch all'indirizzo "urlLogic": 'http://localhost:5000/function'.
    La risposta a questa richiesta sarà un oggetto json che contiene i parametri e il corpo di una funzione ,
    che verrà salvata come funzione nella variabile "functionLogic" per la gestione dei file in cache,
    che d'ora in avanti si occuperà della gestione dei file da inserire e eliminare dalla cache.
*/
/*
    Se la funzione functionLogic non esiste
    oppure
    l'url della response non contiene la chiave di riconoscimento 'function'
    allora
    il sw fa una richiesta al server all'indirizzo 'http://localhost:5000/function' che gli ritorna la funzione sottoforma di json,
    con il valore ritornato dalla chiamata inizializziamo analyze creando la nuova funzione.
*/
async function buildLogicConstructor (functionLogic, urlLogic, response){
    if( !functionLogic || response.url.split('/').indexOf('function')== -1){
        return await fetch(urlLogic).then(response => response.json());
        //return f2Obj(analyze);
    }
    return null;
}


/* test functions for build logic constructor - UTILIZZATE PER TESTAR SE LA COSTRUZIONE DI UNA FUNZIONE è VALIDA IN ASSENZA DI UN SERVER CHE SERVA LA RICHIESTA ALL'URL 'http://localhost:5000/function'*/

// funzione analyze è la funzione che permette di decidere la logica di caching per le risorse.
// deve essere passata dal server al client per decidere se la risorsa richiesta deve essere: inserita in cache/ fatto l'update.
// attualmente la passo direttamente nella funzione logicManager per testare se funziona anche se dovrebbe essere passata dal server (vedi progetto di Alex, file 'server.js')
function analyze(response){
    return {
        cache: true,
        update: false
    }
}

// funzione che trasforma la funzione analyze in un oggetto da inviare(ritornare) al client (service worker) nella fase di fetch.
function f2Obj(f){
    stringf = f.toString(); //trasformo la funzione in una stringa.
    // spezzo la stringa e prendo i valori dei parametri e il corpo della funzione.
    // Il metodo map() crea un nuovo array con i risultati della chiamata di una funzione fornita su ogni elemento dell'array chiamante.
    // il metodo trim() rimuove gli spazi bianchi da entrambi i lati di una stringa.
    let obj =  {
        params: stringf.slice(stringf.indexOf('(')+1, stringf.indexOf(')')).split(',').map(element => {
            return element.trim();
        }),
        body: stringf.slice(stringf.indexOf('{')+1, stringf.lastIndexOf('}')).trim()
    };
    console.log(obj);
    return obj;
}

