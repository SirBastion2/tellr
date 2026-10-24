import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { THEME_STORAGE_KEY } from './theme/tokens'

afterEach(() => {
  cleanup()
  window.localStorage.removeItem(THEME_STORAGE_KEY)
  window.history.replaceState({}, '', '/')
})
