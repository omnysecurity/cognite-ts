import eslintPluginTs from '@typescript-eslint/eslint-plugin';
import parserTypeScript from '@typescript-eslint/parser';
import pluginImport from 'eslint-plugin-import';
import pluginUnusedImports from 'eslint-plugin-unused-imports';

export default [
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: parserTypeScript,
			parserOptions: {
				project: './tsconfig.json',
			},
			sourceType: 'module',
			ecmaVersion: 'latest',
		},
		plugins: {
			'@typescript-eslint': eslintPluginTs,
			import: pluginImport,
			'unused-imports': pluginUnusedImports,
		},
		rules: {
			'unused-imports/no-unused-imports': 'error',
			'import/order': [
				'error',
				{
					groups: ['builtin', 'external', 'internal'],
					alphabetize: { order: 'asc', caseInsensitive: true },
				},
			],
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					varsIgnorePattern: '^_',
					argsIgnorePattern: '^_',
				},
			],
			'import/no-duplicates': 'error',
			'@typescript-eslint/no-redeclare': 'error',
			'@typescript-eslint/no-dupe-class-members': 'error',
			'@typescript-eslint/no-duplicate-enum-values': 'error',
			'@typescript-eslint/no-duplicate-type-constituents': 'error',
		},
	},
];
