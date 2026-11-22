// Construction du site : écrit dist/ pour un jour donné.
// Usage : npm run construire [-- --date AAAA-MM-JJ] [-- --contenu chemin] [-- --sortie chemin]
//
// Verrou réel : seules les fiches des jours publiés sont chargées, plus le seul `indice` de la
// prochaine porte. Une fiche à venir n'entre jamais dans dist/. Les journaux d'Actions d'un dépôt
// public étant lisibles par tous, rien d'autre que des numéros de jour n'est affiché.
// Une fiche publiée invalide fait échouer la construction avant la moindre écriture : pas de dist/ partiel.

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PORTE_COULISSES } from './lib/config.mjs';
import { cibleProchainePorte, dateCivile, jourPublie, prochainePorte } from './lib/calendrier.mjs';
import { rendrePng } from './lib/apercu.mjs';
import { controlerFiche } from './lib/fiches.mjs';
import { page404, pageCase, pageMosaique, preparerSvg } from './lib/gabarits.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const RACINE_PROJET = path.resolve(ici, '..');
const nn = (n) => String(n).padStart(2, '0');

/** Vrai si `enfant` est `parent` ou se trouve dedans. */
function estDans(parent, enfant) {
  const relatif = path.relative(parent, enfant);
  return relatif === '' || (!relatif.startsWith('..') && !path.isAbsolute(relatif));
}

/** Indice de la prochaine porte, lu sans charger le reste de la fiche. undefined s'il manque. */
async function lireIndice(contenu, porte) {
  try {
    const fiche = JSON.parse(await readFile(path.join(contenu, 'cases', `${nn(porte)}.json`), 'utf8'));
    return typeof fiche.indice === 'string' && fiche.indice.trim() !== '' ? fiche.indice.trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * @param {object} [options]
 * @param {string} [options.date] date civile AAAA-MM-JJ à simuler (défaut : aujourd'hui à Bruxelles)
 * @param {string} [options.contenu] dossier du dépôt de contenu
 * @param {string} [options.sortie] dossier de sortie
 * @param {(ligne: string) => void} [options.journal]
 * @returns {Promise<{jour: number, sortie: string}>}
 */
export async function construire({
  date,
  contenu = path.join(RACINE_PROJET, 'contenu'),
  sortie = path.join(RACINE_PROJET, 'dist'),
  journal = console.log,
} = {}) {
  const civile = date ?? dateCivile();
  const jour = jourPublie(civile);
  contenu = path.resolve(contenu);
  sortie = path.resolve(sortie);
  const site = path.join(RACINE_PROJET, 'site');

  if (estDans(sortie, RACINE_PROJET) || estDans(sortie, contenu) || estDans(sortie, site)) {
    throw new Error('Le dossier de sortie ne doit pas contenir le projet, le contenu ni site/.');
  }

  journal(`Jour publié : ${jour}`);

  // 1. Tout valider avant d'écrire quoi que ce soit.
  const fiches = [];
  const refus = [];
  for (let n = 1; n <= jour; n += 1) {
    const resultat = await controlerFiche(contenu, n);
    if (!resultat.pret) {
      refus.push(`Fiche ${nn(n)} invalide : ${resultat.manques.join(' ; ')}`);
      continue;
    }
    for (const avertissement of resultat.avertissements) journal(`Fiche ${nn(n)} : ${avertissement}`);
    let svg;
    let apercu;
    try {
      const brut = await readFile(path.join(contenu, resultat.fiche.illustration.svg), 'utf8');
      svg = preparerSvg(brut, n);
      apercu = rendrePng(brut); // rendu avant toute écriture : un SVG illisible fait échouer la construction
    } catch (erreur) {
      refus.push(`Fiche ${nn(n)} : ${erreur.message}`);
      continue;
    }
    fiches.push({ n, fiche: resultat.fiche, svg, apercu });
  }
  for (const champ of ['slug', 'url']) {
    const vus = new Map();
    for (const { n, fiche } of fiches) {
      const valeur = fiche[champ];
      if (typeof valeur !== 'string') continue;
      if (vus.has(valeur)) refus.push(`Fiches ${nn(vus.get(valeur))} et ${nn(n)} : ${champ} en double`);
      else vus.set(valeur, n);
    }
  }
  if (refus.length > 0) throw new Error(refus.join('\n'));

  // 2. La prochaine porte : son indice, rien d'autre de sa fiche.
  const suivante = prochainePorte(jour);
  let prochaine = null;
  if (suivante !== null) {
    const indice = await lireIndice(contenu, suivante);
    if (indice === undefined && suivante < PORTE_COULISSES) journal(`Porte ${nn(suivante)} : indice absent`);
    prochaine = { porte: suivante, cible: cibleProchainePorte(jour), ...(indice ? { indice } : {}) };
  }

  // 3. Écriture.
  await rm(sortie, { recursive: true, force: true });
  await mkdir(sortie, { recursive: true });
  for (const dossier of ['css', 'js', 'polices', 'assets']) {
    await cp(path.join(site, dossier), path.join(sortie, dossier), { recursive: true });
  }

  const titres = new Map(fiches.map(({ n, fiche }) => [n, fiche.titre]));
  await writeFile(path.join(sortie, 'index.html'), pageMosaique({ jour, titres, prochaine }));
  await writeFile(path.join(sortie, '404.html'), page404());

  for (const { n, fiche, svg, apercu } of fiches) {
    await mkdir(path.join(sortie, nn(n)), { recursive: true });
    await writeFile(path.join(sortie, nn(n), 'index.html'), pageCase({ fiche, svg }));
    await mkdir(path.join(sortie, 'illustrations'), { recursive: true });
    await mkdir(path.join(sortie, 'animations'), { recursive: true });
    await mkdir(path.join(sortie, 'apercus'), { recursive: true });
    await writeFile(path.join(sortie, 'apercus', `${nn(n)}.png`), apercu);
    await cp(path.join(contenu, fiche.illustration.svg), path.join(sortie, 'illustrations', `${nn(n)}.svg`));
    await cp(path.join(contenu, 'animations', `${nn(n)}.css`), path.join(sortie, 'animations', `${nn(n)}.css`));
    journal(`Porte ${nn(n)} : ok`);
  }

  journal(`Construction terminée : ${fiches.length} case(s) publiée(s).`);
  return { jour, sortie };
}

function lireOption(args, nom) {
  const i = args.indexOf(nom);
  return i >= 0 ? args[i + 1] : undefined;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  try {
    await construire({
      date: lireOption(args, '--date'),
      contenu: lireOption(args, '--contenu'),
      sortie: lireOption(args, '--sortie'),
    });
  } catch (erreur) {
    console.error(`Construction refusée :\n${erreur.message}`);
    process.exit(1);
  }
}
