import { defineConfig } from 'vitest/config';

// Unit tests cover src/core: pure TypeScript, no React Native, so they run in plain Node.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
