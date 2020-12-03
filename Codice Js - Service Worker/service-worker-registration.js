/*
        NOTA: Per permettere al service worker di fare prechaching dal root si può procedere in uno dei seguenti modi:
        1. Posizionare direttamente il file del service worker nella cartella di root (cioè 'src') del progetto.
        2. Copiare con angular.json  il service worker da una posizione qualsiasi del progetto (e.g. "assets/js/service-worker.js) nel root del dominio (i.e. "/"):
           (e.g.) inside "angular.json" file under "build" target:
             assets:
                {
                  "glob": "service-worker.js",
                  "input": "src/assets/js",
                  "output": "/"
                }
        La posizione del service worker file influisce direttamente sul service worker’s scope di default.
        Se noi registriamo il service worker file ad esempio da ‘/example/service-worker.js ‘
        allora il service worker vedrà solo gli eventi fetch per le pagine il cui URL inizia con /example/ (i.e. /example/page1/, /example/page2/).
        Possiamo modificare lo scope del service worker senza modificare la posizione del service worker agendo sul codice di registrazione.
*/
// * ------------------------------------------------------------------------------------------------------------------------------------------------------
// * BODY (BLOCCO DI CODICE CHE VA IN ESECUZIONE)
// * ------------------------------------------------------------------------------------------------------------------------------------------------------
//const swPath = './service-worker.js'; // service worker script path
const _swPath = './service-worker.js'; // service worker script path
main(_swPath);

function main(swPath){
    console.log("SW Registration Event: 1. Service Worker Registration Call!");  // TEST CODE
    serviceWorkerRegistration(swPath);  // registrazione service worker.
}

// * ------------------------------------------------------------------------------------------------------------------------------------------------------
// * SERVICE WORKER REGISTRATION FUNCTIONS
// * ------------------------------------------------------------------------------------------------------------------------------------------------------

// * No scope function * //
function serviceWorkerRegistration(path){
  /* ---------------------------------------------------------------------------------------------------------------------
  Blocco di registrazione del service worker script su browser.
  The default scope of a service worker registration is ./ relative to the script URL.

  ------------------------------------------------------------------------------------------------------------------------
  NOTA: Se usi questa registrazione devi inserire il "service-worker.js" nel root del progetto seguendo uno dei seguenti punti:
  1. Cambia la posizione del service-worker.js e inseriscilo nella cartella "src" del progetto, e rimuovi il codice in "angular.json" se presente seguendo il punto due.
     e aggiungi "<script src="./service-worker.js"></script>" nel <body> del file "index.html".
  2. Oppure inserisci/rimuovi il seguente codice in "angular.json" in "project:architect:build:options:assets:" per copiare/non copiare il service worker nel root:
  -------------------Code----------------------------
                {
                  "glob": "service-worker.js",
                  "input": "src/assets/js",
                  "output": "/"
                }
  ------------------Definition-----------------------
                {
                  "glob": nome del file,
                  "input": posizione del service workerer script nel progetto
                  "output": posizione in cui si vuole copiare il service worker script
                }
  /* ---------------------------------------------------------------------------------------------------------------------*/

  if('serviceWorker' in navigator){
      navigator.serviceWorker.register(path, {scope: './'}).then(function(registration){
        console.log('SW Registration Event: 2. service worker registrato, service worker scope è:', registration.scope);  // Esegui se registrazione ha successo. // TESTING CODE
      }).catch(function(error){
        console.log('SW Registration Event: 2. Installazione service worker fallita:', error);  // Esegui se registrazione fallisce.  // TESTING CODE
      });
  }else{
      throw new Error("No Service Worker support!");
  }
}

// * ------------------------------------------------------------------------------------------------------------------------------------------------------
// * SERVICE WORKER MANUAL UPDATES
// * Inserire la funzione in "serviceWorkerRegistration()" function sotto "navigator.serviceWorker.register(tmp_path, {scope: './'}).then(function(registration){ //QUI }
// * The browser checks for updates automatically after navigations and functional events, but you can also trigger them manually
// * If you expect the user to be using your site for a long time without reloading, you may want to call update() on an interval (such as hourly).
// * ------------------------------------------------------------------------------------------------------------------------------------------------------
function serviceWorkerManualUpdate(registration){
  // add a timer dude
  registration.update();
}
