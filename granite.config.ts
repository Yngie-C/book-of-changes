import type { AppsInTossWebConfig } from '@apps-in-toss/web-framework/config';

const config: AppsInTossWebConfig = {
  appName: 'book-of-changes',
  brand: {
    displayName: '주역 동전점',
    primaryColor: '#3182F6',
    icon: './public/assets/icon.png',
  },
  permissions: [
    { name: 'clipboard', access: 'write' },
  ],
  navigationBar: {
    withBackButton: true,
    withHomeButton: false,
  },
  outdir: './dist',
  web: {
    port: 3000,
    commands: {
      dev: 'npx rsbuild dev',
      build: 'npx rsbuild build',
    },
  },
};

export default config;
