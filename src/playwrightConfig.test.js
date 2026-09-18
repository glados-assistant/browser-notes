import { describe, expect, it } from 'vitest'
import playwrightConfig from '../playwright.config.js'

describe('Playwright release-gate configuration', () => {
  it('serializes the exact default all-browser command without narrowing coverage', () => {
    expect(playwrightConfig.workers).toBe(1)
    expect(playwrightConfig.projects.map(({ name }) => name)).toEqual(['chromium', 'firefox', 'webkit'])
  })
})
