// Décor de la mosaïque : un panorama de toits enneigés sous une guirlande de 24 ampoules.
//
// Deux régimes. Le socle (ciel, étoiles, toits, neige du sol, fil et ampoules) est public, il ne dit rien
// de ce qui vient. Les pièces (`contenu/decor/NN.svg`, une par jour) vivent dans le dépôt privé comme les
// illustrations : une pièce n'entre dans la page que si son jour est publié (verrou réel).
//
// Une pièce est un SVG autonome en 400 × 150 (aperçu possible dans n'importe quel éditeur) : la
// construction n'en garde que le contenu. Ses `id` portent le préfixe `pNN-`, ses classes et ses
// animations aussi, puisque tout vit dans la même page.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DERNIERE_CASE, PORTE_COULISSES } from './config.mjs';

export const LARGEUR = 400;
export const HAUTEUR = 150;

const nn = (n) => String(n).padStart(2, '0');
const arrondir = (x) => Math.round(x * 10) / 10;

/** Le fil de la guirlande : deux courbes de Bézier cubiques bout à bout, de bord à bord. */
const FIL = [
  [[-5, 8], [60, 40], [140, 40], [200, 14]],
  [[200, 14], [260, -8], [340, 36], [405, 10]],
];
const CHEMIN_FIL = 'M-5,8 C60,40 140,40 200,14 C260,-8 340,36 405,10';

const COULEURS_AMPOULES = ['var(--retro-orange)', 'var(--retro-jaune)', 'var(--noel-givre)', 'var(--retro-paper)'];

function cubique([p0, p1, p2, p3], t) {
  const u = 1 - t;
  return [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
}

/** Positions des ampoules, réparties à égale distance le long du fil (longueur d'arc, non le paramètre). */
export function positionsAmpoules(nombre = DERNIERE_CASE) {
  const points = [];
  for (const segment of FIL) for (let k = 0; k <= 200; k += 1) points.push(cubique(segment, k / 200));
  const cumul = [0];
  for (let i = 1; i < points.length; i += 1) {
    cumul.push(cumul[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  const total = cumul[cumul.length - 1];
  return Array.from({ length: nombre }, (_, i) => {
    const cible = (total * (i + 0.5)) / nombre;
    const j = cumul.findIndex((longueur) => longueur >= cible);
    return [arrondir(points[j][0]), arrondir(points[j][1])];
  });
}

/**
 * Valide une pièce de décor et en rend le contenu (sans l'enveloppe `<svg>`).
 * Refuse le contenu actif, toute ressource externe et les identifiants sans le préfixe `pNN-`.
 * Les messages ne portent que le numéro du jour : les journaux d'Actions sont publics.
 */
export function preparerPiece(brut, jour) {
  const n = nn(jour);
  const interdit = /<script|\son[a-z]+\s*=|javascript:|<foreignObject|<iframe|<image|<a[\s>]|@import|href\s*=\s*["'](?!#)|url\(\s*["']?(?!#)/i;
  if (interdit.test(brut)) throw new Error(`Décor ${n} : contenu actif ou ressource externe interdit`);
  const enveloppe = brut.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[\s\S]*?>/gi, '').trim();
  const trouve = enveloppe.match(/^<svg[^>]*>([\s\S]*)<\/svg>$/i);
  if (!trouve) throw new Error(`Décor ${n} : un seul élément <svg> attendu, sans rien autour`);
  const contenu = trouve[1].trim();
  if (/<svg[\s>]/i.test(contenu)) throw new Error(`Décor ${n} : <svg> imbriqué interdit`);
  for (const [, id] of contenu.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)) {
    if (!id.startsWith(`p${n}-`)) throw new Error(`Décor ${n} : identifiant sans le préfixe p${n}-`);
  }
  return contenu;
}

/**
 * Lit les pièces des jours publiés, et d'eux seuls. Une pièce absente n'est pas une erreur (le décor
 * est facultatif) ; une pièce invalide l'est.
 * @returns {Promise<{pieces: Map<number,string>, erreurs: string[]}>}
 */
export async function chargerPieces(contenu, jour) {
  const pieces = new Map();
  const erreurs = [];
  for (let n = 1; n <= Math.min(jour, PORTE_COULISSES); n += 1) {
    let brut;
    try {
      brut = await readFile(path.join(contenu, 'decor', `${nn(n)}.svg`), 'utf8');
    } catch (erreur) {
      if (erreur.code !== 'ENOENT') erreurs.push(`Décor ${nn(n)} : illisible`);
      continue;
    }
    try {
      pieces.set(n, preparerPiece(brut, n));
    } catch (erreur) {
      erreurs.push(erreur.message);
    }
  }
  return { pieces, erreurs };
}

// Socle. Teintes de la charte en dur : un SVG n'hérite pas des variables CSS dans un attribut.
const ENCRE = '#0D1617';
const GIVRE = '#DCEBEA';

const ETOILES = [
  [18, 22, 1], [44, 40, 0.8], [72, 14, 1.1], [104, 34, 0.8], [132, 20, 1], [166, 46, 0.7], [196, 38, 0.9],
  [214, 26, 0.8], [282, 36, 1], [296, 22, 0.8], [318, 28, 0.7], [372, 18, 1.1], [388, 44, 0.8], [354, 40, 0.7],
]
  .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${GIVRE}" opacity="0.75"/>`)
  .join('');

const TOITS_FOND =
  'M0,150 V96 L30,78 L60,96 L75,96 L75,84 L110,62 L145,84 L145,96 L190,96 L215,72 L240,96 L270,96 L270,86 L305,66 L340,86 L340,98 L372,80 L400,96 V150 Z';
const TOITS_AVANT =
  'M0,150 V118 L40,104 L80,118 L120,118 L150,100 L180,118 L228,118 L250,102 L272,118 L320,118 L352,98 L385,118 L400,118 V150 Z';
const ARETES_AVANT =
  'M0,118 L40,104 L80,118 L120,118 L150,100 L180,118 L228,118 L250,102 L272,118 L320,118 L352,98 L385,118 L400,118';
const SOL = 'M0,150 V140 Q50,134 100,141 T200,140 T300,141 T400,139 V150 Z';

function socle() {
  return `<defs><linearGradient id="decor-ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ENCRE}"/><stop offset="1" stop-color="#0B4E4E"/></linearGradient></defs>
<rect width="${LARGEUR}" height="${HAUTEUR}" fill="url(#decor-ciel)"/>
${ETOILES}
<path d="${TOITS_FOND}" fill="#0E3C3D"/>
<path d="${TOITS_AVANT}" fill="${ENCRE}"/>
<path d="${ARETES_AVANT}" fill="none" stroke="${GIVRE}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>
<path d="${SOL}" fill="${GIVRE}"/>`;
}

function guirlande(jour) {
  const publiees = Math.min(jour, DERNIERE_CASE);
  const ampoules = positionsAmpoules().map(([x, y], i) => {
    const n = i + 1;
    return `<g class="ampoule" data-ampoule="${n}"${n <= publiees ? ' data-publiee' : ''} transform="translate(${x} ${y})" style="--c:${COULEURS_AMPOULES[i % COULEURS_AMPOULES.length]};--i:${n}"><line class="ampoule-culot" x1="0" y1="0" x2="0" y2="4.6"/><circle class="ampoule-halo" cy="9" r="9"/><circle class="ampoule-verre" cy="9" r="4.2"/></g>`;
  });
  return `<g class="guirlande"><path class="fil" d="${CHEMIN_FIL}"/>${ampoules.join('')}</g>`;
}

/**
 * Le panorama, prêt à être posé dans la page. Purement décoratif (aria-hidden) : l'état des portes
 * se lit dans la mosaïque.
 * @param {object} o
 * @param {number} o.jour jour publié (0 à 25)
 * @param {Map<number,string>} o.pieces pièces déjà préparées, des jours publiés seulement
 */
export function panoramaHtml({ jour, pieces = new Map() }) {
  const groupes = [...pieces.entries()]
    .filter(([n]) => n <= jour)
    .sort(([a], [b]) => a - b)
    .map(([n, contenu]) => `<g class="piece" data-piece="${n}">\n${contenu}\n</g>`)
    .join('\n');
  return `<div class="decor retro-surface" aria-hidden="true">
<svg viewBox="0 0 ${LARGEUR} ${HAUTEUR}" xmlns="http://www.w3.org/2000/svg" focusable="false">
${socle()}
${groupes}
${guirlande(jour)}
</svg>
<noscript><style>.decor .piece{opacity:1}</style></noscript>
</div>`;
}
