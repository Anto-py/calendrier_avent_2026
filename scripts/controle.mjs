// Contrôle des 25 fiches, à la demande. Signale chaque manque, n'en comble aucun.
// Usage : npm run controle [-- --contenu chemin/vers/contenu]

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTE_COULISSES } from './lib/config.mjs';
import { controlerToutes } from './lib/fiches.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const options = process.argv.slice(2);
const indice = options.indexOf('--contenu');
const racine = indice >= 0 ? path.resolve(options[indice + 1] ?? '') : path.resolve(ici, '..', 'contenu');

const rapport = await controlerToutes(racine);
const incompletes = rapport.filter((entree) => !entree.pret || entree.avertissements.length > 0);

const sortie = incompletes.map(({ jour, slug, manques, avertissements, pret }) => ({
  jour,
  ...(slug ? { slug } : {}),
  manques,
  ...(avertissements.length > 0 ? { avertissements } : {}),
  pret,
}));

console.log(JSON.stringify(sortie, null, 2));
const pretes = rapport.filter((entree) => entree.pret).length;
console.error(`\n${pretes}/${PORTE_COULISSES} fiches prêtes.`);
