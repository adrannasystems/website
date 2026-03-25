/** @type {import("prettier").Config} */
export default {
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/styles.css",
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
};
