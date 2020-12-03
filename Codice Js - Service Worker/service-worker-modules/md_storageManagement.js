// * CACHE STORAGE MANAGER: LOCAL DEVICE CACHE STORAGE*//

// * ------------------------------------------------------------------------------------------------------------------------------------------------------
// * INFO
/* * ------------------------------------------------------------------------------------------------------------------------------------------------------
    COSA FA IL SEGUENTE CODICE:
    Il seguente codice calcola lo spazio di memoria occupato a disposizione della PWA. Le funzioni a nostra disposizione ci permettono di fare una
    STIMA approssimativa dei dati usati e spazio totale della memoria messo a disposizione dal browser alla nostra applicazione.
    ------------------------------------------------------------------------------------------------------------------------
    API IMPIEGATE: CACHE API, INDEX DB, STORAGE ESTIMATE
    url: https://developers.google.com/web/fundamentals/instant-and-offline/web-storage
    Some storage APIs are synchronous in the sense that storage or retrieval requests block the currently active thread until the request is completed.
    This is particularly onerous in web browsers, where the storage request is sharing the main thread with the UI.
    For efficiency and performance reasons, asynchronous storage APIs are to be preferred.

    QUALI USARE?
    1.  For offline storage, use the Cache API.
        This API is available in any browser that supports Service Worker technology necessary for creating offline apps.
        The Cache API is ideal for storing resources associated with a known URL.

    2.  For storing application state and user-generated content, use IndexedDB.
        This enables users to work offline in more browsers than just those that support the Cache API.

    3.  For global byte stream storage: use a Cloud Storage service

    NOTA: le APIs "Cache API" e "IndexDB API" "Storage Estimate" non sono compatibili con tutti i browser. Verificare la compatibilità con altri browser.
    ------------------------------------------------------------------------------------------------------------------------
    HOW MUCH CAN I STORE?
      url: "https://developers.google.com/web/fundamentals/instant-and-offline/web-storage/offline-for-pwa"
      Different browsers allow different amounts of offline storage.

      - Chrome	<6% of free space

      NOTA: Opening a web app in Chrome's Incognito mode imposes a special restriction on storage that doesn't apply to normal browsing contexts:
        there's a quota limit of around 100 megabytes, regardless of free space available on your device.

      - Firefox	<10% of free space
      - Mobile Safari	<50MB
      - IE10	<250MB
      - Edge	Dependent on volume size

      -Desktop Safari NaN


      In Chrome and Opera, your storage is per origin not per API.

      NOTA: a common source of unexpectedly high quota usage is due to "runtime caching" of "opaque responses",
            which is to say, cross-origin responses to requests made without CORS enabled.
            In Chrome, for instance, even an opaque response of a few kilobytes will end up contributing around 7 megabytes towards your quota usage.
    ------------------------------------------------------------------------------------------------------------------------
    COME PROCEDERE:
      Suddividere i dati da memorizzare in cache di una (progressive) web application (PWA) in due categorie:
      - "core data" necessari a caricare la nostra web application.
      - "user data" che sono dati significativi di cui necessita l'utente per interagire con la nostra PWA dopo che l'applicazione è stata caricata.
    ------------------------------------------------------------------------------------------------------------------------
    WHERE SHOULD OFFLINE DATA BE STORED?
    url: https://developers.google.com/web/ilt/pwa/live-data-in-the-service-worker
    A general guideline for data storage is that:
    1.  URL addressable resources should be stored with the Cache interface,
        for example HTML, CSS, and JS files should be stored in the cache.

    2.  Other data should be stored with IndexedDB,
        JSON data should be stored in IndexedDB.

    IndexedDB and the Cache interface are both asynchronous and accessible in service workers, web workers, and the window interface.
    IndexedDB is widely supported, and the Cache interface is supported in Chrome, Firefox, Opera, and Samsung Internet.
    ------------------------------------------------------------------------------------------------------------------------
    HOW TO STORE DATA OFFLINE: url resource "https://developers.google.com/web/fundamentals/instant-and-offline/web-storage/offline-for-pwa"
      1. for the network resources necessary to load your app while offline, use the "Cache API".
      2. for all other data, use "IndexedDB"
      Both APIs are asynchronous.
        IndexedDB is event based.
        Cache API is Promise based.
        They both work with "web workers", "window", "service workers".
    ------------------------------------------------------------------------------------------------------------------------
    HOW CAN WE TELL HOW MUCH STORAGE SPACE THE APP IS USING?
      "Quota Management API" and "Storage Quota Estimate API" lets us query for the size of storage space currently used and how much is available to the application.
    ------------------------------------------------------------------------------------------------------------------------
    HOW DO I MAKE MY STORAGE PERSISTENT?
    the Storage spec defines two different modes for storage for a given domain:
    1. “best effort”
    2. “persistent”

    “best effort”:
       The default mode is “best effort”.
       Storage for a domain that is “best effort” (aka “not persistent”) can be cleared automatically, without interrupting or asking the user.

    “persistent”:
       Data will not be automatically cleared.
       (If the system is still under storage pressure after clearing all non-persistent data, the user will need to manually clear any remaining persistent storage.)
    ------------------------------------------------------------------------------------------------------------------------*/

// * ------------------------------------------------------------------------------------------------------------------------------------------------------
// * DICHIARAZIONE E INIZIALIZZAZIONE DI VARIABILI
/* * ------------------------------------------------------------------------------------------------------------------------------------------------------*/

var _pendingResourceList = []; // lista degli asset statici che non è stato possibile inserire in cache per mancanza di spazio in memoria.

const _storagePerBrowser = [ // lista delle diverse quantità di spazio allocabile da diversi tipi di browser.
  chrome = {
    percentage: 6,
    mib: NaN,
  },
  chrome_incognito = {
    percentage: NaN,
    mib: 100,
  },
  firefox = {
    percentage: 10,
    mib: NaN,
  },
  mobile_safari = {
    percentage: NaN,
    mib: 50,
  },
  IE10 = {
    percentage: NaN,
    mib: 250,
  },
  Edge = {
    percentage: NaN,
    mib: NaN,
  },
];

// Test variables
const _cacheName = "cache_v1";
const _resourcesInCache = [
  "http://localhost:4200/",
  "http://localhost:4200/assets/staticAssets/fileToCache.html",
]
const _newResource = {
  url: "http://localhost:4200/assets/staticAssets/newResource.html",
  bytes: 1000,
};

// * ------------------------------------------------------------------------------------------------------------------------------------------------------
// * BODY: inserire qui il codice da eseguire
// * ------------------------------------------------------------------------------------------------------------------------------------------------------
MainTest();

// Test functions
async function MainTest(){
  await test_enablePersistentStorage();
  await test_addResourcesToCache(_cacheName, _resourcesInCache);
  test_getPWAStorageInfo();

  console.log("io sono l'ultimo");
}
async function test_addResourcesToCache(cacheName, resources){
  await caches.open(cacheName).then(async function(cache) {
    await cache.addAll(resources).then(function(response){
      console.log(`le risorse ${resources} sono state aggiunte alla cache`);
    });
    console.log("io vengo dopo di te");
  });
}
async function test_enablePersistentStorage(){
  if(await isStoragePersisted()){ // controlla se la memorizzazione è persistente in caso negativo deve essere attivata.
    console.log("WW-STORAGE-MANAGEMENT: Storage is successfully persisted.");
  }
  else {  // se non è attivo attiviamo pesistent storage.
    console.log("WW-STORAGE-MANAGEMENT: Storage is not persisted.");
    console.log("WW-STORAGE-MANAGEMENT: Trying to persist..:");
    if(await persistStorage()){ // attivazione della memoria persistente (può anche fallire nel caso il browser non riconosca questa funzionalità js.
      console.log("WW-STORAGE-MANAGEMENT: We successfully turned the storage to be persisted.");
    } else {
      console.log("WW-STORAGE-MANAGEMENT: Failed to make storage persisted");
    }
  }
}
function test_storageEstimateWrapper(){
  // Se il browser corrente supporta l'API Cache Storage esegui questo
  if(hasCacheAPI())
    return estimateCacheStorage('CacheAPI');
  // Se il browser non supporta Cache Storage e Storage Quota utilizziamo due caratteristiche più vecchie ma che garantisce compatibilità.
  if(hasWebKitAPI())
    return estimateCacheStorage('WebKitAPI');
  // se il browser supporta l'API Storage Quota ma non Cache Storage usiamo questo
  if(hasStorageQuotaAPI())
    return estimateCacheStorage('StorageQuotaAPI');
  // If we can't estimate the values, return a Promise that resolves with NaN.
  return estimateCacheStorage();
}

function test_getPWAStorageInfo(){
  storageEstimateWrapper().then(function(PWAstorageInfo){ // ritorna la stima dello spazio utilizzato e lo spazio totale a disposizione della PWA.
    const PWAstorageInfoMib = { // trasformo i bytes di spazio occupato e spazio totale libero in Megabytes e ottengo la percentuale di spazio occupata dall'applicazione.
      usage: bytesToMib(PWAstorageInfo.usage),
      quota: bytesToMib(PWAstorageInfo.quota),
    };
    console.log(`Using ${PWAstorageInfo.usage} bytes out of ${PWAstorageInfo.quota} bytes.`);  // TEST CODE.
    console.log(`Using ${bytesToMib(PWAstorageInfoMib.usage)} Meagabytes out of ${bytesToMib(PWAstorageInfoMib.quota)} Megabytes.`); // TEST CODE.
    return PWAstorageInfo;
  });
}

// * ------------------------------------------------------------------------------------------------------------------------------------------------------
// * CACHE STORAGE FUNCTIONS
// * ------------------------------------------------------------------------------------------------------------------------------------------------------

/* ---------------------------------------------------------------------------------------------------------------------*/
/* Initialize Cache Manger
/* ---------------------------------------------------------------------------------------------------------------------*/
function InitializeCacheManager(){
  try{
    if(isCacheStorageAvailable() && isWebStorageAvailable()){ // check if Cache API and Web Storage API are availabe inside the browser.
      enablePersistentStorage();  // abilita la memorizzazione permanente dei dati in cache se possibile.
    }
    else {
      console.log("non posso accedere alla cache perchè non è presente l'API Cache e/o l'API Web Storage.");
    }
  }
  catch(error){
    console.error('error inside function HandleCache() in web-worker-storage-management.js, unknown error: ',error);
  }
}

function isWebStorageAvailable(){
  return 'storage' in navigator;
}

function isCacheStorageAvailable(){
  return 'caches' in self;
}

/* ---------------------------------------------------------------------------------------------------------------------*/
/* Add New Resource To Cache add a resource in cache if there is free space available.
/* ---------------------------------------------------------------------------------------------------------------------*/
async function addNewResourceToCache(cacheName, resource, resourceSizeBytes){
  if(isResourceFreeSpaceAvailable(cacheName, resource, resourceSizeBytes)){ // SE c'è spazio per la risorsa in cache...
    await caches.open(cacheName).then(function(cache) {
      cache.add(resource);  // aggiunge la risorsa in cache.
    });
  }
  else{ // SE non c'è spazio per la risorsa in cache...
    console.log("bollito, non c'è abbastanza spazio nella cache e non è stato possibile liberare spazio");
  }
}
/* ---------------------------------------------------------------------------------------------------------------------*/
/* Check Cache Free Space for the resource that must be added in cache.
/* ---------------------------------------------------------------------------------------------------------------------*/
function isResourceFreeSpaceAvailable(cacheName, resource, amountOfSpaceNeeded){
  let putInCache = false;
  let storageInfo = getPWAStorageInfo();

  if(isStorageInfoDefined(storageInfo)){  // se attributi usage e quota diversi da NaN.
    if(!(putInCache = hasFreeSpace(storageInfo, amountOfSpaceNeeded))){ // SE c'è spazio per la risorsa...
      let hasFreeUpSpace = freeUpSpace(cacheName); // libera spazio dalla cache se possibile (priorità, tempo, utilizzo).
      if(!hasFreeUpSpace) // SE non riesco a liberare spazio per la risorsa...
        addToPendingResourceList(cacheName, resource, amountOfSpaceNeeded); // aggiuni risorsa alla pending list.
    }
  }
  return putInCache;
}
/* ---------------------------------------------------------------------------------------------------------------------*/
/* Has Free Space.
/* ---------------------------------------------------------------------------------------------------------------------*/
function hasFreeSpace(storageInfo, amountOfSpaceNeeded) {
  let freeSpace = getFreeSpace(storageInfo); // spazio libero per la PWA
  return freeSpace >= amountOfSpaceNeeded;
}
/* ---------------------------------------------------------------------------------------------------------------------*/
/* Get Free Space.
/* ---------------------------------------------------------------------------------------------------------------------*/
function getFreeSpace(storageInfo) {
  return storageInfo.quota - storageInfo.usage; // PWA space - PWA usedSpace
}
/* ---------------------------------------------------------------------------------------------------------------------*/
/* Is PWA Storage Info Defined
/* ---------------------------------------------------------------------------------------------------------------------*/
function isStorageInfoDefined(storageInfo){
  return storageInfo.usage != NaN && storageInfo.quota != NaN;
}
/* ---------------------------------------------------------------------------------------------------------------------*/
/* Free Up Space free space in the cache if possible
/* ---------------------------------------------------------------------------------------------------------------------*/
async function freeUpSpace(cacheName){
  return await caches.open(cacheName).then(async function(cache){
    return await cache.keys().then(function(assets){
      let response = handleAssetsInCache(cache, assets);
      return response;
    });
  });
}
/* ---------------------------------------------------------------------------------------------------------------------*/
/* Handle Assets In Cache
/* ---------------------------------------------------------------------------------------------------------------------*/
async function handleAssetsInCache(cache, assets){
  // logica di gestione degli assets in cache,
  // decide quali elementi rimuovere dalla cache (priorità, tempo, utilizzo)
  // e se rimuoverli.
  await cache.removeAll(assets);
}
/* ---------------------------------------------------------------------------------------------------------------------*/
/* Add To Pending Resource List
/* ---------------------------------------------------------------------------------------------------------------------*/
function addToPendingResourceList(cacheName, resource, amountOfSpaceNeeded){
  _pendingResourceList.push(
    {
      cacheName: cacheName,
      resource: resource,
      resourceSize: amountOfSpaceNeeded,
    }
  );
}
/* ---------------------------------------------------------------------------------------------------------------------*/
/* Remove From Pending Resource List
/* ---------------------------------------------------------------------------------------------------------------------*/
function removeFromPendingResourceList(cacheName, resource, amountOfSpaceNeeded){
  _pendingResourceList.splice(
    {
      cacheName: cacheName,
      resource: resource,
      resourceSize: amountOfSpaceNeeded,
    }
  );
}
/* ---------------------------------------------------------------------------------------------------------------------*/
/* Check Pending Resource List
/* ---------------------------------------------------------------------------------------------------------------------*/
function checkPendingResourceList(){
  // ogni tot secondi controlla cerca nuovamente di inserire gli elementi in cache.
}
/* ---------------------------------------------------------------------------------------------------------------------*/
/* Enable Persistent Storage for your PWA in the device memory. (ONLY IN HTTPS)
/* ---------------------------------------------------------------------------------------------------------------------*/
function enablePersistentStorage(){
  if(isStoragePersisted()){ // controlla se la memorizzazione è persistente in caso negativo deve essere attivata.
    console.log("WW-STORAGE-MANAGEMENT: Storage is successfully persisted.");
  }
  else {  // se non è attivo attiviamo pesistent storage.
    console.log("WW-STORAGE-MANAGEMENT: Storage is not persisted.");
    console.log("WW-STORAGE-MANAGEMENT: Trying to persist..:");
    if(persistStorage()){ // attivazione della memoria persistente (può anche fallire nel caso il browser non riconosca questa funzionalità js.
      console.log("WW-STORAGE-MANAGEMENT: We successfully turned the storage to be persisted.");
    } else {
      console.log("WW-STORAGE-MANAGEMENT: Failed to make storage persisted");
    }
  }
}
/* ---------------------------------------------------------------------------------------------------------------------*/
/* Enable Persistent Storage for your PWA in the device memory. (ONLY IN HTTPS)
/* ---------------------------------------------------------------------------------------------------------------------*/
async function isStoragePersisted() {
  return await navigator.storage && navigator.storage.persisted ? navigator.storage.persisted() : undefined;
}
/* ---------------------------------------------------------------------------------------------------------------------*/
/* Enable Persistent Storage for your PWA in the device memory.
/* ---------------------------------------------------------------------------------------------------------------------*/
async function persistStorage(){
  return await navigator.storage && navigator.storage.persist ? navigator.storage.persist() : undefined;
}
/* ---------------------------------------------------------------------------------------------------------------------*/
/* Offline Storage Manager A function which is to be called when 'offline-mode' is enabled by the user.
/* ---------------------------------------------------------------------------------------------------------------------*/
/*
function onOfflineModeEnabled(amountOfSpaceNeeded) {
  // First check how much we can use in the Persistent storage.
  navigator.storageQuota.queryInfo("persistent").then(
    function (storageInfo) {
      var availableSpace = storageInfo.quota - storageInfo.usage;
      if (availableSpace >= amountOfSpaceNeeded) {
        // We're fine; just continue with the returned storage info.
        return storageInfo;
      }
      return navigator.storageQuota.requestPersistentQuota(
          amountOfSpaceNeeded + storageInfo.usage);
    }
  ).then(
    function (storageInfo) {
      // Prepare for offline mode using the current available
      // storage space.
      prepareForOfflineMode(storageInfo.quota - storageInfo.usage);
    }, function (error) {
      // Handle error.
    }
  );
}
*/

// * Check Progressive Web Application Storage Info * //
/* ---------------------------------------------------------------------------------------------------------------------
Funzione che controlla la quantità di spazio correntemente riservata per l'origine.
(con "origine" o "origin" ci si riferisce solo al nome del server che qui chiamerò Progressive Web Application abbreviato con PWA).

Oggetto PWA Storage Info contiene tre attributi:
- percentage: % | NaN     percentuale di spazio usato
- usage: bytes | NaN      spazio utilizzato da PWA in bytes
- quota: bytes | NaN      spazio allocato dal browser al PWA in bytes
------------------------------------------------------------------------------------------------------------------------ */
/*
function checkPWAStorage(){
  // ottieni le info riguardanti lo spazio utilizzato dall'applicazione web (pecentuale di spazio occupato, spazio occupato in MB, spazio riservato dal browser alla PWA).
  let PWAStorageInfo = getPWAStorageInfo();
  // METTI QUI la logica di controllo della memoria occupata per determinare le azioni future da compiere (liberare spazio, memorizzare assets in cache, ecc.).
}
*/
// * Get Progressive Web Application Storage Info * //
/* ----------------------------------------------------------------------------------------------------------------------
  Funzione che ottiene le info. riguardanti lo spazio utilizzato dall'applicazione web
  (pecentuale di spazio occupato, spazio occupato in MB, spazio riservato dal browser all'origine(PWA)).
 --------------------------------------------------------------------------------------------------------------------- */
function getPWAStorageInfo(){
  storageEstimateWrapper().then(function(PWAstorageEstimation){ // ritorna la stima dello spazio utilizzato e lo spazio totale a disposizione della PWA.
    const PWAstorageInfo = getMibStorage(PWAstorageEstimation.usage, PWAstorageEstimation.quota);  // trasformo i bytes di spazio occupato e spazio totale libero in Megabytes e ottengo la percentuale di spazio occupata dall'applicazione.
    console.log(`Using ${PWAstorageEstimation.usage} bytes out of ${PWAstorageEstimation.quota} bytes.`);  // TEST CODE.
    console.log(`Using ${bytesToMib(PWAstorageInfo.usage_bytes)} Meagabytes out of ${bytesToMib(PWAstorageInfo.quota_MB)} Megabytes.`); // TEST CODE.
    return PWAstorageInfo;
  });
}
// * Get Progressive Web Application Storage Info * //
/* ----------------------------------------------------------------------------------------------------------------------
  Ritorna un valore "usage" e un valore "quota"
  "usage": reflects how many bytes a given origin is effectively using for same-origin data.
  "quota": reflects the amount of space currently reserved for an origin by your browser. The space that the browser devote to your web app's origin will likely change.
 --------------------------------------------------------------------------------------------------------------------- */
async function storageEstimateWrapper(){
  // Se il browser corrente supporta l'API Cache Storage esegui questo
  if(hasCacheAPI())
    return await estimateCacheStorage('CacheAPI');
  // Se il browser non supporta Cache Storage e Storage Quota utilizziamo due caratteristiche più vecchie ma che garantisce compatibilità.
  if(hasWebKitAPI())
    return await estimateCacheStorage('WebKitAPI');
  // se il browser supporta l'API Storage Quota ma non Cache Storage usiamo questo
  if(hasStorageQuotaAPI())
    return await estimateCacheStorage('StorageQuotaAPI');
  // If we can't estimate the values, return a Promise that resolves with NaN.
  return await estimateCacheStorage();
}
// ----------------------------------------------------------------------------------------------------------------------
function hasCacheAPI(){
  return  'storage' in navigator &&
          'estimate' in navigator.storage;
}
function hasWebKitAPI(){
  return  'webkitTemporaryStorage' in navigator &&
          'queryUsageAndQuota' in navigator.webkitTemporaryStorage
}
function hasStorageQuotaAPI(){
  return  'storageQuota' in navigator &&
    'queryInfo' in navigator.storageQuota;
}
async function estimateCacheStorage(chooseAPI){
  /*
    navigator.storage.estimate() ritorna due valori:
    "usage": reflects how many bytes a given origin is effectively using for same-origin data.
    "quota": reflects the amount of space currently reserved for an origin by your browser. The space that the browser devote to your web app's origin will likely change.
  */
  switch(chooseAPI){
    case "CacheAPI":
      console.log("WW-STORAGE-MANAGEMENT: browser supporta 'storage estimate'");
      return await navigator.storage.estimate().then(await function(estimate){
        console.log(estimate.usage, estimate.quota);
        return estimate;
      });
      break;
    case "WebKitAPI":
      console.log("WW-STORAGE-MANAGEMENT: browser non supporta 'storage estimate' uso 'webkitTemporaryStorage'");
      // Return a promise-based wrapper that will follow the expected interface.
      return new Promise(function(resolve, reject) {
        navigator.webkitTemporaryStorage.queryUsageAndQuota(
          function(usage, quota) {resolve({usage: usage, quota: quota})},
          reject
        );
      });
      break;
    case "StorageQuotaAPI":
      console.log("WW-STORAGE-MANAGEMENT: browser non supporta 'storage estimate' uso 'storage quota'");
      return navigator.storageQuota.queryInfo("persistent");
      break;
    default:
      console.log("browser non supporta nulla");
      return Promise.resolve({usage: NaN, quota: NaN});
  }
}
// ----------------------------------------------------------------------------------------------------------------------
// * Get Progressive Web Application Storage Info * //
/* ----------------------------------------------------------------------------------------------------------------------
  funzioni:
  - Crea oggetto PWA Storage Info. Ritorna un'oggetto che contiene pecentuale di spazio occupato, spazio occupato in bytes dall'origine, spazio riservato dal browser all'origine(PWA) in bytes).
  - Ottieni pecentuale di spazio occupato.
  - Trasformo i bytes in Megabytes.
 --------------------------------------------------------------------------------------------------------------------- */
function createPWAStorageInfo(t_usage, t_quota){
  return {
    percentage: getStoragePercent(t_usage,t_quota),
    usage_bytes: t_usage,
    quota_bytes: t_quota,
  };
}

function getStoragePercent(t_usage, t_quota){
  return Math.round(t_usage / t_quota * 100);  // calcola la percentuale di dati utilizzati dall'origine.
}

function bytesToMib(t_bytes){
  return Math.round(t_bytes / (1024 * 1024)); // trasforma i dati da bytes in megabytes.
}

function checkCachesSpace(t_cacheList){
	//...
}

function checkCacheStorageSize(){
	//...
}

function checkCacheFreeSpace(){
	//...
}

function checkAssetsSpaceOccupied(){
	//...
}

function getAssetsInCache(){
	//...
}

function checkAssetsToRemoveFromCache(t_cacheList){
	//...
}

function removeAssetsFromCache(t_assetsList){
	//...
}

function addAssetInCache(t_response){
	//...
}
