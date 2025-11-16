// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config({
	files: ["**/*.ts", "**/*.svelte"],
	extends: [
		eslint.configs.recommended,
		tseslint.configs.recommendedTypeChecked,
	],
	rules: {
		"no-unused-vars": "off",
		"@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
	},
});
