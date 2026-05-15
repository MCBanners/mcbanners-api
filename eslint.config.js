import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    ignores: [
      "**/dist/**",
      "**/*.tsbuildinfo",
      "node_modules/**",
      "eslint.config.js",
      "**/src/**/*.js",
      "**/src/**/*.d.ts",
      "**/test/**/*.js",
      "**/test/**/*.d.ts",
      "scripts/**"
    ]
  },
  {
    rules: {
      "@typescript-eslint/no-magic-numbers": "off",
      "@typescript-eslint/no-non-null-assertion": "off"
    }
  }
);
