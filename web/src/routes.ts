export const APP_ROUTES = [
  { id: 'home', path: '/', testId: 'home-screen' },
  { id: 'context', path: '/sessions/:id/context', testId: 'context-screen' },
  { id: 'interview', path: '/sessions/:id', testId: 'interview-screen' },
  { id: 'outcome', path: '/sessions/:id/outcome', testId: 'outcome-screen' },
  { id: 'handoff', path: '/sessions/:id/handoff', testId: 'handoff-screen' },
  { id: 'history', path: '/sessions', testId: 'history-screen' },
  { id: 'health', path: '/health', testId: 'health-screen' },
] as const
