import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    proxy: {
      '/water-heaters': 'http://localhost:8001',
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.tsx'],
  },
});
