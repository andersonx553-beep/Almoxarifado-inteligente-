import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'v2',
  plugins: [react()],
  build: {
    target: 'es2022',
  },
});
