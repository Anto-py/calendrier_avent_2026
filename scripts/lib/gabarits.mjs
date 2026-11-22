// HTML de la mosaïque, des pages de case et de la page « introuvable ».
// Gabarits en chaînes de caractères, sans moteur. Tout texte venu d'une fiche passe par `echapper`.
// Ce module ne lit aucun fichier : il reçoit des données déjà validées et rend des chaînes.

import { ANNEE, DERNIERE_CASE, GRANDES_PORTES, PORTE_COULISSES, URL_SITE } from './config.mjs';

export const TITRE_SITE = "Calendrier de l'Avent technopédagogique";

const LIBELLES_ACCES = {
  gratuit: 'Gratuit',
  gratuit_enseignants: 'Gratuit pour les enseignants',
  freemium: 'Freemium : offre gratuite limitée',
  payant: 'Payant',
};
const LIBELLES_BADGES = {
  licence_libre: 'Licence libre',
  sans_pistage: 'Sans pistage',
  conforme_rgpd: 'Conforme RGPD',
  belge: 'Belge',
};

const nn = (n) => String(n).padStart(2, '0');

export function echapper(valeur) {
  return String(valeur)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** « 1er décembre », « 7 décembre ». */
export function dateOuverture(porte) {
  return `${porte === 1 ? '1er' : porte} décembre`;
}

/** Coupe au dernier mot entier avant `max` signes, ajoute une ellipse si on a coupé. */
export function resumer(texte, max = 200) {
  const plat = texte.replace(/\s+/g, ' ').trim();
  if (plat.length <= max) return plat;
  const coupe = plat.slice(0, max);
  return `${coupe.slice(0, coupe.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '')}…`;
}

/** Racine des chemins du site pour les pages servies à n'importe quelle profondeur (404). */
export function racineAbsolue() {
  return `${new URL(URL_SITE).pathname.replace(/\/$/, '')}/`;
}

/**
 * Prépare un SVG pour l'insérer dans la page : retire prologue et doctype, refuse le contenu actif,
 * le déclare décoratif (le texte alternatif est porté par la figure qui l'entoure).
 */
export function preparerSvg(brut, jour) {
  if (/<script|\son[a-z]+\s*=|javascript:|<foreignObject|<iframe/i.test(brut)) {
    throw new Error(`illustration ${nn(jour)} : contenu actif interdit dans un SVG`);
  }
  const propre = brut
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .trim();
  if (!/^<svg[\s>]/i.test(propre)) throw new Error(`illustration ${nn(jour)} : le fichier ne commence pas par <svg>`);
  return propre.replace(/^<svg/i, '<svg aria-hidden="true" focusable="false"');
}

// Ornement de coin : variante B (floral Nouveau) de la charte, défini une fois, réutilisé quatre fois.
const SYMBOLE_FLEURON = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><symbol id="fleuron" viewBox="0 0 100 100" fill="currentColor"><path d="M5,95 Q5,5 95,5 Q70,5 55,20 C40,35 45,55 30,65 Q15,75 5,95 Z" opacity="0.3"/><path d="M10,90 Q10,25 75,10" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="75" cy="10" r="6"/><circle cx="55" cy="22" r="4"/><circle cx="38" cy="38" r="3"/><path d="M20,80 Q25,60 40,55 Q55,50 50,35" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="80" r="5"/><path d="M60,30 Q70,20 80,25 Q75,35 60,30 Z"/></symbol></svg>`;

const COINS = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
  .map((coin) => `<svg class="corner-flourish ${coin}" aria-hidden="true" focusable="false"><use href="#fleuron"/></svg>`)
  .join('');

function pied() {
  return `<footer class="retro-footer">
  <p class="retro-footer-ornament" aria-hidden="true">❄</p>
  <p class="retro-footer-credit">Made by <a class="retro-footer-link" href="https://www.linkedin.com/in/antonin-bareau/" target="_blank" rel="noopener noreferrer">Antonin Bareau</a> avec l’aide essentielle d’un ou plusieurs LLM</p>
  <p class="retro-footer-licence"><a class="retro-footer-link" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">Licence CC BY-SA 4.0</a></p>
</footer>`;
}

/**
 * Enveloppe commune.
 * @param {object} o
 * @param {string} o.racine préfixe des chemins vers css/, js/, etc. ('' à la racine, '../' d'une case)
 * @param {string} o.titre titre de l'onglet
 * @param {string} o.description
 * @param {string} o.corps HTML du contenu du cadre
 * @param {string} o.attributsCorps attributs du <body>
 * @param {string[]} o.feuilles feuilles de style en plus de charte.css et mouvement.css
 * @param {string[]} o.scripts modules JS
 * @param {string} o.og balises Open Graph déjà rendues
 * @param {string} o.apres HTML posé après le cadre
 */
function enveloppe({ racine, titre, description, corps, attributsCorps = '', feuilles = [], scripts = [], og = '', apres = '' }) {
  const accueil = racine || './';
  const liens = ['css/charte.css', 'css/neige.css', ...feuilles, 'css/mouvement.css']
    .map((f) => `<link rel="stylesheet" href="${racine}${f}">`)
    .join('\n');
  const modules = scripts.map((s) => `<script type="module" src="${racine}js/${s}"></script>`).join('\n');
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapper(titre)}</title>
<meta name="description" content="${echapper(description)}">
<meta name="theme-color" content="#127676">
${og}
${liens}
</head>
<body ${attributsCorps}>
<div class="neige" aria-hidden="true"><i></i><i></i><i></i></div>
${SYMBOLE_FLEURON}
<header class="retro-header">
  <a class="retro-logo" href="${accueil}">Avent technopédagogique</a>
  <span class="retro-header-annee">${ANNEE}</span>
</header>
<div class="page-frame retro-surface">
${COINS}
${corps}
${pied()}
</div>
${apres}
${modules}
</body>
</html>
`;
}

function balisesOg({ titre, description, url, image }) {
  const lignes = [
    ['og:type', 'website'],
    ['og:locale', 'fr_BE'],
    ['og:site_name', TITRE_SITE],
    ['og:title', titre],
    ['og:description', description],
    ['og:url', url],
  ];
  if (image) {
    lignes.push(['og:image', image], ['og:image:width', '1200'], ['og:image:height', '630']);
  }
  const metas = lignes.map(([p, v]) => `<meta property="${p}" content="${echapper(v)}">`);
  metas.push(`<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`);
  return metas.join('\n');
}

/** Phrase d'accueil selon l'avancement du calendrier. */
function introAccueil(jour) {
  if (jour === 0) {
    return "Les portes s'ouvrent à partir du 1er décembre, une par jour, à minuit (heure de Bruxelles). Une ressource coup de cœur derrière chacune, pour enseigner avec le numérique.";
  }
  if (jour >= PORTE_COULISSES) {
    return "Les 25 portes sont ouvertes. Le calendrier reste en archive : rien ne se perd, tout se rouvre.";
  }
  return "Une ressource technopédagogique par jour. Touche une porte ouverte pour la découvrir ; les autres patientent jusqu'à minuit.";
}

function porteHtml(n, { jour, titres, prochaine }) {
  const grande = GRANDES_PORTES.includes(n);
  const classes = ['porte', 'retro-surface'];
  if (grande) classes.push('porte--grande');
  if (n === PORTE_COULISSES) classes.push('porte--coulisses');

  if (n <= jour) {
    const titre = titres.get(n);
    classes.push('porte--publiee');
    return `<li><a class="${classes.join(' ')}" href="${nn(n)}/" data-porte="${n}" style="view-transition-name: porte-${nn(n)}">
  <span class="sr-only">Porte </span><span class="porte-numero">${n}</span>
  <span class="porte-titre">${echapper(titre)}</span>
  <span class="porte-vue" aria-hidden="true">✓</span>
</a></li>`;
  }

  classes.push('porte--verrouillee');
  const date = dateOuverture(n);
  const estProchaine = prochaine && prochaine.porte === n;
  if (estProchaine) classes.push('porte--prochaine');
  const etiquette = estProchaine
    ? `Porte ${n}, verrouillée, la prochaine, s'ouvre le ${date} à minuit`
    : `Porte ${n}, verrouillée, s'ouvre le ${date}`;
  const decompte = estProchaine
    ? `\n  <span class="porte-decompte" data-cible="${echapper(prochaine.cible)}" aria-hidden="true">Le ${n === 1 ? '1er' : n} déc.</span>`
    : '';
  // L'indice appartient à la porte qu'il annonce : posé sur la prochaine porte seulement.
  const indice = estProchaine && prochaine.indice ? ` data-indice="${echapper(prochaine.indice)}"` : '';
  return `<li><button type="button" class="${classes.join(' ')}" data-porte="${n}" data-date="${date}"${indice} aria-label="${echapper(etiquette)}">
  <span class="porte-numero" aria-hidden="true">${n}</span>${decompte}
  <span class="porte-cadenas" aria-hidden="true"></span>
</button></li>`;
}

/**
 * Mosaïque.
 * @param {object} o
 * @param {number} o.jour jour publié (0 à 25)
 * @param {Map<number,string>} o.titres titre affiché de chaque porte publiée
 * @param {{porte:number, cible:string, indice?:string}|null} o.prochaine prochaine porte, null si tout est ouvert
 * @param {string} [o.panorama] décor déjà rendu par `panoramaHtml` (vide : pas de décor)
 */
export function pageMosaique({ jour, titres, prochaine, panorama = '' }) {
  const portes = [];
  for (let n = 1; n <= PORTE_COULISSES; n += 1) portes.push(porteHtml(n, { jour, titres, prochaine }));

  const panneau = prochaine
    ? `<aside id="indice" class="indice retro-surface" role="status" hidden${prochaine.indice ? ` data-renvoi="${prochaine.porte}"` : ''}>
  <p class="indice-etat" data-etat></p>
  <p class="indice-indice" data-indice-texte></p>
  <button type="button" class="indice-fermer" data-fermer aria-label="Fermer l'indice">×</button>
</aside>`
    : '';

  const corps = `<main>
  <div class="accueil-titre">
    <p class="accueil-oeil">Du 1er au 24 décembre ${ANNEE}</p>
    <h1>Calendrier de l'Avent <span>technopédagogique</span></h1>
    <p class="accueil-intro">${echapper(introAccueil(jour))}</p>
  </div>
${panorama}
  <div class="mosaique-carte retro-surface">
    <ol class="mosaique" aria-label="Les ${PORTE_COULISSES} portes du calendrier">
${portes.join('\n')}
    </ol>
  </div>
  <p class="mosaique-legende"><span aria-hidden="true">✓</span> Porte déjà ouverte sur cet appareil. Chaque porte ouverte allume une ampoule de la guirlande et réveille un détail du décor.</p>
  <div class="retro-separator" aria-hidden="true">❄ ✶ ❄</div>
</main>`;

  const description = `${DERNIERE_CASE} ressources technopédagogiques coups de cœur, une porte par jour du 1er au 24 décembre ${ANNEE}.`;
  return enveloppe({
    racine: '',
    titre: TITRE_SITE,
    description,
    corps,
    attributsCorps: 'data-page="mosaique"',
    feuilles: ['css/mosaique.css', 'css/decor.css', 'css/gags.css'],
    scripts: ['memoire.js', 'compte_a_rebours.js', 'refus.js', 'decor.js', 'gags.js'],
    og: balisesOg({ titre: TITRE_SITE, description, url: `${URL_SITE}/` }),
    apres: panneau,
  });
}

/** Page d'une case publiée. `svg` est le SVG déjà préparé par `preparerSvg`. */
export function pageCase({ fiche, svg }) {
  const jour = fiche.jour;
  const coulisses = jour === PORTE_COULISSES;
  const urlCase = `${URL_SITE}/${nn(jour)}/`;

  const paragraphes = fiche.presentation
    .split(/\n{2,}/)
    .map((p) => `<p>${echapper(p.trim())}</p>`)
    .join('\n    ');

  const etiquettes = [];
  if (!coulisses) {
    etiquettes.push(`<li class="etiquette etiquette--acces">${echapper(LIBELLES_ACCES[fiche.acces])}</li>`);
    for (const badge of fiche.badges ?? []) etiquettes.push(`<li class="etiquette">${echapper(LIBELLES_BADGES[badge])}</li>`);
  }

  let actions = '';
  if (!coulisses) {
    const principal = `<a class="retro-btn" href="${echapper(fiche.url)}" target="_blank" rel="noopener noreferrer">Ouvrir ${echapper(fiche.titre)} <span aria-hidden="true">↗</span><span class="sr-only">(nouvel onglet)</span></a>`;
    const secondaires = (fiche.liens ?? []).map(
      (lien) => `<a class="retro-btn retro-btn-secondaire" href="${echapper(lien.url)}" target="_blank" rel="noopener noreferrer">${echapper(lien.libelle)} <span aria-hidden="true">↗</span><span class="sr-only">(nouvel onglet)</span></a>`,
    );
    actions = `\n  <div class="fiche-actions">\n    ${[principal, ...secondaires].join('\n    ')}\n  </div>`;
  }

  const description = resumer(fiche.presentation, 200);
  const titrePage = `${fiche.titre} · ${TITRE_SITE}`;

  const corps = `<main>
<article class="fiche retro-card retro-surface" data-jour="${nn(jour)}" style="view-transition-name: porte-${nn(jour)}">
  <p class="fiche-jour">Porte ${jour} · ${dateOuverture(jour)} ${ANNEE}</p>
  <h1>${echapper(fiche.titre)}</h1>
  <figure class="fiche-illustration" role="img" aria-label="${echapper(fiche.illustration.alt)}">
${svg}
  </figure>
  <div class="fiche-presentation">
    ${paragraphes}
  </div>${etiquettes.length > 0 ? `\n  <ul class="fiche-etiquettes" aria-label="Accès et caractéristiques">\n    ${etiquettes.join('\n    ')}\n  </ul>` : ''}${actions}
  <p class="fiche-retour"><a class="lien-retour" href="../">← Retour au calendrier</a></p>
</article>
</main>`;

  return enveloppe({
    racine: '../',
    titre: titrePage,
    description,
    corps,
    attributsCorps: `data-page="case" data-case="${jour}"`,
    feuilles: ['css/fiche.css', `animations/${nn(jour)}.css`],
    scripts: ['memoire.js'],
    og: balisesOg({ titre: titrePage, description, url: urlCase, image: `${URL_SITE}/apercus/${nn(jour)}.png` }),
  });
}

/** Page « introuvable » : chemins absolus depuis la racine du site, elle est servie à toute profondeur. */
export function page404() {
  const racine = racineAbsolue();
  const corps = `<main>
<article class="introuvable retro-card retro-surface">
  <h1>Cette porte reste fermée</h1>
  <p>La page demandée n'existe pas, ou pas encore. Les portes s'ouvrent une à une, à minuit.</p>
  <a class="retro-btn" href="${racine}">Retour au calendrier</a>
</article>
</main>`;
  return enveloppe({
    racine,
    titre: `Page introuvable · ${TITRE_SITE}`,
    description: 'Cette page du calendrier de l’Avent n’existe pas, ou pas encore.',
    corps,
    feuilles: ['css/fiche.css'],
  });
}
