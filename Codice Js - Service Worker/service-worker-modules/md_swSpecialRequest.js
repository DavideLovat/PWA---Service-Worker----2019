/*
Questo file viene utilizzato per gestire le richieste dei file angular (main.js, polyfills.js, ecc.)
Serve perchè i file angular vengono passati nell'url come 'http://....../main-254324252235453535.js' per essere intercettato e messo in cache
dobbiamo guardare se il file contiente la stringa main e se è un file javascript.
IMPORTANTE: i nomi 'main','runtime','polyfills','styles','vendor', specialmente 'main' possono essere impiegati da altri script .js quindi è possibile che se si intercetta un file .js che inzia con
questi 5 nomi è possibile che finisca in cache anche se non vogliamo.
*/
/*
controlla se il file è un file angular e se ha estensione js.
Se vuoi gestire altri file oltre ai file .js allora devi settare la variabile extension = ''
*/
function isSpecialRequest(request, specialList) {
    let response = false;
    if (Array.isArray(specialList.toCache) && specialList.toCache.length > 0) {
        let fileName = getFileName(request.url);
        let extension = 'js';
        for (let index in specialList.toCache) {
            let regExp = getMatchFileNameRegularExpression(specialList.toCache[index], extension);
            if (fileName.search(regExp) == 0) {
                response = true;
                break;
            }
        }
    }
    return response;
}
/* prende l'ultima parola dell'url */
function getFileName(url){
    let splitedUrlArray = url.split("/");  // spezza la stringa dell'url dove incontra una backslash.
    let myString = splitedUrlArray.pop(); // copia l'ultimo elemento (cioè il nome del file) nell'array di elementi spezzati dall'url.
    return myString;
}
/* crea l'espressione regolare che utilizziamo per controllare se nella parola url è contenuto il nome di un file angular speciale*/
function getMatchFileNameRegularExpression(name, extension){
    let strRegExp;
    if(extension != '')
        strRegExp = `^(${name})[^.]*\.(${extension})`;
    else
        strRegExp = `^(${name})[^.]*`;
    //console.log("SW FETCH: la mia espressione regolare è: ", strRegExp); // TEST
    return new RegExp(strRegExp);
}
