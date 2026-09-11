import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Raw Web Audio engine components: ref-mirroring for stable callbacks
    // and effect-driven voice cutover are deliberate here, not React
    // Compiler-unsafe patterns — see .cursor/rules/synth-project.mdc.
    //
    // react-refresh/only-export-components is also off here: each file
    // exports its pure sanitize*() function (and the small constants it
    // depends on, e.g. INIT_PATCH) alongside the component so it's directly
    // unit-testable (see the sibling *.test.ts files) without splitting a
    // single-purpose pure function out into its own module. The tradeoff is
    // losing Fast Refresh for these files in `pnpm dev` (an edit here
    // triggers a full reload instead of a hot swap) — a minor dev-loop cost,
    // not a shipped-behavior one.
    files: ['src/components/instruments/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
