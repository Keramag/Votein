# Votein

Workout tracker, custom split designer and algorithmic program generator.

## Develop

```bash
npm install
npm run build:data   # downloads upstream dataset, writes src/data/exercises.json
npm run dev
```

## Features

- **Workout tracker**: log sets, autosaved; history; personal records (heaviest, estimated 1RM, bodyweight reps) with PR badges.
- **Split designer**: build a weekly routine, set weekdays, activate one to drive the Today page.
- **Program generator**: weekly sets per muscle + days + minutes per session + equipment -> program (`src/lib/generator.ts`).

Data lives in SQLite (`node:sqlite`) at `$DATA_DIR/votein.db` (default `.data/`; `/data` volume in Docker).
There are no accounts: each browser gets a secret key cookie, which can be copied to other devices in Settings.

```bash
npm test   # generator tests
```

## Credits

Exercise data from [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset).
Exercise media is © [Gym visual](https://gymvisual.com/), used under its terms
(180×180, attribution shown in the UI) and loaded from the dataset repo via CDN.
