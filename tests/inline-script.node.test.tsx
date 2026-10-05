// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { InlineScript, MARCAR_JS } from '@/components/InlineScript'

describe('InlineScript no servidor', () => {
  it('sai como script executável com o código da classe js', () => {
    const html = renderToString(<InlineScript html={MARCAR_JS} />)
    expect(html).toContain('type="text/javascript"')
    expect(html).toContain("document.documentElement.classList.add('js')")
  })
})
