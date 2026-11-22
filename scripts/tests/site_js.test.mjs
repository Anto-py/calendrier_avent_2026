// Les fonctions pures des quatre scripts du navigateur, importées sous Node (le DOM n'est touché
// que si `document` existe).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formaterDecompte } from '../../site/js/compte_a_rebours.js';
import { CLE_DECOR, enregistrerMontrees, lireMontrees, planAllumage, retardArrivee } from '../../site/js/decor.js';
import { DELAI_ENTRE, DELAI_PREMIER, GAGS, NOTES, choisir, delaiAleatoire } from '../../site/js/gags.js';
import { CLE, inscrire, lireOuvertes } from '../../site/js/memoire.js';
import { messageIndice, messageRefus, messageRenvoi } from '../../site/js/refus.js';

function magasinFactice(initial = {}) {
  const donnees = { ...initial };
  return {
    donnees,
    getItem: (k) => donnees[k] ?? null,
    setItem: (k, v) => {
      donnees[k] = v;
    },
  };
}

const magasinQuiLeve = {
  getItem() {
    throw new Error('stockage bloqué');
  },
  setItem() {
    throw new Error('stockage bloqué');
  },
};

test('décompte : au-delà d\'un jour, jours et heures ; en deçà, HH:MM:SS ; à zéro ou après, 00:00:00', () => {
  assert.equal(formaterDecompte(2 * 86400_000 + 3 * 3600_000 + 59_000), '2 j 03 h');
  assert.equal(formaterDecompte(3 * 3600_000 + 12 * 60_000 + 45_000), '03:12:45');
  assert.equal(formaterDecompte(999), '00:00:00');
  assert.equal(formaterDecompte(0), '00:00:00');
  assert.equal(formaterDecompte(-5000), '00:00:00');
  assert.equal(formaterDecompte(Number.NaN), '00:00:00');
});

test('mémoire : inscription, ordre, pas de doublon, format { version: 1, ouvertes }', () => {
  const magasin = magasinFactice();
  assert.deepEqual(lireOuvertes(magasin), []);
  assert.equal(inscrire(4, magasin), true);
  inscrire(1, magasin);
  inscrire(4, magasin);
  assert.deepEqual(JSON.parse(magasin.donnees[CLE]), { version: 1, ouvertes: [1, 4] });
  assert.deepEqual(lireOuvertes(magasin), [1, 4]);
});

test('mémoire : contenu illisible ou d\'une autre version, on repart de zéro sans lever', () => {
  assert.deepEqual(lireOuvertes(magasinFactice({ [CLE]: '{ pas du json' })), []);
  assert.deepEqual(lireOuvertes(magasinFactice({ [CLE]: JSON.stringify({ version: 2, ouvertes: [1] }) })), []);
  assert.deepEqual(lireOuvertes(magasinFactice({ [CLE]: JSON.stringify({ version: 1, ouvertes: [1, 'x', 99, 3] }) })), [1, 3]);
});

test('mémoire : stockage bloqué ou absent, rien ne lève', () => {
  assert.deepEqual(lireOuvertes(magasinQuiLeve), []);
  assert.equal(inscrire(3, magasinQuiLeve), false);
  assert.deepEqual(lireOuvertes(null), []);
  assert.equal(inscrire(3, null), false);
});

test('refus : message de date et indice facultatif', () => {
  assert.equal(messageRefus('9', '9 décembre'), "Pas encore : la porte 9 s'ouvre le 9 décembre, à minuit.");
  assert.equal(messageIndice('Demain, un cadeau.'), 'Un indice : Demain, un cadeau.');
  assert.equal(messageIndice(undefined), '');
  assert.equal(messageIndice(''), '');
});

test('refus : une porte sans indice renvoie vers la prochaine, sans renvoi s\'il n\'y a pas d\'indice à chercher', () => {
  assert.equal(messageRenvoi('6'), 'Seule la prochaine porte, la 6, donne un indice : touche-la.');
  assert.equal(messageRenvoi(undefined), '');
  assert.equal(messageRenvoi(''), '');
});

test('décor : la mémoire des allumages montrés a son format et survit à un stockage illisible ou bloqué', () => {
  const magasin = magasinFactice();
  assert.deepEqual(lireMontrees(magasin), []);
  assert.equal(enregistrerMontrees([4, 1, 4], magasin), true);
  assert.deepEqual(JSON.parse(magasin.donnees[CLE_DECOR]), { version: 1, montrees: [1, 4] });
  assert.deepEqual(lireMontrees(magasin), [1, 4]);
  assert.deepEqual(lireMontrees(magasinFactice({ [CLE_DECOR]: '{ pas du json' })), []);
  assert.deepEqual(lireMontrees(magasinFactice({ [CLE_DECOR]: JSON.stringify({ version: 2, montrees: [1] }) })), []);
  assert.deepEqual(lireMontrees(magasinQuiLeve), []);
  assert.equal(enregistrerMontrees([1], magasinQuiLeve), false);
  assert.equal(enregistrerMontrees([1], null), false);
});

test('décor : toutes les portes ouvertes s\'allument, seules celles jamais montrées arrivent avec leur animation', () => {
  assert.deepEqual(planAllumage([3, 1, 3], [1]), { allumees: [1, 3], nouvelles: [3] });
  assert.deepEqual(planAllumage([], []), { allumees: [], nouvelles: [] });
  assert.deepEqual(planAllumage([2], [2]), { allumees: [2], nouvelles: [] });
});

test('décor : les arrivées se suivent puis partent ensemble au-delà de huit', () => {
  assert.equal(retardArrivee(0), 0);
  assert.ok(Math.abs(retardArrivee(2) - 0.6) < 1e-9);
  assert.equal(retardArrivee(8), retardArrivee(20));
});

test('gags : délais dans les bornes, jamais deux fois le même, repli sur l\'unique candidat', () => {
  assert.equal(delaiAleatoire(DELAI_PREMIER, () => 0), DELAI_PREMIER[0]);
  assert.equal(delaiAleatoire(DELAI_ENTRE, () => 0.999999), DELAI_ENTRE[1]);
  assert.ok(DELAI_ENTRE[0] >= DELAI_PREMIER[1]);
  assert.equal(choisir(['a', 'b'], 'a', () => 0), 'b');
  assert.equal(choisir(['a'], 'a', () => 0.5), 'a');
  assert.equal(choisir([], 'a'), null);
  assert.equal(choisir(['a', 'b', 'c'], null, () => 0.999999), 'c');
  for (let i = 0; i < 200; i += 1) assert.notEqual(choisir(['a', 'b', 'c'], 'b'), 'b');
});

test('gags : cinq gags aux noms distincts, des notes de classe pour la copie corrigée', () => {
  assert.deepEqual(GAGS.map((g) => g.nom), ['cadenas', 'flocon', 'chargement', 'copie', 'chenillard']);
  assert.equal(new Set(NOTES).size, NOTES.length);
  for (const gag of GAGS) assert.equal(typeof gag.jouer, 'function');
});

test('gags : un gag ne se propose que s\'il a de quoi jouer sur la page', () => {
  const vide = { portes: [], verrouillees: [], prochaine: null, decor: null };
  for (const gag of GAGS) assert.equal(gag.possible(vide), false, gag.nom);
  const plein = { portes: [{}], verrouillees: [{}], prochaine: {}, decor: {} };
  assert.equal(GAGS.find((g) => g.nom === 'cadenas').possible(plein), true);
  assert.equal(GAGS.find((g) => g.nom === 'chargement').possible(plein), true);
  assert.equal(GAGS.find((g) => g.nom === 'chenillard').possible(plein), true);
  assert.equal(GAGS.find((g) => g.nom === 'copie').possible(plein), true);
});
