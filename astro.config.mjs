// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://onebytepls.com',

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        // Proxy API requests to Wrangler dev server
        '/api': {
          target: 'http://localhost:8788',
          changeOrigin: true,
        },
      },
    },
  },

  integrations: [react(), sitemap()],
});
