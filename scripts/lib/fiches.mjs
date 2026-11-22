// Lecture et validation des fiches. Signale les manques, ne corrige rien.
// Une validation, deux usages : `controle.mjs` (les 25 fiches) et `construire.mjs` (les seules publiées).

import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ACCES, BADGES, GRANDES_PORTES, PORTE_COULISSES } from './config.mjs';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LIMITE_PRESENTATION = 700;
const TIRET_CADRATIN = '—';

const nn = (jour) => String(jour).padStart(2, '0');
const texte = (valeur) => typeof valeur === 'string' && valeur.trim() !== '';

async function existe(chemin) {
  try {
    await access(chemin);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valide une fiche déjà lue.
 * @returns {Promise<{manques: string[], avertissements: string[]}>}
 */
export async function validerFiche(fiche, jour, racine) {
  const manques = [];
  const avertissements = [];
  const estCoulisses = jour === PORTE_COULISSES;

  if (fiche.jour !== jour) manques.push(`jour doit valoir ${jour}`);
  if (!texte(fiche.titre)) manques.push('titre absent');
  if (!texte(fiche.presentation)) {
    manques.push('presentation absente');
  } else if (!estCoulisses && fiche.presentation.length > LIMITE_PRESENTATION) {
    avertissements.push(`presentation longue (${fiche.presentation.length} signes, au-delà de ${LIMITE_PRESENTATION})`);
  }

  if (typeof fiche.grande_porte !== 'boolean') {
    manques.push('grande_porte absent');
  } else if (fiche.grande_porte !== GRANDES_PORTES.includes(jour)) {
    manques.push(`grande_porte doit valoir ${GRANDES_PORTES.includes(jour)}`);
  }

  if (!texte(fiche.animation)) manques.push('animation (description) absente');
  if (!(await existe(path.join(racine, 'animations', `${nn(jour)}.css`)))) {
    manques.push(`animations/${nn(jour)}.css absent`);
  }

  const illustration = fiche.illustration;
  if (!illustration || typeof illustration !== 'object') {
    manques.push('illustration absente');
  } else {
    const attendu = `illustrations/${nn(jour)}.svg`;
    if (illustration.svg !== attendu) {
      manques.push(`illustration.svg doit valoir ${attendu}`);
    } else if (!(await existe(path.join(racine, attendu)))) {
      manques.push(`${attendu} absent`);
    }
    if (!texte(illustration.alt)) manques.push('illustration.alt vide');
  }

  if (!estCoulisses) {
    if (!texte(fiche.slug) || !SLUG.test(fiche.slug)) manques.push('slug absent ou mal formé');
    if (!texte(fiche.url) || !fiche.url.startsWith('https://')) manques.push('url absente ou non https');
    if (!ACCES.includes(fiche.acces)) manques.push(`acces absent ou hors de ${ACCES.join(', ')}`);
    if (!texte(fiche.indice)) manques.push('indice absent');
    if (!Array.isArray(fiche.sources) || fiche.sources.length === 0 || !fiche.sources.every(texte)) {
      manques.push('sources absentes');
    }
    if (fiche.liens !== undefined) {
      if (!Array.isArray(fiche.liens)) {
        manques.push('liens doit être un tableau');
      } else {
        fiche.liens.forEach((lien, i) => {
          if (!lien || !texte(lien.libelle)) manques.push(`liens[${i}].libelle absent`);
          if (!lien || !texte(lien.url) || !lien.url.startsWith('https://')) {
            manques.push(`liens[${i}].url absente ou non https`);
          }
        });
      }
    }
    if (fiche.badges !== undefined) {
      if (!Array.isArray(fiche.badges)) {
        manques.push('badges doit être un tableau');
      } else {
        for (const badge of fiche.badges) {
          if (!BADGES.includes(badge)) manques.push(`badge inconnu : ${badge}`);
        }
      }
    }
  }

  // Convention d'écriture d'Antonin : pas de tiret cadratin dans ce qui s'affiche.
  for (const champ of ['titre', 'presentation', 'indice']) {
    if (typeof fiche[champ] === 'string' && fiche[champ].includes(TIRET_CADRATIN)) {
      avertissements.push(`${champ} contient un tiret cadratin`);
    }
  }

  return { manques, avertissements };
}

/**
 * Lit et valide la fiche d'un jour.
 * @returns {Promise<{jour: number, slug?: string, fiche?: object, manques: string[], avertissements: string[], pret: boolean}>}
 */
export async function controlerFiche(racine, jour) {
  const chemin = path.join(racine, 'cases', `${nn(jour)}.json`);
  let brut;
  try {
    brut = await readFile(chemin, 'utf8');
  } catch {
    return { jour, manques: ['fichier absent'], avertissements: [], pret: false };
  }
  let fiche;
  try {
    fiche = JSON.parse(brut);
  } catch {
    return { jour, manques: ['JSON illisible'], avertissements: [], pret: false };
  }
  if (fiche === null || typeof fiche !== 'object' || Array.isArray(fiche)) {
    return { jour, manques: ['la fiche doit être un objet JSON'], avertissements: [], pret: false };
  }
  const { manques, avertissements } = await validerFiche(fiche, jour, racine);
  return { jour, slug: fiche.slug, fiche, manques, avertissements, pret: manques.length === 0 };
}

/** Contrôle les 25 fiches et repère les doublons de slug et d'adresse. */
export async function controlerToutes(racine) {
  const rapport = [];
  for (let jour = 1; jour <= PORTE_COULISSES; jour += 1) {
    rapport.push(await controlerFiche(racine, jour));
  }
  for (const champ of ['slug', 'url']) {
    const vus = new Map();
    for (const entree of rapport) {
      const valeur = entree.fiche?.[champ];
      if (!texte(valeur)) continue;
      if (vus.has(valeur)) {
        const premier = rapport[vus.get(valeur) - 1];
        premier.manques.push(`${champ} en double avec la fiche ${nn(entree.jour)}`);
        entree.manques.push(`${champ} en double avec la fiche ${nn(premier.jour)}`);
        premier.pret = false;
        entree.pret = false;
      } else {
        vus.set(valeur, entree.jour);
      }
    }
  }
  return rapport;
}
