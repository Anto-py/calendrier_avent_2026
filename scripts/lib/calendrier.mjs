// Seule source du « jour publié ». Aucun autre fichier ne calcule de date.
//
// Jour publié : 0 avant le 2026-12-01, N du 1er au 24, 25 (tout ouvert) dès le 2026-12-25.
// Le jour se lit sur le calendrier de Bruxelles, quel que soit le fuseau de la machine.

import { ANNEE, DECALAGE_DECEMBRE, FUSEAU, PORTE_COULISSES, PREMIERE_PORTE } from './config.mjs';

const DEBUT = `${ANNEE}-12-01`;
const FIN = `${ANNEE}-12-25`;
const FORMAT_CIVIL = /^\d{4}-\d{2}-\d{2}$/;

const formatBruxelles = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSEAU,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Date civile (AAAA-MM-JJ) d'un instant, lue à Bruxelles. */
export function dateCivile(instant = new Date()) {
  return formatBruxelles.format(instant);
}

/** Jour publié pour une date civile AAAA-MM-JJ. Lève si le format est faux. */
export function jourPublie(civile) {
  if (!FORMAT_CIVIL.test(civile)) {
    throw new Error(`Date civile attendue au format AAAA-MM-JJ, reçu : ${civile}`);
  }
  // Les dates ISO se comparent comme des chaînes.
  if (civile < DEBUT) return 0;
  if (civile >= FIN) return PORTE_COULISSES;
  return Number(civile.slice(8, 10));
}

/** Jour publié à un instant donné (par défaut maintenant). */
export function jourPublieA(instant = new Date()) {
  return jourPublie(dateCivile(instant));
}

/** Minuit de Bruxelles à l'ouverture de la porte n (1 à 25), au format ISO avec décalage. */
export function cibleOuverture(porte) {
  if (!Number.isInteger(porte) || porte < PREMIERE_PORTE || porte > PORTE_COULISSES) {
    throw new Error(`Porte hors de 1 à ${PORTE_COULISSES} : ${porte}`);
  }
  return `${ANNEE}-12-${String(porte).padStart(2, '0')}T00:00:00${DECALAGE_DECEMBRE}`;
}

/** Numéro de la prochaine porte à ouvrir, ou null quand tout est ouvert. */
export function prochainePorte(jour) {
  return jour < PORTE_COULISSES ? jour + 1 : null;
}

/** Cible du compte à rebours, ou null quand il n'y a plus rien à attendre. */
export function cibleProchainePorte(jour) {
  const porte = prochainePorte(jour);
  return porte === null ? null : cibleOuverture(porte);
}
