import antfu from "@antfu/eslint-config";

// A module is AssemblyScript read as TypeScript: the amxts core's rules for
// plugin code (its eslint.config.mjs, the block for as/). They move into a
// shared @amxts/eslint-config once it is published.
export default antfu(
	{
		stylistic: { indent: "tab", quotes: "double", semi: true },
		markdown: false,
	},
	{
		rules: {
			// console.log is how a plugin reports: it is the API.
			"no-console": "off",
			// `if (x) return;` on one line is the early return the code uses.
			"antfu/if-newline": "off",
			// `} else {` on one line.
			"style/brace-style": ["error", "1tbs", { allowSingleLine: true }],
			// A file reads top-down: a function is declared below what uses it.
			"ts/no-use-before-define": "off",
			// `==` compares strings by value in AssemblyScript and `===` by
			// identity: `==` is the right one, the opposite of JavaScript.
			"eqeqeq": "off",
			// Decorators and AssemblyScript types are marked for the editor.
			"ts/ban-ts-comment": "off",
			// An import runs its module: the order is the order modules start in.
			"perfectionist/sort-imports": "off",
			"perfectionist/sort-named-imports": "off",
			// AssemblyScript has no `import type`.
			"ts/consistent-type-imports": "off",
			"import/consistent-type-specifier-style": "off",
			// Nor Number.parseInt and friends: parseInt is the global.
			"unicorn/prefer-number-properties": "off",
		},
	},
);
