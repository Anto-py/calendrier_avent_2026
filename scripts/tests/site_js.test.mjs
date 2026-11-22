// Les fonctions pures des quatre scripts du navigateur, importées sous Node (le DOM n'est touché
// que si `document` existe).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formaterDecompte } from '../../site/js/compte_a_rebours.js';
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
