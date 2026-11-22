// Le décor : validation des pièces, verrou par jour, guirlande, panorama.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chargerPieces, panoramaHtml, positionsAmpoules, preparerPiece } from '../lib/decor.mjs';

const piece = (n, dedans = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 150"><circle id="p${String(n).padStart(2, '0')}-c" cx="1" cy="1" r="1"/>${dedans}</svg>`;

test('pièce valide : seul le contenu est gardé, sans l\'enveloppe svg', () => {
  const contenu = preparerPiece(piece(3), 3);
  assert.match(contenu, /^<circle id="p03-c"/);
  assert.doesNotMatch(contenu, /<svg/);
});

test('pièce : contenu actif, ressource externe et identifiant sans préfixe sont refusés', () => {
  assert.throws(() => preparerPiece(piece(3, '<script>x()</script>'), 3), /interdit/);
  assert.throws(() => preparerPiece(piece(3, '<circle onclick="x()"/>'), 3), /interdit/);
  assert.throws(() => preparerPiece(piece(3, '<image href="https://exemple.test/a.png"/>'), 3), /interdit/);
  assert.throws(() => preparerPiece(piece(3, '<use href="https://exemple.test/a.svg#b"/>'), 3), /interdit/);
  assert.throws(() => preparerPiece(piece(3, '<style>@import "https://exemple.test/a.css";</style>'), 3), /interdit/);
  assert.throws(() => preparerPiece(piece(3, '<rect style="fill:url(https://exemple.test/a)"/>'), 3), /interdit/);
  assert.throws(() => preparerPiece(piece(3, '<svg></svg>'), 3), /imbriqué/);
  assert.throws(() => preparerPiece('<circle r="1"/>', 3), /un seul élément/);
  assert.throws(() => preparerPiece(piece(3).replace('p03-c', 'autre'), 3), /préfixe p03-/);
  // Une référence interne reste permise (masque, dégradé).
  assert.doesNotMatch(preparerPiece(piece(3, '<use href="#p03-c"/><rect fill="url(#p03-c)"/>'), 3), /undefined/);
});

test('les messages d\'erreur ne portent que le numéro du jour', () => {
  assert.throws(
    () => preparerPiece(piece(7, '<script>SECRET-A-NE-PAS-DIRE</script>'), 7),
    (erreur) => !erreur.message.includes('SECRET'),
  );
});

let racine;
before(async () => {
  racine = await mkdtemp(path.join(os.tmpdir(), 'avent-decor-'));
  await mkdir(path.join(racine, 'decor'));
  for (const n of [1, 2, 4, 9]) await writeFile(path.join(racine, 'decor', `${String(n).padStart(2, '0')}.svg`), piece(n));
  await writeFile(path.join(racine, 'decor', '03.svg'), '<svg viewBox="0 0 1 1"><script/></svg>');
});
after(() => rm(racine, { recursive: true, force: true }));

test('chargerPieces : les jours publiés seuls, les absentes sont ignorées, les invalides signalées', async () => {
  const { pieces, erreurs } = await chargerPieces(racine, 4);
  assert.deepEqual([...pieces.keys()], [1, 2, 4]);
  assert.deepEqual(erreurs, ['Décor 03 : contenu actif ou ressource externe interdit']);
});

test('chargerPieces : verrou réel, la pièce du jour 9 n\'est pas lue avant le 9', async () => {
  const { pieces } = await chargerPieces(racine, 8);
  assert.equal(pieces.has(9), false);
  assert.equal((await chargerPieces(racine, 9)).pieces.has(9), true);
  assert.equal((await chargerPieces(racine, 0)).pieces.size, 0);
});

test('chargerPieces : sans dossier decor/, aucun décor et aucune erreur', async () => {
  const { pieces, erreurs } = await chargerPieces(path.join(racine, 'inexistant'), 5);
  assert.equal(pieces.size, 0);
  assert.deepEqual(erreurs, []);
});

test('guirlande : 24 ampoules dans le cadre, de gauche à droite, à écart à peu près régulier', () => {
  const positions = positionsAmpoules();
  assert.equal(positions.length, 24);
  for (const [x, y] of positions) {
    assert.ok(x > 0 && x < 400, `x ${x}`);
    assert.ok(y > 0 && y < 60, `y ${y}`);
  }
  const xs = positions.map(([x]) => x);
  assert.deepEqual([...xs].sort((a, b) => a - b), xs, 'ordre croissant');
  const ecarts = xs.slice(1).map((x, i) => x - xs[i]);
  assert.ok(Math.min(...ecarts) > 8, `écart minimal ${Math.min(...ecarts)}`);
});

test('panorama : 24 ampoules, prêtes jusqu\'au jour publié, pièces des jours publiés seulement, décoratif', () => {
  const pieces = new Map([[1, '<circle id="p01-a"/>'], [2, '<circle id="p02-a"/>'], [6, '<circle id="p06-a"/>']]);
  const html = panoramaHtml({ jour: 5, pieces });
  assert.equal(html.match(/class="ampoule"/g).length, 24);
  assert.equal(html.match(/data-publiee/g).length, 5);
  assert.match(html, /data-piece="1"/);
  assert.match(html, /data-piece="2"/);
  assert.doesNotMatch(html, /data-piece="6"/, 'une pièce à venir ne passe jamais, même fournie');
  assert.doesNotMatch(html, /p06-a/);
  assert.match(html, /aria-hidden="true"/);
});

test('panorama : avant le 1er décembre, la guirlande est là, éteinte, sans aucune pièce', () => {
  const html = panoramaHtml({ jour: 0 });
  assert.equal(html.match(/class="ampoule"/g).length, 24);
  assert.doesNotMatch(html, /data-publiee/);
  assert.doesNotMatch(html, /data-piece=/);
});
