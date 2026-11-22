import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { controlerFiche, controlerToutes } from '../lib/fiches.mjs';

const nn = (jour) => String(jour).padStart(2, '0');

function fiche(jour, surcharge = {}) {
  return {
    jour,
    slug: `ressource-${jour}`,
    titre: `Ressource ${jour}`,
    url: `https://exemple.test/${jour}`,
    presentation: 'Un texte de présentation.',
    acces: 'gratuit',
    badges: ['licence_libre'],
    indice: 'Demain, un indice.',
    illustration: { svg: `illustrations/${nn(jour)}.svg`, alt: 'Une illustration.' },
    animation: 'Une animation décrite.',
    grande_porte: [6, 13, 20, 24].includes(jour),
    sources: ['https://exemple.test/source'],
    ...surcharge,
  };
}

/** Crée un dépôt de contenu temporaire ; `complet` y pose aussi le SVG et le CSS. */
async function contenu({ jour = 4, fiche: f = fiche(jour), complet = true } = {}) {
  const racine = await mkdtemp(path.join(tmpdir(), 'avent-'));
  for (const dossier of ['cases', 'illustrations', 'animations']) {
    await mkdir(path.join(racine, dossier));
  }
  await writeFile(path.join(racine, 'cases', `${nn(jour)}.json`), JSON.stringify(f));
  if (complet) {
    await writeFile(path.join(racine, 'illustrations', `${nn(jour)}.svg`), '<svg/>');
    await writeFile(path.join(racine, 'animations', `${nn(jour)}.css`), '/* animation */');
  }
  return racine;
}

test('une fiche complète, avec son SVG et son CSS, est prête', async () => {
  const racine = await contenu();
  try {
    const rapport = await controlerFiche(racine, 4);
    assert.deepEqual(rapport.manques, []);
    assert.equal(rapport.pret, true);
  } finally {
    await rm(racine, { recursive: true });
  }
});

test('une fiche sans illustration ni animation ne signale que ces deux manques', async () => {
  const racine = await contenu({ complet: false });
  try {
    const rapport = await controlerFiche(racine, 4);
    assert.deepEqual(rapport.manques, ['animations/04.css absent', 'illustrations/04.svg absent']);
    assert.equal(rapport.pret, false);
  } finally {
    await rm(racine, { recursive: true });
  }
});

test('un fichier de fiche absent est signalé tel quel', async () => {
  const racine = await contenu();
  try {
    const rapport = await controlerFiche(racine, 9);
    assert.deepEqual(rapport.manques, ['fichier absent']);
  } finally {
    await rm(racine, { recursive: true });
  }
});

test('un JSON cassé est signalé sans lever', async () => {
  const racine = await contenu();
  await writeFile(path.join(racine, 'cases', '04.json'), '{ pas du json');
  try {
    const rapport = await controlerFiche(racine, 4);
    assert.deepEqual(rapport.manques, ['JSON illisible']);
  } finally {
    await rm(racine, { recursive: true });
  }
});

test('champs vides, accès inconnu, badge inconnu, url non https sont signalés', async () => {
  const racine = await contenu({
    fiche: fiche(4, {
      titre: '',
      url: 'http://exemple.test',
      acces: 'offert',
      badges: ['licence_libre', 'bio'],
      indice: '  ',
      illustration: { svg: 'illustrations/04.svg', alt: '' },
      sources: [],
    }),
  });
  try {
    const { manques } = await controlerFiche(racine, 4);
    for (const attendu of [
      'titre absent',
      'url absente ou non https',
      'indice absent',
      'illustration.alt vide',
      'sources absentes',
      'badge inconnu : bio',
    ]) {
      assert.ok(manques.includes(attendu), `manque « ${attendu} » dans ${JSON.stringify(manques)}`);
    }
    assert.ok(manques.some((m) => m.startsWith('acces absent')));
  } finally {
    await rm(racine, { recursive: true });
  }
});

test('les liens complémentaires sont facultatifs, mais exigent libellé et adresse https', async () => {
  const bon = await contenu({
    fiche: fiche(4, { liens: [{ libelle: 'Version école', url: 'https://exemple.test/edu' }] }),
  });
  const mauvais = await contenu({
    fiche: fiche(4, { liens: [{ libelle: '', url: 'http://exemple.test' }] }),
  });
  try {
    assert.deepEqual((await controlerFiche(bon, 4)).manques, []);
    const { manques } = await controlerFiche(mauvais, 4);
    assert.ok(manques.includes('liens[0].libelle absent'));
    assert.ok(manques.includes('liens[0].url absente ou non https'));
  } finally {
    await rm(bon, { recursive: true });
    await rm(mauvais, { recursive: true });
  }
});

test('le chemin de l\'illustration est imposé (pas de sortie du dossier de contenu)', async () => {
  const racine = await contenu({
    fiche: fiche(4, { illustration: { svg: '../secret.svg', alt: 'Un texte.' } }),
  });
  try {
    const { manques } = await controlerFiche(racine, 4);
    assert.ok(manques.includes('illustration.svg doit valoir illustrations/04.svg'));
  } finally {
    await rm(racine, { recursive: true });
  }
});

test('grande_porte doit correspondre aux jours 6, 13, 20, 24', async () => {
  const racine = await contenu({ jour: 6, fiche: fiche(6, { grande_porte: false }) });
  try {
    const { manques } = await controlerFiche(racine, 6);
    assert.deepEqual(manques, ['grande_porte doit valoir true']);
  } finally {
    await rm(racine, { recursive: true });
  }
});

test('un jour différent du numéro du fichier est signalé', async () => {
  const racine = await contenu({ fiche: fiche(5) });
  try {
    const { manques } = await controlerFiche(racine, 4);
    assert.ok(manques.includes('jour doit valoir 4'));
  } finally {
    await rm(racine, { recursive: true });
  }
});

test('une présentation trop longue et un tiret cadratin donnent des avertissements, pas des manques', async () => {
  const racine = await contenu({
    fiche: fiche(4, { presentation: `${'a'.repeat(701)} — fin`, titre: 'Titre — long' }),
  });
  try {
    const rapport = await controlerFiche(racine, 4);
    assert.equal(rapport.pret, true);
    assert.equal(rapport.avertissements.length, 3);
  } finally {
    await rm(racine, { recursive: true });
  }
});

test('la porte 25 n\'exige ni url, ni accès, ni indice', async () => {
  const racine = await contenu({
    jour: 25,
    fiche: {
      jour: 25,
      titre: 'Coulisses',
      presentation: 'Le making of.',
      illustration: { svg: 'illustrations/25.svg', alt: 'Une coulisse.' },
      animation: 'Le rideau s\'ouvre.',
      grande_porte: true,
    },
  });
  try {
    const rapport = await controlerFiche(racine, 25);
    assert.deepEqual(rapport.manques, []);
    assert.equal(rapport.pret, true);
  } finally {
    await rm(racine, { recursive: true });
  }
});

test('le contrôle des 25 fiches repère les slugs en double', async () => {
  const racine = await contenu({ fiche: fiche(4) });
  await writeFile(
    path.join(racine, 'cases', '05.json'),
    JSON.stringify(fiche(5, { slug: 'ressource-4', url: 'https://exemple.test/5' })),
  );
  try {
    const rapport = await controlerToutes(racine);
    assert.equal(rapport.length, 25);
    assert.ok(rapport[3].manques.includes('slug en double avec la fiche 05'));
    assert.ok(rapport[4].manques.includes('slug en double avec la fiche 04'));
  } finally {
    await rm(racine, { recursive: true });
  }
});
