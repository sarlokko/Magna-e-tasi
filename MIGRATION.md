# Migrazione repository standalone

Questo branch contiene **Magna e tasi** come progetto indipendente, estratto da `sarlokko/noi`.

## Crea il nuovo repository

1. Apri https://github.com/new
2. Nome: `magna-e-tasi`
3. Descrizione: `Magna e tasi — ricette di cucina italiana`
4. Repository **pubblico**, **senza** README, .gitignore o licenza iniziali
5. Clicca **Create repository**

## Pubblica il codice

```bash
git clone https://github.com/sarlokko/noi.git
cd noi
git checkout magna-e-tasi-export
git remote add magna https://github.com/sarlokko/magna-e-tasi.git
git push -u magna magna-e-tasi-export:main
```

## Abilita GitHub Pages

Nel nuovo repository: **Settings → Pages → Build and deployment → GitHub Actions**.

Il workflow `.github/workflows/deploy.yml` pubblicherà `public/` a ogni push su `main`.

## Avvio locale

```bash
npm run serve
```

Apri http://localhost:3001
