// SO DE ENSAIO. Sonda a conta de TESTE da Uber Direct e responde tres coisas
// antes de qualquer codigo do site: a faixa de 1 hora e aceita? o
// leave_at_door e aceito? qual o dominio do tracking_url?
//
//   UBER_DIRECT_AMBIENTE=teste node --env-file=.env.local scripts/ensaio/uber-conta-de-teste.mjs
//
// Seguranca: cota primeiro. Se qualquer cotacao vier com live_mode diferente de
// false, para na hora e nunca cria corrida (chave de producao chamaria um
// entregador de verdade). Nao imprime token, credenciais, endereco da cozinha
// nem corpo de resposta: so status, code, live_mode, fee, currency, host do
// tracking_url e chaves de topo.

const MIN = 60 * 1000;
const env = process.env;

function falta(nome) {
  console.log(`[ensaio] falta ${nome} no ambiente`);
  process.exit(1);
}

if (env.UBER_DIRECT_AMBIENTE !== "teste") {
  console.log("[ensaio] recuso rodar sem UBER_DIRECT_AMBIENTE=teste");
  process.exit(1);
}
for (const n of [
  "UBER_DIRECT_CUSTOMER_ID",
  "UBER_DIRECT_CLIENT_ID",
  "UBER_DIRECT_CLIENT_SECRET",
  "COZINHA_ENDERECO",
]) {
  if (!env[n]) falta(n);
}

const cozinha = JSON.parse(env.COZINHA_ENDERECO);
const BASE = `https://api.uber.com/v1/customers/${env.UBER_DIRECT_CUSTOMER_ID}`;

function endereco(rua, complemento, bairro, cidade, uf, cep) {
  return JSON.stringify({
    street_address: [rua, complemento ? `${complemento} - ${bairro}` : bairro],
    city: cidade,
    state: uf,
    zip_code: cep,
    country: "BR",
  });
}

const pickupAddress = endereco(
  `${cozinha.logradouro}, ${cozinha.numero}`,
  cozinha.complemento,
  cozinha.bairro,
  cozinha.cidade,
  cozinha.uf,
  cozinha.cep,
);
const digitosTel = String(cozinha.telefone).replace(/\D/g, "");
// aceita com ou sem o 55 do pais
const pickupPhone = `+${digitosTel.length >= 12 && digitosTel.startsWith("55") ? digitosTel : `55${digitosTel}`}`;
// perto da cozinha: a conta de teste tem raio maximo de cerca de 5 km (a Paulista, a 7 km, foi recusada)
const dropoffAddress = JSON.stringify({
  street_address: ["Rua Visconde de Parnaiba, 1316", "Mooca"],
  city: "São Paulo",
  state: "SP",
  zip_code: "03045-000",
  country: "BR",
});

// Amanha as 11h de Sao Paulo (segunda se cair no domingo), sem deslocamento fixo.
const TZ = "America/Sao_Paulo";
function partes(d) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });
  return Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
}
function inicioDoSlot() {
  let d = new Date(Date.now() + 24 * 60 * MIN);
  if (partes(d).weekday === "Sun") d = new Date(d.getTime() + 24 * 60 * MIN);
  const p = partes(d);
  let t = Date.UTC(+p.year, +p.month - 1, +p.day, 11, 0);
  const q = partes(new Date(t));
  const visto = Date.UTC(+q.year, +q.month - 1, +q.day, +q.hour, +q.minute);
  t += Date.UTC(+p.year, +p.month - 1, +p.day, 11, 0) - visto;
  return new Date(t);
}
const s = inicioDoSlot();
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
const janela = (antesColeta, largura) => ({
  pickup_ready_dt: iso(s.getTime() - antesColeta * MIN),
  pickup_deadline_dt: iso(s.getTime()),
  dropoff_ready_dt: iso(s.getTime()),
  dropoff_deadline_dt: iso(s.getTime() + largura * MIN),
});
const JANELAS = {
  "1h (coleta s-30..s, entrega s..s+60)": janela(30, 60),
  "4h (coleta s-60..s, entrega s..s+240)": janela(60, 240),
};

async function chamar(rotulo, url, opcoes) {
  const r = await fetch(url, opcoes);
  let corpo = null;
  try {
    corpo = await r.json();
  } catch {}
  const chaves = corpo && typeof corpo === "object" ? Object.keys(corpo).join(",") : "-";
  if (!r.ok && corpo) {
    let m = String(corpo.message ?? "");
    for (const v of Object.values(cozinha)) if (String(v).length > 2) m = m.split(String(v)).join("<x>");
    m = m.replace(/\d{4,}/g, "<n>");
    let dt = JSON.stringify(corpo.metadata?.details ?? null); for (const v of Object.values(cozinha)) if (String(v).length > 2) dt = dt.split(String(v)).join("<x>");
    console.log(`[ensaio]   mensagem: ${m.slice(0, 200)} metadata=${JSON.stringify(Object.keys(corpo.metadata ?? {}))} detalhes=${dt.replace(/d{4,}/g, "<n>").slice(0, 300)}`);
  }
  console.log(`[ensaio] ${rotulo}: HTTP ${r.status}${r.ok ? "" : ` code=${corpo?.code ?? "?"}`} chaves=[${chaves}]`);
  return { status: r.status, ok: r.ok, corpo };
}

// token
const tk = await chamar("token", "https://auth.uber.com/oauth/v2/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: env.UBER_DIRECT_CLIENT_ID,
    client_secret: env.UBER_DIRECT_CLIENT_SECRET,
    grant_type: "client_credentials",
    scope: "eats.deliveries",
  }),
});
if (!tk.ok || !tk.corpo?.access_token) {
  console.log("[ensaio] sem token, parando");
  process.exit(1);
}
const auth = {
  Authorization: `Bearer ${tk.corpo.access_token}`,
  "Content-Type": "application/json",
};

const base = {
  pickup_address: pickupAddress,
  dropoff_address: dropoffAddress,
  pickup_phone_number: pickupPhone,
  dropoff_phone_number: "+5511999999999",
};

function resumoCotacao(rotulo, c) {
  const b = c.corpo || {};
  const id = typeof b.id === "string" ? b.id.split("_")[0] + "_" : "?";
  console.log(
    `[ensaio]   ${rotulo}: live_mode=${b.live_mode} fee=${b.fee} currency=${b.currency} id_prefixo=${id}`,
  );
}

async function cancelar(id) {
  const c = await chamar("cancelamento", `${BASE}/deliveries/${id}/cancel`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({}),
  });
  console.log(`[ensaio]   cancelamento: status=${c.corpo?.status}`);
  return c;
}

// 1. cotacao agora (a cotacao nao traz live_mode; o portao fica na criacao)
const agora = await chamar("cotacao agora", `${BASE}/delivery_quotes`, {
  method: "POST",
  headers: auth,
  body: JSON.stringify(base),
});
resumoCotacao("agora", agora);
if (!agora.ok) {
  console.log("[ensaio] cotacao agora recusada, parando");
  process.exit(1);
}

// 2. por faixa: cota e cria a corrida agendada com Robo Courier. Logo apos a
// criacao le live_mode; se nao for exatamente false, cancela na hora e sai com 2.
// O cancelamento sempre e tentado (finally), mesmo com erro depois da criacao.
let aceita = null;
let leaveAtDoorRecusado = false;
let saida = 0;
for (const [nome, j] of Object.entries(JANELAS)) {
  const q = await chamar(`cotacao agendada ${nome}`, `${BASE}/delivery_quotes`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ ...base, ...j }),
  });
  resumoCotacao(nome, q);
  if (!q.ok) continue;

  let idCriado = null;
  try {
    const criada = await chamar(`corrida agendada ${nome}`, `${BASE}/deliveries`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        ...base,
        ...j,
        quote_id: q.corpo.id,
        pickup_name: "AMO",
        dropoff_name: "Teste AMO",
        manifest_reference: "ensaio-amo",
        manifest_items: [{ name: "Teste AMO", quantity: 1, size: "small" }],
        deliverable_action: "deliverable_action_leave_at_door",
        dropoff_verification: { picture: true },
        idempotency_key: crypto.randomUUID(),
        test_specifications: { robo_courier_specification: { mode: "auto" } },
      }),
    });
    const d = criada.corpo || {};
    if (typeof d.id === "string") idCriado = d.id;
    if (criada.ok && d.live_mode !== false) {
      // nenhuma outra chamada antes do cancelamento
      await cancelar(idCriado);
      idCriado = null;
      console.log(
        "[ensaio] A CORRIDA ERA REAL (live_mode nao e false) e foi cancelada. Credenciais de producao. Parando.",
      );
      saida = 2;
      break;
    }
    let host = "-";
    try {
      host = new URL(d.tracking_url).host;
    } catch {}
    console.log(
      `[ensaio]   corrida: live_mode=${d.live_mode} status=${d.status} id_prefixo=${idCriado ? idCriado.split("_")[0] + "_" : "?"} tracking_url_host=${host}`,
    );
    if (criada.ok) {
      aceita = nome;
      console.log(`[ensaio] FAIXA ACEITA: ${nome}`);
      console.log("[ensaio] leave_at_door com foto ACEITO (corrida criada)");
      break;
    }
    console.log(`[ensaio] corrida recusada na faixa ${nome} (code=${d.code ?? "?"})`);
    leaveAtDoorRecusado = true;
  } finally {
    if (idCriado) await cancelar(idCriado);
  }
}
if (saida) process.exit(saida);
if (!aceita) {
  console.log(
    leaveAtDoorRecusado
      ? "[ensaio] nenhuma faixa criou a corrida (ver codes acima)"
      : "[ensaio] nenhuma faixa foi aceita na cotacao",
  );
  process.exit(1);
}
