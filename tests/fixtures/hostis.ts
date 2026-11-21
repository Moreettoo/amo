/** A lista do teste 7 da spec (14): o que uma entrada hostil costuma trazer. */
export const HOSTIS: readonly string[] = [
  `'`, `"`, `'; drop table perfis; --`, `' or 1=1 --`, `/* x */ select 1`, `-- x`,
  `eq.1`, `or=(id.eq.1)`, `nome.ilike.*`, `*`,
  `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`, `javascript:alert(1)`,
  `a\u0000b`, `a\r\nb`, `a\tb`, `a\u0085b`, `a\u009fb`, 'a'.repeat(1_000_000),
]
