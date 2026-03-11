import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/app/index.tsx',
    },
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
  output: {
    assetPrefix: 'auto',
  },
  html: {
    template: './index.html',
  },
});
