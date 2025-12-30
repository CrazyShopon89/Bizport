import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Cast process to any to avoid TypeScript error about cwd property if Node types aren't explicitly loaded.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    build: {
      outDir: 'build', // Ensures the output folder is named 'build' as requested
    },
    define: {
      // This allows process.env.API_KEY to work in the client-side code after build
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});