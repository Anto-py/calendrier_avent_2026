// Aperçu de partage : PNG 1200 × 630 tiré du SVG d'une case.
// 1200 × 630 est le format de Facebook, accepté par LinkedIn ; les réseaux exigent une image
// matricielle à adresse absolue (un SVG n'est pas déplié).
//
// Aucun texte dans l'image : le titre d'un aperçu vient de `og:title`, et le runner Ubuntu n'a pas
// les polices de la charte (un texte SVG y serait mal rendu, SPECS « Texte dans les SVG »).
// resvg ne joue pas les animations CSS : l'illustration doit se lire en image fixe.

import { Resvg } from '@resvg/resvg-js';

export const LARGEUR_APERCU = 1200;
export const HAUTEUR_APERCU = 630;

// Palette de la charte rétrofuturisme.
const ENCRE = '#0D1617';
const PAPIER = '#F2EFE6';
const TEAL = '#127676';
const ORANGE = '#E4632E';
const GIVRE = '#DCEBEA';

/**
 * Compose l'image de partage : fond d'encre, carte papier au cadre orange et teal (écho du cadre
 * de page), cartouche givre portant l'illustration, centrée sans déformation.
 */
export function composerSvg(svgIllustration) {
  if (!/<svg[\s>]/i.test(svgIllustration)) throw new Error("le fichier n'est pas un SVG");
  const illustration = Buffer.from(svgIllustration, 'utf8').toString('base64');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${LARGEUR_APERCU}" height="${HAUTEUR_APERCU}" viewBox="0 0 ${LARGEUR_APERCU} ${HAUTEUR_APERCU}">
<rect width="${LARGEUR_APERCU}" height="${HAUTEUR_APERCU}" fill="${ENCRE}"/>
<rect x="30" y="30" width="1140" height="570" rx="28" fill="${PAPIER}" stroke="${ORANGE}" stroke-width="8"/>
<rect x="42" y="42" width="1116" height="546" rx="20" fill="none" stroke="${TEAL}" stroke-width="4"/>
<rect x="96" y="76" width="1008" height="478" rx="14" fill="${GIVRE}" stroke="${TEAL}" stroke-width="4"/>
<image x="112" y="92" width="976" height="446" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/svg+xml;base64,${illustration}"/>
</svg>`;
}

/** Rend le PNG 1200 × 630 d'une illustration. Lève si le SVG est illisible. */
export function rendrePng(svgIllustration) {
  // Un SVG illisible, glissé dans <image>, est ignoré sans erreur et laisse une carte vide :
  // on le fait lire seul d'abord, ce qui lève s'il est cassé.
  new Resvg(svgIllustration);
  const resvg = new Resvg(composerSvg(svgIllustration), { fitTo: { mode: 'width', value: LARGEUR_APERCU } });
  const png = resvg.render();
  if (png.width !== LARGEUR_APERCU || png.height !== HAUTEUR_APERCU) {
    throw new Error(`aperçu de ${png.width} × ${png.height} au lieu de ${LARGEUR_APERCU} × ${HAUTEUR_APERCU}`);
  }
  return png.asPng();
}
