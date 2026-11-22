import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cibleOuverture,
  cibleProchainePorte,
  dateCivile,
  jourPublie,
  jourPublieA,
  prochainePorte,
} from '../lib/calendrier.mjs';

test('la veille du 1er décembre à 23 h 59 (Bruxelles), rien n\'est publié', () => {
  assert.equal(jourPublieA(new Date('2026-11-30T23:59:00+01:00')), 0);
});

test('le 1er décembre à minuit pile (Bruxelles), la porte 1 est publiée', () => {
  assert.equal(jourPublieA(new Date('2026-12-01T00:00:00+01:00')), 1);
});

test('le jour se lit à Bruxelles, pas en UTC', () => {
  // 23 h 30 UTC le 30 novembre = 0 h 30 le 1er décembre à Bruxelles.
  assert.equal(dateCivile(new Date('2026-11-30T23:30:00Z')), '2026-12-01');
  assert.equal(jourPublieA(new Date('2026-11-30T23:30:00Z')), 1);
  // 22 h 59 UTC le 30 novembre = 23 h 59 à Bruxelles, encore novembre.
  assert.equal(jourPublieA(new Date('2026-11-30T22:59:00Z')), 0);
});

test('chaque jour de décembre du 1er au 24 publie son numéro', () => {
  for (let n = 1; n <= 24; n += 1) {
    const civile = `2026-12-${String(n).padStart(2, '0')}`;
    assert.equal(jourPublie(civile), n, civile);
  }
});

test('le 24 décembre publie 24, le 25 et après publient tout (25)', () => {
  assert.equal(jourPublie('2026-12-24'), 24);
  assert.equal(jourPublie('2026-12-25'), 25);
  assert.equal(jourPublie('2026-12-31'), 25);
  assert.equal(jourPublie('2027-01-10'), 25);
});

test('une date très en amont ne publie rien', () => {
  assert.equal(jourPublie('2026-11-25'), 0);
  assert.equal(jourPublie('2025-12-05'), 0);
});

test('un format de date erroné lève', () => {
  assert.throws(() => jourPublie('05/12/2026'), /AAAA-MM-JJ/);
  assert.throws(() => jourPublie('2026-12-5'), /AAAA-MM-JJ/);
});

test('la cible de la porte 5 est minuit de Bruxelles', () => {
  assert.equal(cibleOuverture(5), '2026-12-05T00:00:00+01:00');
  assert.equal(cibleOuverture(25), '2026-12-25T00:00:00+01:00');
});

test('une porte hors de 1 à 25 lève', () => {
  assert.throws(() => cibleOuverture(0));
  assert.throws(() => cibleOuverture(26));
  assert.throws(() => cibleOuverture(2.5));
});

test('la prochaine porte et sa cible suivent le jour publié', () => {
  assert.equal(prochainePorte(0), 1);
  assert.equal(cibleProchainePorte(0), '2026-12-01T00:00:00+01:00');
  assert.equal(prochainePorte(4), 5);
  assert.equal(cibleProchainePorte(4), '2026-12-05T00:00:00+01:00');
  assert.equal(prochainePorte(24), 25);
});

test('une fois tout ouvert, il n\'y a plus de compte à rebours', () => {
  assert.equal(prochainePorte(25), null);
  assert.equal(cibleProchainePorte(25), null);
});
