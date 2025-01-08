import { defineConfig } from "@caido-community/dev";
import tailwindcss from "tailwindcss";
import prefixwrap from "postcss-prefixwrap";
// @ts-expect-error 
import tailwindPrimeui from "tailwindcss-primeui";
import tailwindCaido from "@caido/tailwindcss";
import vue from "@vitejs/plugin-vue";
import path from "path";

const id = "quickssrf";
export default defineConfig({
  id,
  name: "QuickSSRF",
  version: "0.1.6",
  description: "Real-time Interaction Monitoring with Interactsh",
  author: {
    name: "w2xim3",
    email: "dev@caido.io",
  },
  plugins: [
    {
      id: "quickssrf-frontend",
      root: "packages/frontend",
      kind: "frontend",
      backend: {
        id: "quickssrf-backend",
      },
      vite: {
        plugins: [vue()],
        build: {
          rollupOptions: {
            external: ['@caido/frontend-sdk']
          }
        },
        resolve: {
          alias: [
            {
              find: "@",
              replacement: path.resolve(__dirname, "packages/frontend/src"),
            },
          ],
        },
        css: {
          postcss: {
            plugins: [
              // This plugin injects the necessary Tailwind classes
              tailwindcss({
                content: [
                  './packages/frontend/src/**/*.{vue,ts}',
                  './node_modules/@caido/primevue/dist/primevue.mjs'
                ],
                // Check the [data-mode="dark"] attribute on the <html> element to determine the mode
                // This attribute is set in the Caido core application
                darkMode: ["selector", '[data-mode="dark"]'],
                plugins: [
                  // This plugin injects the necessary Tailwind classes for PrimeVue components
                  tailwindPrimeui,

                  // This plugin injects the necessary Tailwind classes for the Caido theme
                  tailwindCaido,
                ],
              }),

              // This plugin wraps the root element in a unique ID
              // This is necessary to prevent styling conflicts between plugins
              prefixwrap(`#plugin--${id}`),
            ],
          },
        }
      }
    },
    {
      id: "quickssrf-backend",
      root: "packages/backend",
      kind: "backend",
    },
  ],
});
