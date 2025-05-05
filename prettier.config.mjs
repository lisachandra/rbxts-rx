/**
 * @type {import("prettier").Config}
 * @see https://prettier.io/docs/configuration
 */
const config = {
	overrides: [
		{
			files: ["*"],
			excludeFiles: ["**/*.ts", "**/*.tsx"],
			options: {
				arrowParens: "avoid",
				jsdocPreferCodeFences: true,
				jsdocPrintWidth: 80,
				plugins: ["prettier-plugin-jsdoc"],
				printWidth: 100,
				quoteProps: "consistent",
				semi: true,
				singleQuote: false,
				tabWidth: 4,
				trailingComma: "all",
				tsdoc: true,
				useTabs: true,
			},
		},
		{
			files: ["**/*.ts", "**/*.tsx"],
			options: {
				trailingComma: "es5",
				singleQuote: true,
				printWidth: 140,
			},
		},
	],
};

export default config;
