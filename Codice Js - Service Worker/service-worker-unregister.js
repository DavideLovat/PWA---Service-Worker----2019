var serviceWorkerRemoveList = [];


// * ------------------------------------------------------------------------------------------------------------------------------------------------------
// * Service Worker Unregistration
/* ------------------------------------------------------------------------------------------------------------------------------------------------------
    Rimuovere/disinstallare tutti i service worker.
    È possibile eseguirla manualmente dal proprio browser oppure inserendo un semplice script al posto di quello di registrazione del service worker.
    È necessario che la pagina contenente il codice di disinstallazione venga visitata dal browser.
/* --------------------------------------------------------------------------------------------------------------------- */

navigator.serviceWorker.getRegistrations().then(function(registrations) {
  // RIMUOVERE I COMMENTI DA UNA DELLE FUNZIONI SOTTOSTANTI PER UTILIZZARE UNREGISTER SW IN UNA PAGINA.
  //removeAllSW();
  //removeListSW(serviceWorkerRemoveList);
});

// * ------------------------------------------------------------------------------------------------------------------------------------------------------
// * AUXILIARY FUNCTIONS
// * ------------------------------------------------------------------------------------------------------------------------------------------------------

// * Remove service worker from a list of names * //
function removeListSW(t_removeSWList){
  for(let registration of registrations) {
    if(t_removeSWList.includes(registration)){
      registration.unregister();
    }
  }
}

// * Remove all service worker registred * //
function removeAllSW(){
  for(let registration of registrations) {
    registration.unregister();
  }
}

