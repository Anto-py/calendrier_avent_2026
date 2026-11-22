// Constantes du calendrier. Une seule source, lue par tous les scripts.

export const ANNEE = 2026;
export const FUSEAU = 'Europe/Brussels';

// Décembre est hors heure d'été : Bruxelles y est en UTC+01:00 toute l'année.
export const DECALAGE_DECEMBRE = '+01:00';

export const PREMIERE_PORTE = 1;
export const DERNIERE_CASE = 24; // dernière case-ressource
export const PORTE_COULISSES = 25;

// Adresse publique du site (Pages), sans barre finale. Sert aux balises Open Graph.
export const URL_SITE = 'https://anto-py.github.io/calendrier_avent_2026';

// Grandes portes (BRAINSTORMING §2) : les ressources fortes tombent là.
export const GRANDES_PORTES = [6, 13, 20, 24, 25];

export const ACCES = ['gratuit', 'gratuit_enseignants', 'freemium', 'payant'];
export const BADGES = ['licence_libre', 'sans_pistage', 'conforme_rgpd', 'belge'];
