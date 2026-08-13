import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  globalIgnores([
    "dist/**",
    ".wrangler/**",
  ]),
]);

export default eslintConfig;
