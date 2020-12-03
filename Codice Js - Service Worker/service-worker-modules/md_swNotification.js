/* file in fase di SVILUPPO, è il modulo da importare nel Service Worker per gestire le notifiche push, attulamente inutilizzato */

function notificationClosed(event){
    var notification = event.notification;
    var primaryKey = notification.data.primaryKey;

    console.log('Closed notification: ' + primaryKey);
}
