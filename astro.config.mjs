import { defineConfig } from 'astro/config';
import react from "@astrojs/react";
//import node from '@astrojs/node';
import { polyfillNode } from "esbuild-plugin-polyfill-node";
import vercel from '@astrojs/vercel/serverless';

//import rollup from "astro-rollup";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: vercel({
    edgeMiddleware: true
  }),
  vite: {
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: "globalThis"
        },
        plugins: [
          polyfillNode({
            process: true,
            assert: true,
            buffer: true
          }),
        ]
      },
      commonjsOptions: {
        transformMixedEsModules: true
      }
    },
    resolve: {
      alias: {
        process: "process/browser",
        assert: "assert",
        stream: "stream-browserify",
        util: "util",
        buffer: "buffer",
        bytebuffer: "bytebuffer",
      }
    }
  }
});