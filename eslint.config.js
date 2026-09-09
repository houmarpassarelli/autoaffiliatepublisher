// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * Configuração de lint compartilhada por todo o monorepo.
 * Regras de tipagem estrita ficam por conta do próprio TypeScript (`strict: true`);
 * aqui tratamos apenas de consistência e de erros de código.
 */
export default tseslint.config(
  // Artefatos e dependências jamais são analisados.
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Variáveis intencionalmente não utilizadas devem ser prefixadas com "_".
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Importação de tipos sempre explícita — exigência do verbatimModuleSyntax.
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  // Desativa regras estilísticas que conflitam com o Prettier.
  prettier,
);
