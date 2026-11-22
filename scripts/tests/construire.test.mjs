// La construction, de bout en bout, sur un dépôt de contenu synthétique (le vrai est privé et
// absent du dépôt public). Titres « TITRE-SECRET-NN » : s'ils sortent de dist/ avant leur jour,
// le verrou fuit.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { construire } from '../construire.mjs';
import { GRANDES_PORTES } from '../lib/config.mjs';

const nn = (n) => String(n).padStart(2, '0');
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';

let racine;
let contenu;

async function fabriquerContenu(dossier) {
  await mkdir(path.join(dossier, 'cases'), { recursive: true });
  await mkdir(path.join(dossier, 'illustrations'), { recursive: true });
  await mkdir(path.join(dossier, 'animations'), { recursive: true });
  for (let n = 1; n <= 25; n += 1) {
    const base = {
      jour: n,
      titre: `TITRE-SECRET-${nn(n)}`,
      presentation: `Présentation de la porte ${n}.\n\nSecond paragraphe.`,
      illustration: { svg: `illustrations/${nn(n)}.svg`, alt: `Alt de la porte ${n}.` },
      animation: 'Décrit.',
      grande_porte: GRANDES_PORTES.includes(n),
    };
    const fiche =
      n === 25
        ? base
        : {
            ...base,
            slug: `ressource-${nn(n)}`,
            url: `https://exemple.test/${nn(n)}`,
            acces: 'gratuit',
            badges: ['sans_pistage'],
            indice: `INDICE-${nn(n)}`,
            sources: ['https://exemple.test/source'],
          };
    await writeFile(path.join(dossier, 'cases', `${nn(n)}.json`), JSON.stringify(fiche));
    await writeFile(path.join(dossier, 'illustrations', `${nn(n)}.svg`), SVG);
    await writeFile(path.join(dossier, 'animations', `${nn(n)}.css`), `.fiche[data-jour="${nn(n)}"]{}`);
  }
}

before(async () => {
  racine = await mkdtemp(path.join(os.tmpdir(), 'avent-test-'));
  contenu = path.join(racine, 'contenu');
  await fabriquerContenu(contenu);
});
after(async () => {
  await rm(racine, { recursive: true, force: true });
});

async function construireLe(date, extra = {}) {
  const sortie = path.join(racine, `dist-${date}`);
  const lignes = [];
  await construire({ date, contenu, sortie, journal: (l) => lignes.push(l), ...extra });
  return { sortie, lignes };
}

async function tousLesFichiers(dossier) {
  const sortie = [];
  for (const entree of await readdir(dossier, { withFileTypes: true, recursive: true })) {
    if (entree.isFile()) sortie.push(path.join(entree.parentPath, entree.name));
  }
  return sortie;
}

async function existe(chemin) {
  try {
    await stat(chemin);
    return true;
  } catch {
    return false;
  }
}

test('avant le 1er décembre : aucune case, seule la porte 1 donne un indice, compte à rebours vers le 1er', async () => {
  const { sortie } = await construireLe('2026-11-25');
  for (let n = 1; n <= 25; n += 1) assert.equal(await existe(path.join(sortie, nn(n))), false, `case ${n}`);
  assert.equal(await existe(path.join(sortie, 'illustrations')), false);
  assert.equal(await existe(path.join(sortie, 'animations')), false);
  assert.equal(await existe(path.join(sortie, 'apercus')), false);
  const accueil = await readFile(path.join(sortie, 'index.html'), 'utf8');
  assert.match(accueil, /data-cible="2026-12-01T00:00:00\+01:00"/);
  assert.match(accueil, /data-indice="INDICE-01"/);
  assert.doesNotMatch(accueil, /INDICE-02/);
});

test('verrou réel au 5 décembre : ni case, ni illustration, ni titre au-delà de 5 ; seul l\'indice de la 6', async () => {
  const { sortie } = await construireLe('2026-12-05');
  for (let n = 1; n <= 5; n += 1) assert.equal(await existe(path.join(sortie, nn(n), 'index.html')), true, `case ${n}`);
  for (let n = 6; n <= 25; n += 1) {
    assert.equal(await existe(path.join(sortie, nn(n))), false, `case ${n}`);
    assert.equal(await existe(path.join(sortie, 'illustrations', `${nn(n)}.svg`)), false);
    assert.equal(await existe(path.join(sortie, 'animations', `${nn(n)}.css`)), false);
    assert.equal(await existe(path.join(sortie, 'apercus', `${nn(n)}.png`)), false);
  }
  for (const fichier of await tousLesFichiers(sortie)) {
    if (/\.(woff2|jpg|png)$/.test(fichier)) continue;
    const texte = await readFile(fichier, 'utf8');
    for (let n = 6; n <= 25; n += 1) {
      assert.ok(!texte.includes(`TITRE-SECRET-${nn(n)}`), `titre ${n} dans ${path.relative(sortie, fichier)}`);
      if (n !== 6) assert.ok(!texte.includes(`INDICE-${nn(n)}`), `indice ${n} dans ${path.relative(sortie, fichier)}`);
    }
  }
  const accueil = await readFile(path.join(sortie, 'index.html'), 'utf8');
  assert.match(accueil, /data-indice="INDICE-06"/);
  assert.match(accueil, /data-cible="2026-12-06T00:00:00\+01:00"/);
});

test('l\'indice appartient à la prochaine porte seulement : un seul data-indice, sur son bouton, le panneau renvoie vers elle', async () => {
  const { sortie } = await construireLe('2026-12-05');
  const accueil = await readFile(path.join(sortie, 'index.html'), 'utf8');
  assert.equal(accueil.match(/data-indice=/g)?.length, 1);
  const bouton6 = accueil.match(/<button[^>]*data-porte="6"[^>]*>/)[0];
  assert.match(bouton6, /data-indice="INDICE-06"/);
  for (const n of [7, 9, 25]) {
    assert.doesNotMatch(accueil.match(new RegExp(`<button[^>]*data-porte="${n}"[^>]*>`))[0], /data-indice/);
  }
  const panneau = accueil.match(/<aside id="indice"[^>]*>/)[0];
  assert.match(panneau, /data-renvoi="6"/);
  assert.doesNotMatch(panneau, /INDICE-/);
});

test('la mosaïque garde l\'ordre des jours dans le DOM, portes 1 à 25', async () => {
  const { sortie } = await construireLe('2026-12-05');
  const accueil = await readFile(path.join(sortie, 'index.html'), 'utf8');
  const numeros = [...accueil.matchAll(/class="porte [^"]*" (?:href="\d+\/" )?data-porte="(\d+)"/g)].map((m) => Number(m[1]));
  assert.deepEqual(numeros, Array.from({ length: 25 }, (_, i) => i + 1));
  for (const n of GRANDES_PORTES.filter((p) => p < 25)) {
    assert.match(accueil, new RegExp(`class="porte [^"]*porte--grande[^"]*" [^>]*data-porte="${n}"`));
  }
});

test('archive au 25 décembre et au 10 janvier : 25 cases, aucun compte à rebours ni panneau d\'indice', async () => {
  for (const date of ['2026-12-25', '2027-01-10']) {
    const { sortie } = await construireLe(date);
    for (let n = 1; n <= 25; n += 1) assert.equal(await existe(path.join(sortie, nn(n), 'index.html')), true, `${date} case ${n}`);
    const accueil = await readFile(path.join(sortie, 'index.html'), 'utf8');
    assert.doesNotMatch(accueil, /data-cible/);
    assert.doesNotMatch(accueil, /id="indice"/);
    assert.doesNotMatch(accueil, /porte--verrouillee/);
  }
});

test('le 24 décembre, la porte 25 est la prochaine sans indice', async () => {
  const { sortie } = await construireLe('2026-12-24');
  const accueil = await readFile(path.join(sortie, 'index.html'), 'utf8');
  assert.match(accueil, /data-cible="2026-12-25T00:00:00\+01:00"/);
  assert.doesNotMatch(accueil, /data-indice=/);
  assert.doesNotMatch(accueil, /data-renvoi=/);
});

test('une fiche publiée invalide fait échouer la construction et ne laisse aucun dist/', async () => {
  const sortie = path.join(racine, 'dist-invalide');
  const chemin = path.join(contenu, 'cases', '03.json');
  const original = await readFile(chemin, 'utf8');
  await writeFile(chemin, JSON.stringify({ ...JSON.parse(original), acces: 'offert' }));
  try {
    await assert.rejects(construire({ date: '2026-12-05', contenu, sortie, journal: () => {} }), /Fiche 03 invalide/);
    assert.equal(await existe(sortie), false);
  } finally {
    await writeFile(chemin, original);
  }
});

test('une fiche à venir invalide ne gêne pas la construction du jour', async () => {
  const chemin = path.join(contenu, 'cases', '12.json');
  const original = await readFile(chemin, 'utf8');
  await writeFile(chemin, '{ pas du json');
  try {
    await construireLe('2026-12-05');
  } finally {
    await writeFile(chemin, original);
  }
});

test('une illustration au contenu actif est refusée', async () => {
  const chemin = path.join(contenu, 'illustrations', '02.svg');
  await writeFile(chemin, '<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>');
  try {
    await assert.rejects(construire({ date: '2026-12-05', contenu, sortie: path.join(racine, 'dist-svg'), journal: () => {} }), /contenu actif/);
  } finally {
    await writeFile(chemin, SVG);
  }
});

test('une illustration illisible fait échouer la construction (pas d\'aperçu blanc en silence)', async () => {
  const chemin = path.join(contenu, 'illustrations', '02.svg');
  await writeFile(chemin, '<svg viewBox="0 0 1 1"><rect');
  try {
    await assert.rejects(construire({ date: '2026-12-05', contenu, sortie: path.join(racine, 'dist-casse'), journal: () => {} }), /Fiche 02/);
  } finally {
    await writeFile(chemin, SVG);
  }
});

test('chaque case publiée a son aperçu PNG, et son og:image pointe vers un fichier qui existe', async () => {
  const { sortie } = await construireLe('2026-12-05');
  for (let n = 1; n <= 5; n += 1) {
    const png = await readFile(path.join(sortie, 'apercus', `${nn(n)}.png`));
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    const page = await readFile(path.join(sortie, nn(n), 'index.html'), 'utf8');
    const [, url] = page.match(/<meta property="og:image" content="([^"]+)">/);
    assert.equal(url, `https://anto-py.github.io/calendrier_avent_2026/apercus/${nn(n)}.png`);
    assert.equal(await existe(path.join(sortie, new URL(url).pathname.replace('/calendrier_avent_2026/', ''))), true);
  }
});

test('le journal ne contient que des numéros de jour, jamais un titre ni un indice', async () => {
  const { lignes } = await construireLe('2026-12-05');
  for (const ligne of lignes) {
    assert.match(ligne, /^(Jour publié : \d+|Porte \d{2} : ok|Construction terminée : \d+ case\(s\) publiée\(s\)\.)$/);
  }
});

test('le dossier de sortie ne peut pas contenir le projet ni le contenu', async () => {
  await assert.rejects(construire({ date: '2026-12-05', contenu, sortie: racine, journal: () => {} }), /dossier de sortie/);
});

test('page de case : illustration inline avec alt, retour, Open Graph absolu, animation du jour, aucun bloc de partage', async () => {
  const { sortie } = await construireLe('2026-12-05');
  const page = await readFile(path.join(sortie, '04', 'index.html'), 'utf8');
  assert.match(page, /<figure class="fiche-illustration" role="img" aria-label="Alt de la porte 4\.">\s*<svg aria-hidden="true"/);
  assert.match(page, /href="\.\.\/"[^>]*>← Retour au calendrier/);
  assert.match(page, /href="\.\.\/animations\/04\.css"/);
  assert.doesNotMatch(page, /Partager|partage|data-copier|share-offsite/);
  assert.match(page, /<meta property="og:url" content="https:\/\/anto-py\.github\.io\/calendrier_avent_2026\/04\/">/);
  assert.match(page, /<meta property="og:image" content="https:\/\/anto-py\.github\.io\/calendrier_avent_2026\/apercus\/04\.png">/);
  assert.match(page, /<meta property="og:image:width" content="1200">/);
  assert.match(page, /view-transition-name: porte-04/);
  assert.match(page, /Sans pistage/);
  assert.match(page, /<p>Présentation de la porte 4\.<\/p>\s*<p>Second paragraphe\.<\/p>/);
});

test('page des coulisses : ni lien de ressource, ni accès, ni badges', async () => {
  const { sortie } = await construireLe('2026-12-25');
  const page = await readFile(path.join(sortie, '25', 'index.html'), 'utf8');
  assert.doesNotMatch(page, /fiche-actions/);
  assert.doesNotMatch(page, /fiche-etiquettes/);
  assert.match(page, /Porte 25/);
});

test('page 404 : chemins absolus depuis la racine du site', async () => {
  const { sortie } = await construireLe('2026-12-05');
  const page = await readFile(path.join(sortie, '404.html'), 'utf8');
  assert.match(page, /href="\/calendrier_avent_2026\/css\/charte\.css"/);
  assert.match(page, /href="\/calendrier_avent_2026\/"/);
});

test('tout texte de fiche est échappé', async () => {
  const chemin = path.join(contenu, 'cases', '01.json');
  const original = await readFile(chemin, 'utf8');
  await writeFile(chemin, JSON.stringify({ ...JSON.parse(original), titre: 'A <b>&"gras"</b>' }));
  try {
    const { sortie } = await construireLe('2026-12-05');
    const page = await readFile(path.join(sortie, '01', 'index.html'), 'utf8');
    assert.doesNotMatch(page, /<b>/);
    assert.match(page, /A &lt;b&gt;&amp;&quot;gras&quot;&lt;\/b&gt;/);
  } finally {
    await writeFile(chemin, original);
  }
});
