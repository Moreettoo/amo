import 'vitest'
import type { AxeMatchers } from 'vitest-axe/matchers'

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- fusão de declaração exige interface, não type
  interface Assertion extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- fusão de declaração exige interface, não type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
