import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
	js.configs.recommended,
	{
		files: ['**/*.{js,ts,tsx}'],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		plugins: {
			'@typescript-eslint': typescript,
			prettier,
		},
		rules: {
			...typescript.configs.recommended.rules,
			...prettierConfig.rules,
			'prettier/prettier': 'error',
		},
	},
	{
		ignores: ['**/dist/**', '**/node_modules/**'],
	},
];
