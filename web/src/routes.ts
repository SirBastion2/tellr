export const APP_ROUTES = [
  { id: 'home', path: '/', label: 'Home', testId: 'home-screen' },
  { id: 'context', path: '/sessions/:id/context', label: 'Context', testId: 'context-screen' },
  { id: 'interview', path: '/sessions/:id', label: 'Session', testId: 'interview-screen' },
  { id: 'outcome', path: '/sessions/:id/outcome', label: 'Outcome', testId: 'outcome-screen' },
  { id: 'handoff', path: '/sessions/:id/handoff', label: 'Handoff', testId: 'handoff-screen' },
  { id: 'history', path: '/sessions', label: 'History', testId: 'history-screen' },
  { id: 'health', path: '/health', label: 'Health', testId: 'health-screen' },
] as const
