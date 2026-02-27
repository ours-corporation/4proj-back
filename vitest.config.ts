import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Permet d'utiliser describe/it/expect sans import
    environment: 'node',
  },
});