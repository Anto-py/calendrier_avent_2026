// Porte verrouillée : au clic ou au clavier (Entrée, Espace sur un bouton), la porte tressaille,
// reste fermée, et le panneau annonce sa date d'ouverture.
// L'indice appartient à la porte qu'il annonce : le seul présent dans la page est celui de la prochaine
// porte, posé par la construction sur son bouton (`data-indice`). Toucher une autre porte verrouillée
// renvoie vers elle (`data-renvoi` du panneau) au lieu d'afficher un indice qui ne la concerne pas.

/** Texte d'état du panneau. */
export function messageRefus(porte, date) {
  return `Pas encore : la porte ${porte} s'ouvre le ${date}, à minuit.`;
}

/** Texte de l'indice, ou chaîne vide s'il n'y en a pas. */
export function messageIndice(indice) {
  return indice ? `Un indice : ${indice}` : '';
}

/** Renvoi vers la prochaine porte, seule à porter un indice. */
export function messageRenvoi(prochaine) {
  return prochaine ? `Seule la prochaine porte, la ${prochaine}, donne un indice : touche-la.` : '';
}

function demarrer() {
  const panneau = document.getElementById('indice');
  if (!panneau) return;
  const etat = panneau.querySelector('[data-etat]');
  const indice = panneau.querySelector('[data-indice-texte]');
  const fermer = panneau.querySelector('[data-fermer]');

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

      // Indice de cette porte si elle en porte un, sinon renvoi vers la prochaine.
      const texteIndice = porte.dataset.indice
        ? messageIndice(porte.dataset.indice)
        : messageRenvoi(panneau.dataset.renvoi);

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
