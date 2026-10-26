import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this repository from /noxari/.
export default defineConfig({
  plugins: [react()],
  base: '/noxari/',
});
