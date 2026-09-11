import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// `defineConfig` comes from 'vitest/config' (re-exports Vite's own, plus the
// `test` field's types) rather than 'vite' directly, so this one file config
// both the dev/build server and `pnpm test`.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
