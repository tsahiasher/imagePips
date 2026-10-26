import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  server: {
    port: 5173,
    host: true
  },
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 15000
  }
});
