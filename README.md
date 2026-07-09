# Magna e tasi

Sito e app per ricette di cucina italiana — dal Veneto e oltre.

## Avvio rapido

```bash
npm run serve
```

Apri http://localhost:3001

## Interfaccia

1. **Bowl donburi** — le ricette girano all'interno di una grande bowl giapponese
2. **Selezione** — clicca una ricetta (o usa le frecce) per aprirla
3. **Vista ricetta** — video a sinistra, ingredienti e procedimento a destra

## Struttura

- `public/data/recipes.json` — ricette con video, ingredienti e procedimento
- `public/css/style.css` — bowl giapponese, carousel 3D e layout video/dettaglio
- `public/js/app.js` — rotazione ricette nella bowl e vista affiancata

## Aggiungere una ricetta

Modifica `public/data/recipes.json` e aggiungi titolo, ingredienti, passi e video YouTube o MP4.

Le 10 ricette incluse usano video tutorial da YouTube per provare l'app.

## Pubblicazione

Il workflow GitHub Actions pubblica automaticamente la cartella `public/` su GitHub Pages a ogni push su `main`.
