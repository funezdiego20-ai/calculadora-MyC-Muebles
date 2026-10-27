import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this repository under its project path; Vercel serves at the domain root.
  base: process.env.GITHUB_ACTIONS === 'true' ? '/calculadora-MyC-Muebles/' : '/',
});
