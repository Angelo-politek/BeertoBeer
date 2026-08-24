// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      /**
       * Confronti stretti obbligatori, MA `== null` / `!= null` consentiti.
       *
       * Non è pignoleria: è la classe di errore che in questo progetto è
       * costata tre correzioni separate. Il database restituisce `null` per i
       * campi non valorizzati, il codice li escludeva con `!== undefined`, e
       * siccome in JavaScript `null !== undefined` passavano tutti. Ha
       * bloccato il salvataggio del profilo e fatto mostrare in vetrina ogni
       * sticker invece dei tre scelti.
       *
       * `{ null: 'ignore' }` è il punto della regola: impone `===` ovunque ma
       * lascia `!= null`, che è il confronto GIUSTO per quei campi — copre
       * null e undefined insieme.
       */
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
]);
