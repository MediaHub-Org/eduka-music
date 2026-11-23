import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/engine/**/*.test.ts', 'tests/audio/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          setupFiles: ['tests/ui/setup.ts'],
          include: ['tests/ui/**/*.test.{ts,tsx}', 'tests/state/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
})
