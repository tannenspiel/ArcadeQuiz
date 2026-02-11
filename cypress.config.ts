import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    specPattern: 'src/tests/e2e/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'src/tests/e2e/cypress/support/e2e.ts',
    videosFolder: 'src/tests/e2e/cypress/videos',
    screenshotsFolder: 'src/tests/e2e/cypress/screenshots',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/tests/e2e/cypress/component/**/*.cy.{js,jsx,ts,tsx}',
  },
});
































































