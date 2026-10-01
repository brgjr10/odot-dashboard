import { defineConfig } from 'vite';

// index.html loads exactly one script, ./bundle.js. Everything in src/ is the
// source of truth; bundle.js is the generated artifact that the Python server,
// the Electron app:// handler and the published container all serve. Keeping the
// output at the repository root means both runtimes keep serving the same file.
export default defineConfig({
  build: {
    outDir: '.',
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      input: 'src/app.js',
      output: {
        format: 'iife',
        name: 'OdotDashboard',
        entryFileNames: 'bundle.js',
        inlineDynamicImports: true,
        strict: false
      }
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js']
  }
});