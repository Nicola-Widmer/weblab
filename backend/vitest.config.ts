import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// NestJS relies on decorator metadata; esbuild (Vitest's default transform)
// doesn't emit it, so transform tests with SWC instead.
export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts', 'src/**/*.spec.ts'],
    root: '.',
  },
  plugins: [swc.vite()],
});
