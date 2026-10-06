const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const boundaries = require('eslint-plugin-boundaries');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*'] },
  {
    // Mêmes frontières que le web :
    // - app/ (Expo Router) ne fait que réexporter des écrans de features/ ;
    // - une feature importe une autre feature uniquement par son index.ts ;
    // - shared/ n'importe jamais features/ ni app/.
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'feature', pattern: 'src/features/*', capture: ['featureName'] },
        { type: 'shared', pattern: 'src/shared/*', capture: ['sharedModule'] },
        { type: 'assets', pattern: 'src/assets' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'app', allow: ['feature', 'shared'] },
            { from: 'feature', allow: ['feature', 'shared', 'assets'] },
            { from: 'shared', allow: ['shared', 'assets'] },
          ],
        },
      ],
      'boundaries/entry-point': [
        'error',
        {
          default: 'disallow',
          rules: [
            { target: ['feature'], allow: ['index.ts', 'index.tsx'] },
            { target: ['shared', 'assets'], allow: '**' },
          ],
        },
      ],
    },
  },
]);
