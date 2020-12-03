/* https://developers.google.com/web/ilt/pwa/introduction-to-push-notifications */
/* https://tests.peter.sh/notification-generator/ per la creazione di notifiche push personalizzate */

main();

function main(){
    requestNotificationPermission();    // richiedi all'utente il permesso di mostrare notifiche.
}

function requestNotificationPermission(){
    if("Notification" in window && "serviceWorker" in navigator){   // controlla che le notifiche e il service worker siano attivi sul browser
        if(Notification.permission === "granted"){  // se l'utente ha acconsentito all'uso delle notifiche esegui questo.
            notificationManager();
        }
        else if(Notification.permission !== "denied"){  // se le notifiche non sono state negate dall'utente ma nemmeno accettate segui questo
            if(askForPermission()){ // chiede all'utente il permesso per inviare notifiche
                console.log("Notifiche Push Autorizzate!");

                notificationManager();  // gestore delle notifiche
            }
            else{
                console.log("Notifiche Push NON Autorizzate!");
            }
        }
    }else{
        alert("This browser does not support desktop notification");
        throw new Error("This browser does not support desktop notification!");
    }
}

function askForPermission(){
    return Notification.requestPermission().then(function(permission){
        console.log('Notification permission status:', permission);
        // value of permission can be 'granted', 'default', 'denied'
        // granted: user has accepted the request
        // default: user has dismissed the notification permission popup by clicking on x
        // denied: user has denied the request.
        return isPermission(permission);    // controlla che se sono state accettate le notifiche.

    }).catch(function(error){
        console.log('errore nella richiesta di permesso di Notifiche Push', error);
        return false;
    });
}

function isPermission(permission){
    return permission === "granted";
}

function notificationManager(){
    createNotification();   // crea una semplice notifica che viene visualizzata nella barra delle notifiche di windows o del cellulare
}

function createNotification(){
    //navigator.serviceWorker.getRegistration().then(function(registration) {
    navigator.serviceWorker.ready.then(function(registration) {
        registration.showNotification('Vibration Sample', getSimpleNotificationOptions()); // show a simple notification.
        registration.showNotification('Hello world!', getActionNotificationOptions()) // add actions to the notification so the user can quickly interact with our site or service without opening a page.
    });
}
// SIMPLE NOTIFICATIONS DISPLAY INFORMATION
/* Alcuni esempi di notifiche da utilizzare per testare le notifiche di base */

/* semplice notifica non richiede azioni da parte dell'utente */
// Simple notifications display information to the user and handle basic interactions when clicked.
// This is a massive step forward for the web, but it's still a bit basic.
function getSimpleNotificationOptions(){
    var options1 = {
        body: 'Buzz! Buzz!',
        icon: '../images/touch/chrome-touch-icon-192x192.png',
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        tag: 'vibration-sample'
    }
    return options1;
}
// ADD ACTIONS TO THE NOTIFICATION
/*
Add contextually relevant actions to the notification so the user can quickly interact with our site or service without opening a page.
To create a notification with a set of custom actions, we add an actions array inside the notification options object.
This array contains a set of objects that define the action buttons to show to the user.
Actions can have an identifier string, a title containing text to be shown to the user, and an icon containing the location of an image to be displayed next to the action.
*/
function getActionNotificationOptions(){
    var options = {
        body: 'Here is a notification body!',
        icon: 'images/example.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {action: 'explore', title: 'Explore this new world',
                icon: 'images/checkmark.png'},
            {action: 'close', title: 'Close notification',
                icon: 'images/xmark.png'},
        ]
    };
    return options;
}
