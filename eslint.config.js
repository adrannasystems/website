// @ts-check

import { fileURLToPath } from "node:url";
import path from "node:path";
import eslintReactPlugin from "@eslint-react/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: ["dist", "node_modules", ".output", "convex/_generated", ".claude", "src/paraglide"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: __dirname,
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@eslint-react": eslintReactPlugin,
      "@typescript-eslint": tsPlugin,
    },
    settings: {
      // Change these if the app moves away from React's automatic JSX runtime
      // or starts using a custom polymorphic prop instead of `as`.
      "react-x": {
        version: "detect",
        importSource: "react",
        polymorphicPropName: "as",
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-implicit-coercion": "error",
      eqeqeq: "error",

      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowString: false,
          allowNumber: false,
          allowNullableString: false,
          allowNullableNumber: false,
          allowNullableBoolean: false,
          allowNullableObject: false,
          allowAny: false,
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: false,
          allowBoolean: false,
          allowNullish: false,
        },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/return-await": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/array-type": ["error", { default: "array" }],
      "@typescript-eslint/ban-ts-comment": "error",

      // ESLint React's normal TypeScript preset covers React core, hooks, JSX,
      // React DOM, Web APIs, and naming conventions. Keep its warning levels
      // intact so noisy adoption checks do not fail CI until intentionally
      // promoted.
      ...eslintReactPlugin.configs["recommended-typescript"].rules,

      // Likely tuning points if the preset is too noisy:
      // - @eslint-react/no-use-context: React 19 prefers `use(context)`.
      // - @eslint-react/set-state-in-effect: flags state synced from props/data.
      // - @eslint-react/no-array-index-key: flags index keys in static lists.
      // - @eslint-react/no-clone-element: flags React.cloneElement usage.
      // - @eslint-react/dom-no-dangerously-set-innerhtml: flags raw HTML sinks.
      // - @eslint-react/naming-convention-*: naming preference warnings.
      "@eslint-react/use-state": "error",
    },
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
    },
  },
];

export default config;
