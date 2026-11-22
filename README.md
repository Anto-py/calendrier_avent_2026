# Calendrier de l'Avent technopédagogique 2026

Vingt-quatre ressources numériques pour enseigner, une porte par jour du 1er au 24 décembre 2026, plus une porte « coulisses » le 25. Chaque porte s'ouvre à minuit, heure de Bruxelles.

Site : <https://anto-py.github.io/calendrier_avent_2026/>

## Comment ça marche

Le site est construit chaque nuit par GitHub Actions, puis déployé sur GitHub Pages. Le texte de chaque porte vit dans un dépôt privé et n'entre dans le site que le jour de son ouverture : rien d'une porte à venir n'existe dans ce dépôt, ni dans le site publié, ni dans les journaux de construction.

Le script de construction est du Node 22 sans framework ; il écrit du HTML, du CSS et du JavaScript natifs. La seule dépendance est `@resvg/resvg-js`, qui tire des images de partage 1200 × 630 des illustrations.

## Développer en local

```sh
npm ci
npm test                                                    # tests, sur du contenu synthétique
npm run construire -- --date 2026-12-05 --contenu <dossier> # simule un jour donné
npm run servir                                              # http://localhost:8080
```

`--date` simule le jour publié (avant le 1er décembre, rien n'est ouvert ; à partir du 25, tout l'est). `--contenu` désigne le dossier des fiches (`cases/`, `illustrations/`, `animations/`).

## Licence

[Creative Commons Attribution - Partage dans les mêmes conditions 4.0 (CC BY-SA 4.0)](LICENSE).

Conçu et fabriqué par Antonin Bareau avec l'aide essentielle d'un ou plusieurs LLM.
