import type { CustomerFile } from './customers'

export type DemoSpeed = 1 | 2 | 4

export type ConfirmKind =
  | null
  | { kind: 'restart' }
  | { kind: 'escalate' }
  | { kind: 'switch'; id: string }

export type DemoView = {
  customers: readonly CustomerFile[]
  customerId: string
  index: number
  playing: boolean
  speed: DemoSpeed
  pending: boolean
  showCase: boolean
  confirmed: readonly string[]
  presenter: boolean
  elapsedMs: number
  onSelectCustomer: (id: string) => void
  onPlay: () => void
  onPause: () => void
  onStep: () => void
  onRestart: () => void
  onSpeed: (speed: DemoSpeed) => void
  onToggleCase: () => void
  onConfirmSignal: (chipId: string) => void
  onDismissSignal: (chipId: string) => void
  onRestoreSignal?: (chipId: string) => void
  onEscalate: () => void
}
