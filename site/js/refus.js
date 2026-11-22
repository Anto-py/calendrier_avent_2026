// Porte verrouillée : au clic ou au clavier (Entrée, Espace sur un bouton), la porte tressaille,
// reste fermée, et le panneau annonce sa date d'ouverture avec l'indice de la prochaine porte.
// Le seul indice présent dans la page est celui de la prochaine porte, posé par la construction.

/** Texte d'état du panneau. */
export function messageRefus(porte, date) {
  return `Pas encore : la porte ${porte} s'ouvre le ${date}, à minuit.`;
}

/** Texte de l'indice, ou chaîne vide s'il n'y en a pas. */
export function messageIndice(indice) {
  return indice ? `Un indice : ${indice}` : '';
}

function demarrer() {
  const panneau = document.getElementById('indice');
  if (!panneau) return;
  const etat = panneau.querySelector('[data-etat]');
  const indice = panneau.querySelector('[data-indice-texte]');
  const fermer = panneau.querySelector('[data-fermer]');
  const texteIndice = messageIndice(panneau.dataset.indice);

  const masquer = () => {
    panneau.hidden = true;
  };
  fermer?.addEventListener('click', masquer);
  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && !panneau.hidden) masquer();
  });

  for (const porte of document.querySelectorAll('button.porte--verrouillee')) {
    porte.addEventListener('click', () => {
      porte.classList.remove('refus');
      void porte.offsetWidth; // relance l'animation si on retouche la même porte
      porte.classList.add('refus');
      // Sous mouvement réduit, aucune animation ne se termine : on retire la classe au minuteur.
      setTimeout(() => porte.classList.remove('refus'), 600);

      panneau.hidden = false;
      // Le texte vient après l'affichage, pour que la zone vivante l'annonce.
      setTimeout(() => {
        etat.textContent = messageRefus(porte.dataset.porte, porte.dataset.date);
        indice.textContent = texteIndice;
        indice.hidden = texteIndice === '';
      }, 50);
    });
  }
}

if (typeof document !== 'undefined') demarrer();
