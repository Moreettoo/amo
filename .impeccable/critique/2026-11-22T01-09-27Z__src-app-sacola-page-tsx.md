---
target: src/app/sacola/page.tsx (ensaio da etapa 3)
total_score: 32
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:D:\\amo\\src\\app\\sacola\\page.tsx"
target_fingerprint: "sha256:ef324d709cc8acf680de7e0d19a8a047aec25078357b86b46010b02ace4ecb5a"
target_path: "D:\\amo\\src\\app\\sacola\\page.tsx"
timestamp: 2026-11-22T01-09-27Z
slug: src-app-sacola-page-tsx
---
⚠️ DEGRADED: single-context (the implementer may not dispatch sub-agents, rule of implementador.md; Assessment A was recorded before the detector ran)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | the wait is said in text and approval arrives alone; on a phone the focused step heading is hidden under the sticky bar |
| 2 | Match System / Real World | 4 | Pix vocabulary: QR Code, Pix copia e cola, Vale até 22:17 |
| 3 | User Control and Freedom | 3 | Alterar on every done step, Gerar outro código; no way back from the order to change the payment |
| 4 | Consistency and Standards | 3 | the order code breaks at its hyphen; a price breaks between R$ and the value |
| 5 | Error Prevention | 3 | pay button off while busy and while the kitchen is closed |
| 6 | Recognition Rather Than Recall | 4 | done steps become summary lines; the summary stays in view |
| 7 | Flexibility and Efficiency | 3 | main address prefilled, progress kept in the tab, one-tap copy |
| 8 | Aesthetic and Minimalist Design | 3 | restrained; the end screen on a phone is marred by the two breaks |
| 9 | Error Recovery | 3 | only the happy path was rehearsed; errors come from MENSAGENS_DO_FECHAMENTO |
| 10 | Help and Documentation | 3 | one instruction line for Pix; the stop-checking fallback links Minha conta |
| **Total** | | **32/40** | **Good** |

## Design Specificity Verdict

LLM assessment: authored for AMO. The thread of steps with the copper heart, the script second voice in every title (quase pronta, aguardando o Pix, recebido), cream paper and 1 px rules, the straight 2 px buttons and thin fields carried into the Pix panel instead of a generic payment widget. Not category-interchangeable.

Deterministic scan: `impeccable detect` on src/app/sacola/page.tsx, src/components/sacola and src/components/layout/TelaSacola.tsx: 0 findings (exit 0). In the page (detect.js injected over CDP into a fresh tab, CSP bypassed only in that tab, at 1440 and 390): 1 finding, `cream-palette` on the body background rgb(250, 242, 233). False positive: the client pinned the brown, copper and cream palette (PRODUCT.md, 2026-11-18). No user-visible overlay is left: the tab was closed and the live server stopped.

## Overall Impression

The checkout reads as one piece of AMO stationery from the bag to the paid order, and the Pix wait is calm and honest (text, no spinner, approval found alone). The biggest gap is on the phone, where most visitors are: the step heading that receives focus is hidden under the sticky bar, and the last screen breaks the order code and a price.

## What's Working

- The wait says what happens ("Assim que o pagamento for confirmado, esta página avisa sozinha.") and the title changes voice from "aguardando o Pix" to "recebido", with "Pagamento aprovado." in a live region and focus on the new title.
- The Pix panel keeps the house language: an outlined read-only field, a straight button, the time the code is valid; the copy confirms only after the clipboard accepts.
- The paused store is said at once in the summary and the pay button becomes "Cozinha fechada agora", disabled.

## Priority Issues

- **[P1] What**: on a phone the focused step heading lands under the sticky header. After "Calcular e continuar" the focused "3. Seus dados" sits at 38..71 px while the bar covers 0..64 px. **Why it matters**: the customer lands on the login tabs without seeing which step she is in; a magnifier or keyboard user loses the focus point (WCAG 2.2 2.4.11). **Fix**: scroll-margin-top on the step headings and on the focused h1, the bar height plus breathing room. **Suggested command**: /impeccable adapt
- **[P2] What**: prices wrap in the order list on a phone ("R$" / "13,30" on the delivery line). **Why it matters**: money split across lines at the end of the purchase reads as sloppy and is harder to scan. **Fix**: no wrap on the values of the order list and of the summary; the label wraps instead. **Suggested command**: /impeccable polish
- **[P2] What**: the order code breaks at its hyphen in the h1 on a phone ("Pedido AMO-" / "HW5UP63T"), and the "AMO" inside the code is not protected from translation. **Why it matters**: the code is what the customer quotes; split, it reads as two things, and a translator can turn "AMO" into a word. **Fix**: the number in one unbreakable span with translate="no". **Suggested command**: /impeccable typeset
- **[P3] What**: while the Pix waits, the strongest button is "Voltar ao catálogo" (filled) and "Copiar código" is outlined. **Why it matters**: the eye goes to leaving, not to paying. **Fix**: decide with the owner; not changed in this pass. **Suggested command**: /impeccable layout

## Persona Red Flags

**Casey (distracted mobile)**: lands in step 3 with the heading under the bar and sees only "Entrar" and "Criar conta"; on the last screen the order code and the delivery price break.
**Sam (accessibility)**: the programmatic focus on the step heading is covered on a phone; the screen reader side is fine (heading read, "Pagamento aprovado." in a live region, the QR has alt "QR Code do Pix").
**Jordan (first-timer)**: Pix vocabulary is familiar; one option in the payment group while the card is off reads fine.

## Minor Observations

- At 1440 "Vale até" floats under the QR row, away from the field and button it belongs to.
- With the card off (no public key) the payment group has one radio; it goes away when the owner adds the key.
- Next dev warns once that the home logo is the LCP image without loading="eager" (outside the checkout).
- The paused store lets the customer do steps 1 to 3 and blocks at step 4 (decision of Task 1).

## Questions to Consider

- Should "Voltar ao catálogo" step down to a text link while a Pix is pending, leaving "Copiar código" as the one strong action?
- Should the paused store stop the flow at step 2 instead of letting the customer fill data she cannot use now?
