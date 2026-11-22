// Petits gags sur la grille, pour le rythme. Un premier peu après l'arrivée, puis un autre toutes les
// 30 à 50 secondes, jamais le même deux fois de suite. Rien ne se joue onglet caché, panneau d'indice
// ouvert ou sous mouvement réduit. Tout ce que le script pose est décoratif (aria-hidden) et retiré après.

export const DELAI_PREMIER = [4000, 8000];
export const DELAI_ENTRE = [30000, 50000];
const DELAI_REPORT = 5000; // on réessaie un peu plus tard quand ce n'est pas le moment

export const NOTES = ['A+', '20/20', 'Bravo !', 'Vu', 'Très bien', '10/10'];

/** Durée aléatoire dans [min, max], en millisecondes. `hasard` renvoie un nombre dans [0, 1[. */
export function delaiAleatoire([min, max], hasard = Math.random) {
  return Math.round(min + hasard() * (max - min));
}

/** Choisit parmi les candidats sans reprendre le dernier gag, sauf s'il est le seul possible. */
export function choisir(candidats, dernier, hasard = Math.random) {
  const autres = candidats.filter((c) => c !== dernier);
  const liste = autres.length > 0 ? autres : candidats;
  if (liste.length === 0) return null;
  return liste[Math.min(Math.floor(hasard() * liste.length), liste.length - 1)];
}

const au = (liste, hasard) => liste[Math.min(Math.floor(hasard() * liste.length), liste.length - 1)];

/** Pose un élément décoratif dans la carte, aux coordonnées de la carte, et le retire après `duree` ms. */
function poser(ctx, element, duree) {
  element.setAttribute('aria-hidden', 'true');
  ctx.carte.append(element);
  setTimeout(() => element.remove(), duree);
}

function positionDans(carte, porte) {
  const c = carte.getBoundingClientRect();
  const p = porte.getBoundingClientRect();
  return { x: p.left - c.left, y: p.top - c.top, l: p.width, h: p.height };
}

// Chaque gag : `possible(ctx)` dit s'il a de quoi jouer sur cette page, `jouer(ctx, hasard)` le joue.
export const GAGS = [
  {
    nom: 'cadenas',
    possible: (ctx) => ctx.verrouillees.length > 0,
    jouer(ctx, hasard) {
      const porte = au(ctx.verrouillees, hasard);
      porte.classList.add('gag-cadenas');
      setTimeout(() => porte.classList.remove('gag-cadenas'), 1300);
    },
  },
  {
    nom: 'flocon',
    possible: (ctx) => ctx.verrouillees.length > 0 && typeof Element.prototype.animate === 'function',
    jouer(ctx, hasard) {
      const porte = au(ctx.verrouillees, hasard);
      const { x, y, l } = positionDans(ctx.carte, porte);
      const flocon = document.createElement('span');
      flocon.className = 'gag-flocon';
      flocon.textContent = '❄';
      const gauche = x + l / 2 - 8;
      const depart = Math.max(-6, y - 80);
      poser(ctx, flocon, 1500);
      flocon
        .animate(
          [
            { transform: `translate(${gauche}px, ${depart}px) rotate(0deg)`, opacity: 0.9 },
            { transform: `translate(${gauche + 6}px, ${y + 4}px) rotate(200deg)`, opacity: 1 },
          ],
          { duration: 1000, easing: 'ease-in', fill: 'forwards' },
        )
        .finished.then(() => {
          flocon.remove();
          // La porte encaisse comme si on l'avait touchée.
          porte.classList.remove('refus');
          void porte.offsetWidth;
          porte.classList.add('refus');
          setTimeout(() => porte.classList.remove('refus'), 600);
        })
        .catch(() => {});
    },
  },
  {
    nom: 'chargement',
    possible: (ctx) => ctx.prochaine !== null,
    jouer(ctx) {
      const boite = document.createElement('span');
      boite.className = 'gag-chargement';
      boite.append('Père Noël 87 %', document.createElement('i'));
      boite.setAttribute('aria-hidden', 'true');
      ctx.prochaine.append(boite);
      setTimeout(() => boite.remove(), 5300);
    },
  },
  {
    nom: 'copie',
    possible: (ctx) => ctx.portes.length > 0,
    jouer(ctx, hasard) {
      const porte = au(ctx.portes, hasard);
      const { x, y, l, h } = positionDans(ctx.carte, porte);
      const note = document.createElement('span');
      note.className = 'gag-note';
      note.textContent = au(NOTES, hasard);
      note.style.left = `${x + l * 0.2}px`;
      note.style.top = `${y + h * 0.25}px`;
      poser(ctx, note, 2500);
      // Une porte du bord droit ne doit pas faire déborder la note hors de la carte.
      const trop = x + l * 0.2 + note.offsetWidth - (ctx.carte.clientWidth - 10);
      if (trop > 0) note.style.left = `${Math.max(4, x + l * 0.2 - trop)}px`;
    },
  },
  {
    nom: 'chenillard',
    possible: (ctx) => ctx.decor !== null,
    jouer(ctx) {
      ctx.decor.classList.add('gag-chenillard');
      setTimeout(() => ctx.decor.classList.remove('gag-chenillard'), 2700);
    },
  },
];

function contexte() {
  const carte = document.querySelector('.mosaique-carte');
  if (!carte) return null;
  return {
    carte,
    portes: [...carte.querySelectorAll('.porte')],
    verrouillees: [...carte.querySelectorAll('button.porte--verrouillee')],
    prochaine: carte.querySelector('.porte--prochaine'),
    decor: document.querySelector('.decor'),
  };
}

const mouvementReduit = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function demarrer() {
  if (document.body.dataset.page !== 'mosaique' || mouvementReduit()) return;
  let dernier = null;

  const tour = () => {
    const panneau = document.getElementById('indice');
    if (document.hidden || mouvementReduit() || (panneau && !panneau.hidden)) {
      setTimeout(tour, DELAI_REPORT);
      return;
    }
    const ctx = contexte();
    const gag = ctx ? choisir(GAGS.filter((g) => g.possible(ctx)), dernier) : null;
    if (gag) {
      dernier = gag;
      gag.jouer(ctx, Math.random);
    }
    setTimeout(tour, delaiAleatoire(DELAI_ENTRE));
  };

  setTimeout(tour, delaiAleatoire(DELAI_PREMIER));
}

if (typeof document !== 'undefined') demarrer();
