import path from "path";

import tailwindCaido from "@caido/tailwindcss";
import { defineConfig } from "@caido-community/dev";
import vue from "@vitejs/plugin-vue";
import prefixwrap from "postcss-prefixwrap";
import tailwindcss from "tailwindcss";
// @ts-expect-error no declared types at this time
import tailwindPrimeui from "tailwindcss-primeui";

const id = "quickssrf";

export default defineConfig({
  id,
  name: "QuickSSRF",
  description:
    "Out-of-Band (OOB) interaction monitoring with multi-provider OAST support",
  version: "1.0.2",
  author: {
    name: "Caido Labs Inc.",
    email: "dev@caido.io",
    url: "https://caido.io",
  },
  plugins: [
    {
      kind: "backend",
      id: "quickssrf-backend",
      root: "packages/backend",
    },
    {
      kind: "frontend",
      id: "quickssrf-frontend",
      root: "packages/frontend",
      backend: {
        id: "quickssrf-backend",
      },
      vite: {
        plugins: [vue()],
        build: {
          rollupOptions: {
            external: [
              "@caido/frontend-sdk",
              "@codemirror/autocomplete",
              "@codemirror/commands",
              "@codemirror/language",
              "@codemirror/lint",
              "@codemirror/search",
              "@codemirror/state",
              "@codemirror/view",
              "@lezer/common",
              "@lezer/highlight",
              "@lezer/lr",
              "vue",
            ],
          },
        },
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "packages/frontend/src"),
          },
        },
        css: {
          postcss: {
            plugins: [
              prefixwrap(`#plugin--${id}`),
              tailwindcss({
                corePlugins: {
                  preflight: false,
                },
                content: [
                  "./packages/frontend/src/**/*.{vue,ts}",
                  "./node_modules/@caido/primevue/dist/primevue.mjs",
                ],
                darkMode: ["selector", '[data-mode="dark"]'],
                plugins: [tailwindPrimeui, tailwindCaido],
              }),
            ],
          },
        },
      },
    },
  ],
});
