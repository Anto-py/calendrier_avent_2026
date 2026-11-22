// Compte à rebours jusqu'à minuit de Bruxelles. La cible arrive toute faite dans `data-cible`
// (ISO avec décalage), calculée à la construction : aucun calcul de fuseau côté visiteur.
// À zéro, le décompte s'arrête et n'ouvre rien : la porte s'ouvre à la publication réelle.

const deuxChiffres = (n) => String(n).padStart(2, '0');

/** « 2 j 03 h » au-delà d'un jour, « 03:12:45 » en deçà, « 00:00:00 » à zéro ou après. */
export function formaterDecompte(ms) {
  if (!(ms > 0)) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const jours = Math.floor(total / 86400);
  const heures = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secondes = total % 60;
  if (jours >= 1) return `${jours} j ${deuxChiffres(heures)} h`;
  return `${deuxChiffres(heures)}:${deuxChiffres(minutes)}:${deuxChiffres(secondes)}`;
}

function demarrer() {
  for (const element of document.querySelectorAll('[data-cible]')) {
    const cible = Date.parse(element.dataset.cible);
    if (Number.isNaN(cible)) continue;
    const afficher = () => {
      const reste = cible - Date.now();
      element.textContent = formaterDecompte(reste);
      return reste > 0;
    };
    if (!afficher()) continue;
    const minuteur = setInterval(() => {
      if (!afficher()) clearInterval(minuteur);
    }, 1000);
  }
}

if (typeof document !== 'undefined') demarrer();
