import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { resetConnectionForTests } from './connection'
import { COLOR_STORAGE_KEY, PRESENTER_STORAGE_KEY, THEME_STORAGE_KEY } from './theme/tokens'

afterEach(() => {
  cleanup()
  resetConnectionForTests()
  window.localStorage.removeItem(THEME_STORAGE_KEY)
  window.localStorage.removeItem(COLOR_STORAGE_KEY)
  window.localStorage.removeItem(PRESENTER_STORAGE_KEY)
  window.history.replaceState({}, '', '/')
})
