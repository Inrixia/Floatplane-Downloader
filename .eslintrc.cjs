module.exports = {
	"env": {
		"es2021": true,
		"node": true
	},
	"extends": [
		"prettier",
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended"
	],
	"overrides": [
	],
	"parser": "@typescript-eslint/parser",
	"parserOptions": {
		"ecmaVersion": "latest",
		"sourceType": "module"
	},
	"plugins": [
		"prettier",
		"@typescript-eslint"
	],
	"rules": {
		"indent": [
			"error",
			"tab"
		],
		"semi": [
			"error",
			"always"
		]
	}
};
