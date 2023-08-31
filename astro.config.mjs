import { defineConfig } from 'astro/config';
import react from "@astrojs/react";
import node from '@astrojs/node';
import { polyfillNode } from "esbuild-plugin-polyfill-node";

import vercelStatic from '@astrojs/vercel/static';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'static',
  adapter: vercelStatic(),
  vite: {
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: "globalThis"
        },
        plugins: [polyfillNode({
          process: true,
          assert: true,
          buffer: true
        })]
      }
    },
    resolve: {
      alias: {
        process: "process/browser",
        assert: "assert",
        stream: "stream-browserify",
        util: "util"
      }
    }
  }
});