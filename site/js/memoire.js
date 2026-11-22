// Mémoire des portes ouvertes. Clé `calendrier_avent_2026`, format { version: 1, ouvertes: [1, 2, 4] }.
// Tout accès au stockage est sous try/catch : navigation privée, blocage, quota. Sans stockage, le
// calendrier marche, sans marque d'ouverture.

export const CLE = 'calendrier_avent_2026';

/** Le stockage du navigateur, ou null s'il est indisponible (même l'accès à la propriété peut lever). */
export function stockage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Portes déjà ouvertes. Tableau vide si rien, si le contenu est illisible ou d'une autre version. */
export function lireOuvertes(magasin = stockage()) {
  try {
    const brut = magasin.getItem(CLE);
    if (!brut) return [];
    const donnees = JSON.parse(brut);
    if (donnees?.version !== 1 || !Array.isArray(donnees.ouvertes)) return [];
    return donnees.ouvertes.filter((n) => Number.isInteger(n) && n >= 1 && n <= 25);
  } catch {
    return [];
  }
}

/** Inscrit une porte. Renvoie false si le stockage refuse. */
export function inscrire(jour, magasin = stockage()) {
  try {
    const ouvertes = new Set(lireOuvertes(magasin));
    ouvertes.add(jour);
    magasin.setItem(CLE, JSON.stringify({ version: 1, ouvertes: [...ouvertes].sort((a, b) => a - b) }));
    return true;
  } catch {
    return false;
  }
}

function demarrer() {
  const { page } = document.body.dataset;
  const jourCase = document.body.dataset.case;
  if (page === 'case' && jourCase) {
    inscrire(Number(jourCase));
  } else if (page === 'mosaique') {
    const ouvertes = new Set(lireOuvertes());
    for (const porte of document.querySelectorAll('a.porte--publiee[data-porte]')) {
      if (!ouvertes.has(Number(porte.dataset.porte))) continue;
      porte.setAttribute('data-vue', '');
      // La coche est décorative : on dit la même chose à qui ne la voit pas.
      const annonce = document.createElement('span');
      annonce.className = 'sr-only';
      annonce.textContent = ' (déjà ouverte)';
      porte.append(annonce);
    }
  }
}

if (typeof document !== 'undefined') demarrer();
