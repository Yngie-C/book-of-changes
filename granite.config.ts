import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'book-of-changes',
  brand: {
    displayName: '주역 동전점',
    primaryColor: '#3182F6',
    icon: '',
  },
  permissions: [
    { name: 'clipboard', access: 'write' },
  ],
  navigationBar: {
    withBackButton: true,
    withHomeButton: false,
  },
  webViewProps: {
    type: 'partner',
  },
  outdir: './dist',
  web: {
    host: 'localhost',
    port: 3000,
    commands: {
      dev: 'npx rsbuild dev',
      build: 'npx rsbuild build',
    },
  },
});
