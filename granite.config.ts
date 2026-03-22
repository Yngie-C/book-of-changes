import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'book-of-changes',
  brand: {
    displayName: '간편 운세 동전 주역점',
    primaryColor: '#3182F6',
    icon: 'https://static.toss.im/appsintoss/7363/d2a47f94-753c-48c4-afcd-86dd8fe6bf63.png',
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
