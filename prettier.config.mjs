/**
 * @type {import("prettier").Config}
 * @see https://prettier.io/docs/configuration
 */
const config = {
	"trailingComma": "es5",
	"singleQuote": true,
	"printWidth": 140,
	"overrides": [
		{
			"files": ["test/**/*.ts", "test-dtslint/**/*.ts"],
			"options": {
				"requirePragma": true
			}
		},
		{
			"files": ["test/operators/**/*.ts", "test/subjects/**/*.ts"],
			"options": {
				"requirePragma": false
			}
		}
	]
};

export default config;
