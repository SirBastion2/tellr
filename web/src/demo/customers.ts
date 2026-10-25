/** Synthetic teller-window scripts. Not loaded from eval scenarios. */

export type CustomerEvent = {
  id: string
  delayMs: number
  kind: 'dialogue' | 'transaction'
  text: string
  chips: string[]
}

export type CustomerActivity = {
  when: string
  description: string
}

export type CustomerFile = {
  id: string
  title: string
  summary: string
  profile: {
    name: string
    ageBand: string
    tenure: string
    typicalWithdrawal: string
    channels: string
  }
  activity: CustomerActivity[]
  transaction: {
    type: string
    amount: string
    memo: string
    amountBand: string
  }
  events: CustomerEvent[]
}

export const CUSTOMERS: readonly CustomerFile[] = [
  {
    id: 'contractor-cash',
    title: 'Contractor cash, coached',
    summary: 'A long-time customer asks for a large cash withdrawal while someone on the phone tells them what to say.',
    profile: {
      name: 'Helen Ruiz',
      ageBand: '70 and over',
      tenure: '18 years',
      typicalWithdrawal: '$200 cash, about once a month',
      channels: 'Branch window',
    },
    activity: [
      { when: 'Last Tuesday', description: 'Social Security deposit, $1,842' },
      { when: 'Last Friday', description: 'Debit card, grocery, $64' },
      { when: 'Three weeks ago', description: 'Cash withdrawal, $200' },
    ],
    transaction: {
      type: 'Cash withdrawal',
      amount: '$8,000',
      memo: 'Says a contractor needs cash today',
      amountBand: '5000_9999',
    },
    events: [
      {
        id: 'window',
        delayMs: 0,
        kind: 'dialogue',
        text: 'Helen steps up to the window and sets her purse on the counter.',
        chips: [],
      },
      {
        id: 'phone',
        delayMs: 2200,
        kind: 'dialogue',
        text: 'She stays on the phone the whole time. The caller is still talking.',
        chips: ['chip.on_phone'],
      },
      {
        id: 'directing',
        delayMs: 2200,
        kind: 'dialogue',
        text: 'She repeats what the caller says, word for word, before answering.',
        chips: ['chip.someone_directing'],
      },
      {
        id: 'cash',
        delayMs: 2200,
        kind: 'transaction',
        text: 'She asks for $8,000 in cash. A check will not do.',
        chips: ['chip.cash_only', 'chip.above_threshold'],
      },
      {
        id: 'secrecy',
        delayMs: 2200,
        kind: 'dialogue',
        text: 'The contractor needs it today. She was told not to explain why.',
        chips: ['chip.urgency_secrecy', 'chip.rushed'],
      },
    ],
  },
  {
    id: 'romance-crypto',
    title: 'Romance, crypto cash',
    summary: 'A customer wants cash for an online partner who says an investment account only takes cash today.',
    profile: {
      name: 'Marcus Hale',
      ageBand: '45–54',
      tenure: '6 years',
      typicalWithdrawal: '$400, mixed debit and cash',
      channels: 'Online banking and the branch',
    },
    activity: [
      { when: 'Yesterday', description: 'New payee added in online banking, not yet paid' },
      { when: 'Monday', description: 'Wire inquiry, then cancelled' },
      { when: 'Last month', description: 'Payroll deposit, usual amount' },
    ],
    transaction: {
      type: 'Cash withdrawal',
      amount: '$6,500',
      memo: 'Partner says the investment desk takes cash only',
      amountBand: '5000_9999',
    },
    events: [
      {
        id: 'window',
        delayMs: 0,
        kind: 'dialogue',
        text: 'Marcus comes to the window with a note on his phone.',
        chips: [],
      },
      {
        id: 'directing',
        delayMs: 2200,
        kind: 'dialogue',
        text: 'He says his partner told him exactly how to ask for the money.',
        chips: ['chip.someone_directing'],
      },
      {
        id: 'cash',
        delayMs: 2200,
        kind: 'transaction',
        text: 'He requests $6,500 in cash. The partner said a transfer would fail.',
        chips: ['chip.cash_only', 'chip.above_threshold'],
      },
      {
        id: 'secrecy',
        delayMs: 2200,
        kind: 'dialogue',
        text: 'It has to be today, and he was asked not to mention the investment.',
        chips: ['chip.urgency_secrecy'],
      },
      {
        id: 'unusual',
        delayMs: 2200,
        kind: 'transaction',
        text: 'This is several times his usual withdrawal.',
        chips: ['chip.unusual_for_customer'],
      },
    ],
  },
  {
    id: 'government-impersonation',
    title: 'Government impersonation',
    summary: 'A caller claiming to be the sheriff stays on the line while the customer tries to pay a fine in cash.',
    profile: {
      name: 'Ruth Nguyen',
      ageBand: '65–74',
      tenure: '22 years',
      typicalWithdrawal: '$150 cash',
      channels: 'Branch window',
    },
    activity: [
      { when: 'Last Thursday', description: 'Pension deposit, usual' },
      { when: 'Last week', description: 'Utility debit, $90' },
      { when: 'Last month', description: 'Cash withdrawal, $150' },
    ],
    transaction: {
      type: 'Cash withdrawal',
      amount: '$7,500',
      memo: 'Caller says a warrant must be paid in cash today',
      amountBand: '5000_9999',
    },
    events: [
      {
        id: 'window',
        delayMs: 0,
        kind: 'dialogue',
        text: 'Ruth approaches the window already on a call.',
        chips: [],
      },
      {
        id: 'phone',
        delayMs: 2200,
        kind: 'dialogue',
        text: 'She keeps the phone at her ear and nods at the caller.',
        chips: ['chip.on_phone'],
      },
      {
        id: 'directing',
        delayMs: 2200,
        kind: 'dialogue',
        text: 'The caller tells her what to say to the teller.',
        chips: ['chip.someone_directing'],
      },
      {
        id: 'secrecy',
        delayMs: 2200,
        kind: 'dialogue',
        text: 'She says there is a warrant and she must not tell the bank why.',
        chips: ['chip.urgency_secrecy'],
      },
      {
        id: 'cash',
        delayMs: 2200,
        kind: 'transaction',
        text: 'She asks for $7,500 in cash. The caller said a check is not allowed.',
        chips: ['chip.cash_only', 'chip.above_threshold'],
      },
    ],
  },
  {
    id: 'benign-car',
    title: 'Car down payment',
    summary: 'A customer withdraws a large amount for a car they can describe. No phone, no rush, no coaching.',
    profile: {
      name: 'Andre Cole',
      ageBand: '35–44',
      tenure: '9 years',
      typicalWithdrawal: '$500',
      channels: 'Branch and debit card',
    },
    activity: [
      { when: 'Last week', description: 'Savings transfer into checking, $4,000' },
      { when: 'Monday', description: 'Dealer service debit, $180' },
      { when: 'Last month', description: 'Paycheck deposit, usual' },
    ],
    transaction: {
      type: 'Cash withdrawal',
      amount: '$9,000',
      memo: 'Down payment at a local dealer. A check is fine.',
      amountBand: '5000_9999',
    },
    events: [
      {
        id: 'window',
        delayMs: 0,
        kind: 'dialogue',
        text: 'Andre steps up with a buyer’s order from the dealer.',
        chips: [],
      },
      {
        id: 'purpose',
        delayMs: 2200,
        kind: 'dialogue',
        text: 'He names the dealer, the model, and the stock number without being prompted.',
        chips: [],
      },
      {
        id: 'amount',
        delayMs: 2200,
        kind: 'transaction',
        text: 'He asks for $9,000 toward the down payment and says a cashier’s check works.',
        chips: [],
      },
      {
        id: 'pace',
        delayMs: 2200,
        kind: 'dialogue',
        text: 'He is not on the phone and says he can come back tomorrow if needed.',
        chips: [],
      },
    ],
  },
  {
    id: 'benign-routine',
    title: 'Routine Friday cash',
    summary: 'The usual small Friday withdrawal. Nothing about it is new.',
    profile: {
      name: 'Priya Shah',
      ageBand: '25–34',
      tenure: '3 years',
      typicalWithdrawal: '$300 every Friday',
      channels: 'ATM and the branch',
    },
    activity: [
      { when: 'Last Friday', description: 'Cash withdrawal, $300' },
      { when: 'The Friday before', description: 'Cash withdrawal, $300' },
      { when: 'Yesterday', description: 'Payroll deposit, usual' },
    ],
    transaction: {
      type: 'Cash withdrawal',
      amount: '$300',
      memo: 'Usual Friday cash',
      amountBand: '5000_9999',
    },
    events: [
      {
        id: 'window',
        delayMs: 0,
        kind: 'dialogue',
        text: 'Priya waves and steps up to the window.',
        chips: [],
      },
      {
        id: 'usual',
        delayMs: 2200,
        kind: 'transaction',
        text: 'She asks for $300 cash, the same amount as the last two Fridays.',
        chips: [],
      },
      {
        id: 'chat',
        delayMs: 2200,
        kind: 'dialogue',
        text: 'She talks about the weekend and is not in a hurry.',
        chips: [],
      },
    ],
  },
]

export function customerById(id: string): CustomerFile | null {
  return CUSTOMERS.find((customer) => customer.id === id) ?? null
}

export function scriptSignals(customer: CustomerFile): { eventId: string; chipId: string; text: string }[] {
  return customer.events.flatMap((event) =>
    event.chips.map((chipId) => ({ eventId: event.id, chipId, text: event.text })),
  )
}
