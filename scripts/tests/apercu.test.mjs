import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composerSvg, HAUTEUR_APERCU, LARGEUR_APERCU, rendrePng } from '../lib/apercu.mjs';

const SIGNATURE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ILLUSTRATION = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="#E3A535"/><circle cx="100" cy="60" r="40" fill="#127676"/></svg>';

test('le PNG est un vrai PNG de 1200 × 630', () => {
  const png = rendrePng(ILLUSTRATION);
  assert.ok(png.subarray(0, 8).equals(SIGNATURE_PNG), 'signature PNG');
  // L'en-tête IHDR porte largeur et hauteur aux octets 16 à 23.
  assert.equal(png.readUInt32BE(16), LARGEUR_APERCU);
  assert.equal(png.readUInt32BE(20), HAUTEUR_APERCU);
});

test('le rendu dépend de l\'illustration : deux dessins, deux images', () => {
  const autre = ILLUSTRATION.replace('#E3A535', '#E4632E');
  assert.ok(!rendrePng(ILLUSTRATION).equals(rendrePng(autre)));
});

test('aucun texte dans la composition (pas de police garantie sur le runner)', () => {
  assert.doesNotMatch(composerSvg(ILLUSTRATION), /<text/);
});

test('un fichier qui n\'est pas un SVG est refusé', () => {
  assert.throws(() => composerSvg('pas un svg'), /pas un SVG/);
});

test('un SVG illisible fait lever le rendu', () => {
  assert.throws(() => rendrePng('<svg viewBox="0 0 10 10"><rect'));
});
