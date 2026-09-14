import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'

export default defineConfig(
  { ignores: ['dist/', 'node_modules/', 'uploads/', 'outputs/', 'data/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
)
