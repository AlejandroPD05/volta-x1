import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// En GitHub Pages el sitio vive en https://alejandropd05.github.io/volta-x1/,
// así que el build de producción necesita ese subdirectorio como base.
// En desarrollo se sirve en la raíz (http://localhost:5173/).
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/volta-x1/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
