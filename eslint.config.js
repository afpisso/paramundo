import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'referencias', 'coverage', 'public/sw-migrate.js'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  prettier,
  {
    // The rules core must stay pure: no Phaser, no DOM, no data files, no randomness outside the seeded RNG.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['phaser', 'phaser/*'], message: 'src/core must not depend on Phaser.' },
            {
              group: ['../scenes/*', '../ui/*', '../fx/*', '../save/*', '../data/*'],
              message: 'src/core must not depend on other layers.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'navigator'],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded RNG (core/rng.ts).' },
      ],
    },
  },
  {
    // The parity oracle keeps the prototype's code style on purpose.
    files: ['tools/parity/**/*.js'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-useless-assignment': 'off',
      'prefer-const': 'off',
    },
  },
);
