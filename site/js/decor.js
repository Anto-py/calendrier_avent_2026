// Allumage du décor. Chaque porte ouverte sur cet appareil allume l'ampoule de même numéro et la pièce
// de décor du même jour ; la porte qu'on vient d'ouvrir s'allume avec un petit éclat (et sa coche tombe).
// L'état « éteint » est celui du HTML : sans ce script, ou sans stockage, le décor reste simplement en veille.
//
// Mémoire : `calendrier_avent_2026_decor`, { version: 1, montrees: [1, 2] }, les portes dont l'allumage
// a déjà été joué. Les portes ouvertes viennent de memoire.js (son format ne change pas).

import { lireOuvertes, stockage } from './memoire.js';

export const CLE_DECOR = 'calendrier_avent_2026_decor';
const ECART_ARRIVEES = 0.3; // secondes entre deux arrivées, pour qu'elles se suivent
const ARRIVEES_ECHELONNEES = 8; // au-delà, les arrivées partent ensemble

/** Portes dont l'allumage a déjà été montré. Tableau vide si rien, ou si le contenu est illisible. */
export function lireMontrees(magasin = stockage()) {
  try {
    const brut = magasin.getItem(CLE_DECOR);
    if (!brut) return [];
    const donnees = JSON.parse(brut);
    if (donnees?.version !== 1 || !Array.isArray(donnees.montrees)) return [];
    return donnees.montrees.filter((n) => Number.isInteger(n) && n >= 1 && n <= 25);
  } catch {
    return [];
  }
}

/** Note les portes montrées. Renvoie false si le stockage refuse. */
export function enregistrerMontrees(portes, magasin = stockage()) {
  try {
    const montrees = [...new Set(portes)].sort((a, b) => a - b);
    magasin.setItem(CLE_DECOR, JSON.stringify({ version: 1, montrees }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Ce qu'il faut allumer : toutes les portes ouvertes, dont celles qui viennent de s'ouvrir (jamais montrées).
 * @param {number[]} ouvertes
 * @param {number[]} montrees
 */
export function planAllumage(ouvertes, montrees) {
  const allumees = [...new Set(ouvertes)].sort((a, b) => a - b);
  const deja = new Set(montrees);
  return { allumees, nouvelles: allumees.filter((n) => !deja.has(n)) };
}

/** Retard d'une arrivée, en secondes : elles se suivent, puis partent ensemble au-delà de huit. */
export function retardArrivee(rang) {
  return Math.min(rang, ARRIVEES_ECHELONNEES) * ECART_ARRIVEES;
}

function appliquer() {
  const decor = document.querySelector('.decor');
  const { allumees, nouvelles } = planAllumage(lireOuvertes(), lireMontrees());
  const rang = new Map(nouvelles.map((n, i) => [n, i]));

  for (const n of allumees) {
    const cibles = [
      ...document.querySelectorAll(`.ampoule[data-ampoule="${n}"], .piece[data-piece="${n}"]`),
      ...(rang.has(n) ? document.querySelectorAll(`a.porte--publiee[data-porte="${n}"]`) : []),
    ];
    for (const element of cibles) {
      if (!element.classList.contains('porte')) element.setAttribute('data-allumee', '');
      if (rang.has(n)) {
        element.style.setProperty('--delai', `${retardArrivee(rang.get(n))}s`);
        element.setAttribute('data-nouvelle', '');
      }
    }
  }
  if (nouvelles.length > 0) enregistrerMontrees([...lireMontrees(), ...nouvelles]);
  // Les transitions ne partent qu'après l'état restauré : pas de fondu à chaque chargement.
  requestAnimationFrame(() => requestAnimationFrame(() => decor?.setAttribute('data-pret', '')));
}

function demarrer() {
  if (document.body.dataset.page !== 'mosaique') return;
  appliquer();
  // Retour par l'historique : la page peut revenir figée dans son état d'avant l'ouverture. On la recharge,
  // c'est le plus sûr (coches et allumages repartent de la mémoire).
  window.addEventListener('pageshow', (evenement) => {
    if (evenement.persisted) location.reload();
  });
}

if (typeof document !== 'undefined') demarrer();
