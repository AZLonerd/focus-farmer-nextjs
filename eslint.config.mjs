import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  { ignores: [".next/**", ".test-build/**", "node_modules/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["features/farm/components/**/*.tsx"],
    // Pixel art and animated GIFs intentionally retain their native rendering.
    rules: { "@next/next/no-img-element": "off" },
  },
];

export default eslintConfig;
