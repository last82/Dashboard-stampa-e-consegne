# Dashboard stampa e consegne

Questo progetto contiene una semplice dashboard gestita tramite React e caricata nel browser con Babel.

## Struttura di progetto

```
css/        Fogli di stile
js/         Script e componenti React
partials/   Frammenti HTML riutilizzabili
index.html  Pagina principale
```

## Configurazione Airtable
Copia `js/config.example.js` in `js/config.js` e inserisci le chiavi del tuo
account Airtable. Il file `js/config.js` è ignorato da Git per mantenere le
credenziali riservate.

## Creazione della struttura
Per creare la struttura di cartelle da terminale puoi usare i seguenti comandi:

```bash
mkdir -p css js partials
# file base
touch index.html css/style.css js/app.jsx \
      partials/header.html partials/footer.html
```

All'interno di `index.html` sono poi collegati `css/style.css` e `js/app.jsx`.
