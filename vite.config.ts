/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/wason/',
  test: {
    include: ['src/**/*.test.ts'],
  },
})
