# Guia Técnico, Arquitetural e Operacional Completo — Uber Direct (DaaS)

> **Propósito deste documento:** Base de conhecimento técnica e estratégica definitiva sobre o **Uber Direct**, desenhada para engenheiros de software, arquitetos de soluções, empreendedores e **agentes de IA (RAG / System Context)**. Contém arquitetura, autenticação, contratos de API, payloads JSON, máquina de estados, webhooks, segurança criptográfica, tratamento de erros, testes automatizados e regras de negócio.

---

## 1. Visão Geral e Arquitetura da Plataforma

O **Uber Direct** é a plataforma de **Delivery-as-a-Service (DaaS)** *white-label* (marca branca) da Uber. Diferente do marketplace Uber Eats, ela fornece exclusivamente a **infraestrutura logística sob demanda** para que empresas despachem pedidos originados em seus próprios canais (e-commerce, aplicativo próprio, WhatsApp, ERP/PDV ou televendas) utilizando a rede de entregadores parceiros da Uber.

### 1.1 Diferença Estratégica: Uber Direct vs. Uber Eats

| Dimensão | Uber Direct (DaaS / Logística) | Uber Eats (Marketplace) |
|---|---|---|
| **Canal de Venda** | Próprio da empresa (site, app, WhatsApp, PDV) | Aplicativo do Uber Eats |
| **Identidade Visual** | *White-label* (marca do cliente controla a jornada) | Marca Uber Eats com concorrentes lado a lado |
| **Precificação** | Taxa por entrega (sem comissão sobre o pedido) | Comissão percentual sobre o valor da venda |
| **Propriedade dos Dados** | 100% da empresa (CRM, retenção e remarketing) | Mediada pelo marketplace |
| **Aquisição de Tráfego** | Responsabilidade da empresa | Gerada organicamente pelo marketplace |

### 1.2 Suítes de API do Ecossistema Uber Direct

O portal de desenvolvedores da Uber organiza o Uber Direct em **5 suítes de API REST** sobre o host principal `https://api.uber.com`:

1. **Direct API (Core DaaS):** Cotações, criação, consulta, listagem, atualização, cancelamento de entregas e recuperação de Prova de Entrega (POD). Base: `/v1/customers/{customer_id}/...` (escopo: `eats.deliveries`).
2. **Organizations API:** Gestão multi-loja e hierarquia organizacional (matriz/filiais/franquias), onboarding descentralizado, políticas de faturamento e permissões granulares de usuários. Escopo: `direct.organizations`.
3. **Business Location Management API:** Consulta, listagem e atualização programática de dados de lojas/endereços de coleta associados à organização.
4. **Refund Submission API:** Submissão programática de solicitações de reembolso para entregas que atendam a critérios de falha elegíveis.
5. **Courier Pick & Pack (CPP) API:** Fluxo especializado para varejo/supermercados em que o próprio entregador coleta os itens nas prateleiras (inclui cotação CPP, tipos de substituição de itens e status `shopping_completed`).

> **Nota Arquitetural (DaaS vs. Legado):** A API moderna e padrão de mercado para novas integrações do Uber Direct é a **DaaS API** (`/v1/customers/{customer_id}/...`), derivada da arquitetura Postmates integrada à Uber (razão pela qual ainda existem referências históricas como o header alternativo `x-postmates-signature` e prefixos de ID como `del_`, `ret_`, `bat_`, `rte_`). Evite confundir seus contratos com endpoints legados de pedidos de restaurante sob `/v1/eats/deliveries/orders`, que possuem enums diferentes (ex.: `SCHEDULED`, `EN_ROUTE_TO_PICKUP`) e exigem aprovação específica.

---

## 2. Autenticação, Credenciais e Gestão de Tokens (OAuth 2.0)

Todas as chamadas à API exigem um token Bearer obtido via **OAuth 2.0 (`client_credentials`)**, conforme RFC 6749.

### 2.1 Credenciais no Painel (`direct.uber.com`)

Na aba **Management > Developer** do painel Uber Direct, você obtém:
* **`customer_id`**: UUID de 128 bits que identifica a organização/conta (utilizado no path das URLs da Direct API).
* **`client_id`**: Identificador público da aplicação.
* **`client_secret`**: Segredo da aplicação (deve ser tratado como senha crítica e armazenado em cofre de segredos / KMS).

> **Trava Regional Crítica:** O `customer_id` é rigidamente vinculado à região geográfica da conta. Utilizar credenciais de uma conta americana para cotar endereços no Brasil pode autenticar sem erro, mas retornará erro de cobertura ou cotações vazias.

### 2.2 Geração do Access Token

* **Endpoint:** `POST https://auth.uber.com/oauth/v2/token`
* **Content-Type:** `application/x-www-form-urlencoded`

#### Parâmetros do Corpo
| Campo | Obrigatório | Valor |
|---|---|---|
| `client_id` | Sim | Seu `client_id` |
| `client_secret` | Sim | Seu `client_secret` |
| `grant_type` | Sim | `client_credentials` |
| `scope` | Sim | `eats.deliveries` (Direct API) ou `direct.organizations` (Org API) |

#### Exemplo via `curl`
```bash
curl -X POST 'https://auth.uber.com/oauth/v2/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'client_id=SEU_CLIENT_ID' \
  --data-urlencode 'client_secret=SEU_CLIENT_SECRET' \
  --data-urlencode 'grant_type=client_credentials' \
  --data-urlencode 'scope=eats.deliveries'
```

#### Resposta (`200 OK`)
```json
{
  "access_token": "IA.eyJ...",
  "expires_in": 2592000,
  "token_type": "Bearer",
  "scope": "eats.deliveries"
}
```

### 2.3 Regras Críticas de Ciclo de Vida e Cache de Token

1. **Validade longa:** Cada token dura **30 dias** (`expires_in: 2592000` segundos).
2. **Sem Refresh Token:** Tokens existentes não são renovados (*refreshed*); basta emitir um novo token antes do vencimento.
3. **Rate Limit severo:** O endpoint de autenticação limita a emissão a **100 requisições por hora** por aplicação. Além disso, gerar tokens em excesso invalida tokens mais antigos.
4. **Regra de Engenharia:** **NUNCA** solicite um token a cada cotação ou pedido. Implemente cache compartilhado (ex.: Redis) com renovação preventiva (por exemplo, após 25 dias ou com TTL configurado com margem de segurança) e trava distribuída (*mutex/lock*) para evitar *thundering herd* na renovação.

#### Exemplo de Token Manager com Cache (Python + Redis)
```python
import time
import requests
import redis

AUTH_URL = "https://auth.uber.com/oauth/v2/token"
TOKEN_CACHE_KEY = "uber_direct:oauth_token:eats.deliveries"

class UberDirectAuthManager:
    def __init__(self, client_id: str, client_secret: str, redis_client: redis.Redis):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redis = redis_client

    def get_access_token(self, scope: str = "eats.deliveries") -> str:
        cache_key = f"uber_direct:oauth_token:{scope}"
        cached = self.redis.get(cache_key)
        if cached:
            return cached.decode("utf-8")

        # Lock distribuído simples para evitar múltiplas chamadas simultâneas
        lock = self.redis.lock(f"{cache_key}:lock", timeout=15)
        with lock:
            cached = self.redis.get(cache_key)
            if cached:
                return cached.decode("utf-8")

            resp = requests.post(
                AUTH_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "grant_type": "client_credentials",
                    "scope": scope,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10,
            )
            resp.raise_for_status()
            payload = resp.json()
            token = payload["access_token"]
            expires_in = int(payload.get("expires_in", 2592000))

            # Armazena com margem de segurança de 24 horas antes da expiração
            ttl = max(expires_in - 86400, 3600)
            self.redis.setex(cache_key, ttl, token)
            return token
```

---

## 3. Referência Completa da Direct API (Core DaaS)

* **Base URL (Produção e Sandbox):** `https://api.uber.com/v1/customers/{customer_id}`
* **Headers obrigatórios em todas as chamadas:**
  * `Authorization: Bearer {access_token}`
  * `Content-Type: application/json`

> **Atenção sobre Ambientes:** Diferente de APIs que usam domínios separados para sandbox, no fluxo moderno do painel `direct.uber.com`, o modo **Test (Sandbox)** vs. **Production (Live)** é determinado pelas credenciais (`client_id`/`client_secret`/`customer_id`) selecionadas no toggle do painel. O campo booleano `live_mode` retornado nos payloads indica `false` em testes e `true` em produção.

### 3.1 Mapa de Endpoints

| Operação | Método & Path | Propósito Principal |
|---|---|---|
| **Create Quote** | `POST /delivery_quotes` | Valida cobertura, calcula tarifa (`fee` em centavos) e retorna `quote_id` (TTL 15 min) |
| **Create Delivery** | `POST /deliveries` | Cria e despacha uma entrega (imediata ou agendada) |
| **List Deliveries** | `GET /deliveries` | Lista entregas com filtros (`external_store_id`, `start_dt`, `end_dt`, `filter`) |
| **Get Delivery** | `GET /deliveries/{delivery_id}` | Consulta estado completo, entregador, ETAs, URLs de POD e retornos |
| **Update Delivery** | `POST /deliveries/{delivery_id}` | Atualiza notas, gorjeta (*tip*, apenas aumento) ou códigos de barras |
| **Cancel Delivery** | `POST /deliveries/{delivery_id}/cancel` | Cancela entrega em andamento (aceita motivo de cancelamento) |
| **Proof of Delivery** | `POST /deliveries/{delivery_id}/proof-of-delivery` | Recupera dados/imagens de prova de entrega por `waypoint` e `type` |
| **Find Stores** | `GET /stores` (conforme habilitação) | Lista/valida lojas aptas a atender determinada região |

---

### 3.2 Endpoint 1: Create Quote (`POST /delivery_quotes`)

Valida se a Uber consegue atender o trajeto entre origem e destino, calcula o preço e devolve janelas estimadas.

#### Regras Importantes
* **Valores monetários:** Sempre em **centavos** (menor unidade da moeda). Ex.: `1250` = R$ 12,50 (`BRL`).
* **Expiração (`TTL`):** O `quote_id` gerado (prefixo `dqt_`) expira em **15 minutos**. Se o usuário demorar no checkout, uma nova cotação deve ser solicitada antes de criar a entrega.
* **Formato do Endereço (Pegadinha Clássica):** `pickup_address` e `dropoff_address` esperam uma **string contendo um JSON serializado** do endereço estruturado (ou string plana, que é fortemente desencorajada por gerar falhas de geocoding).

#### Request Payload (Exemplo)
```json
{
  "pickup_address": "{\"street_address\":[\"Av. Paulista, 1578\",\"Loja 2\"],\"state\":\"SP\",\"city\":\"São Paulo\",\"zip_code\":\"01310-200\",\"country\":\"BR\"}",
  "dropoff_address": "{\"street_address\":[\"Rua Augusta, 2690\",\"Apto 42\"],\"state\":\"SP\",\"city\":\"São Paulo\",\"zip_code\":\"01412-100\",\"country\":\"BR\"}",
  "pickup_latitude": -23.561414,
  "pickup_longitude": -46.655881,
  "dropoff_latitude": -23.563842,
  "dropoff_longitude": -46.668941,
  "pickup_ready_dt": "2026-11-21T23:30:00Z",
  "pickup_deadline_dt": "2026-11-21T23:50:00Z",
  "dropoff_ready_dt": "2026-11-21T23:45:00Z",
  "dropoff_deadline_dt": "2026-11-22T00:30:00Z",
  "pickup_phone_number": "+5511999990001",
  "dropoff_phone_number": "+5511999990002",
  "manifest_total_value": 15990,
  "external_store_id": "loja_paulista_01"
}
```

#### Response Payload (`200 OK`)
```json
{
  "kind": "delivery_quote",
  "id": "dqt_v3x8a9b2c1...",
  "created": "2026-11-21T23:15:00Z",
  "expires": "2026-11-21T23:30:00Z",
  "fee": 1490,
  "currency": "brl",
  "currency_type": "BRL",
  "dropoff_eta": "2026-11-21T23:52:00Z",
  "duration": 37,
  "pickup_duration": 12,
  "dropoff_deadline": "2026-11-22T00:30:00Z"
}
```

---

### 3.3 Endpoint 2: Create Delivery (`POST /deliveries`)

Cria o pedido logístico e inicia o despacho de um entregador (imediatamente ou conforme a janela `pickup_ready_dt`).

#### Campos Críticos
* **`quote_id`**: Obtido no passo anterior (garante o preço cotado se os endereços forem idênticos e estiver dentro dos 15 min).
* **`idempotency_key`**: Chave única gerada pelo seu backend (ex.: UUID por tentativa de despacho). Garante que retentativas de rede não criem duas entregas duplicadas para o mesmo pedido. O período padrão de deduplicação é de **60 minutos**.
* **`manifest_items`**: Lista detalhada dos produtos. Suporta `dimensions` (`length`, `height`, `depth`), `weight`, `size` (`small`, `medium`, `large`, `xlarge`), `price` (centavos), `must_be_upright`, `perishability`, `preparation_time` e `item_customizations` (utilizando a propriedade `item_customization_options`).
* **`deliverable_action`**: Define como o entregador deve finalizar a entrega bem-sucedida:
  * `deliverable_action_meet_at_door` (encontrar na porta)
  * `deliverable_action_leave_at_door` (deixar na porta — ativa foto automaticamente)
* **`undeliverable_action`**: Regra de exceção se o destinatário não for localizado:
  * `return` (**padrão da plataforma** — gera viagem de devolução automática com ID `ret_`, cobrada adicionalmente)
  * `leave_at_door` (deixar em local seguro)
  * `discard` (descartar, quando habilitado para categorias específicas como alimentos)
* **`user_fees_summary`**: Objeto opcional que discrimina taxas/descontos pagos pelo consumidor final (`amount` em centavos), permitindo que o suporte gerenciado da Uber calcule reembolsos parciais em nome do lojista.
* **`external_store_id`**: Identificador da loja no seu ERP/sistema (fundamental para filtros, relatórios e controle de acesso por loja).

#### Request Payload Completo (Exemplo de Produção + Verificações)
```json
{
  "quote_id": "dqt_v3x8a9b2c1...",
  "pickup_name": "Empório Paulista",
  "pickup_address": "{\"street_address\":[\"Av. Paulista, 1578\",\"Loja 2\"],\"state\":\"SP\",\"city\":\"São Paulo\",\"zip_code\":\"01310-200\",\"country\":\"BR\"}",
  "pickup_phone_number": "+5511999990001",
  "pickup_business_name": "Empório Paulista Ltda",
  "pickup_latitude": -23.561414,
  "pickup_longitude": -46.655881,
  "pickup_notes": "Retirar no balcão lateral de expedição. Informar código do pedido.",
  "dropoff_name": "João Silva",
  "dropoff_address": "{\"street_address\":[\"Rua Augusta, 2690\",\"Apto 42\"],\"state\":\"SP\",\"city\":\"São Paulo\",\"zip_code\":\"01412-100\",\"country\":\"BR\"}",
  "dropoff_phone_number": "+5511999990002",
  "dropoff_latitude": -23.563842,
  "dropoff_longitude": -46.668941,
  "dropoff_notes": "Interfonar no 42. Não deixar na portaria.",
  "return_notes": "Devolver no balcão lateral e coletar assinatura do gerente.",
  "manifest_reference": "PED-2026-009841",
  "external_id": "order_9841_internal",
  "external_store_id": "loja_paulista_01",
  "idempotency_key": "8f14e45f-ea9c-4c31-9841-dispatch01",
  "manifest_total_value": 15990,
  "tip": 500,
  "deliverable_action": "deliverable_action_meet_at_door",
  "undeliverable_action": "return",
  "pickup_ready_dt": "2026-11-21T23:30:00Z",
  "pickup_deadline_dt": "2026-11-21T23:50:00Z",
  "dropoff_ready_dt": "2026-11-21T23:45:00Z",
  "dropoff_deadline_dt": "2026-11-22T00:30:00Z",
  "manifest_items": [
    {
      "name": "Kit Vinho Tinto Reserva",
      "quantity": 1,
      "size": "medium",
      "price": 15990,
      "weight": 1500,
      "must_be_upright": true,
      "dimensions": {
        "length": 35,
        "height": 12,
        "depth": 12
      },
      "item_customizations": [
        {
          "name": "Embalagem",
          "item_customization_options": [
            {
              "name": "Caixa Presente Reforçada",
              "price": 0
            }
          ]
        }
      ]
    }
  ],
  "pickup_verification": {
    "barcodes": [
      {
        "value": "PKG-9841-01",
        "type": "CODE128"
      }
    ],
    "picture": false
  },
  "dropoff_verification": {
    "signature_requirement": {
      "enabled": true,
      "collect_signer_name": true,
      "collect_signer_relationship": false
    },
    "pincode": {
      "enabled": true
    },
    "identification": {
      "min_age": 18,
      "no_sobriety_check": false
    },
    "picture": true
  },
  "return_verification": {
    "signature_requirement": {
      "enabled": true,
      "collect_signer_name": true,
      "collect_signer_relationship": false
    },
    "barcodes": [
      {
        "value": "PKG-9841-01",
        "type": "CODE128"
      }
    ]
  }
}
```

#### Campos Relevantes na Resposta (`200 OK`)
* `id`: ID da entrega (prefixo `del_`, ex.: `del_9x8y7z...`).
* `uuid`: UUID v4 sem hifens (ex.: `41B2E8C22C0740CF9BE1EF1898E64D3B`).
* `status`: Estado inicial (`pending`).
* `tracking_url`: URL pública de rastreamento ao vivo. **Regra obrigatória:** Nunca faça parsing, encurtamento ou reescrita da estrutura dessa URL; repasse-a intacta ao cliente final, pois o formato pode mudar sem aviso prévio.
* `dropoff.verification_requirements.pincode.value`: PIN gerado internamente pela Uber (somente leitura) para você exibir ao cliente final no seu app/WhatsApp.
* `live_mode`: `true` (produção) ou `false` (sandbox).

---

### 3.4 Endpoints de Gestão Pós-Criação

#### List Deliveries (`GET /deliveries`)
Suporta paginação e os seguintes *query parameters*:
* `external_store_id`: Filtra entregas por unidade/loja.
* `start_dt` / `end_dt`: Janela temporal no formato **RFC 3339** (ex.: `2026-11-01T00:00:00Z`).
* `filter`: Filtro por status (ex.: `ongoing`).

#### Get Delivery (`GET /deliveries/{delivery_id}`)
Retorna o snapshot completo da entrega, incluindo:
* Objeto `courier` (nome, foto `img_href`, avaliação, `vehicle_type`, últimos 4 dígitos da placa em `vehicle_license_plate`, `unmarked_location_description` e telefone anonimizado em `public_phone_info` com `phone_number` + `pin_code`).
* Links de Prova de Entrega (`verification.picture.image_url`, `verification.signature.image_url`, resultados de leitura de código de barras com `outcome` e `timestamp`).
* `related_deliveries` (vinculando entregas `original` e `returned`).

#### Update Delivery (`POST /deliveries/{delivery_id}`)
Permite atualizar parâmetros específicos de uma entrega ativa ou recente:
* **Gorjeta (`tip_by_customer`):** Por política de garantia de ganhos ao entregador, gorjetas **só podem ser aumentadas**, nunca reduzidas. O aumento pode ser enviado em até **3 semanas** após a conclusão da corrida. Se uma gorjeta foi enviada incorretamente por engano antes do despacho, a única saída é cancelar e recriar a entrega.
* **Códigos de Barras (`pickup_verification` / `dropoff_verification`):** Os valores de códigos de barras só podem ser alterados **antes** que o evento `courier_imminent` seja disparado para o respectivo waypoint.
* **Notas (`pickup_notes` / `dropoff_notes`)**: Atualizáveis antes da conclusão do respectivo trecho.

#### Cancel Delivery (`POST /deliveries/{delivery_id}/cancel`)
Cancela a entrega e aceita campos opcionais especificando o motivo do cancelamento pelo merchant.
> **Atenção Financeira:** Cancelamentos realizados após a aceitação/chegada do entregador podem incorrer em taxa de cancelamento conforme contrato comercial.

---

## 4. Geocoding, Endereços e Janelas Temporais

Grande parte dos bugs em produção em integrações com o Uber Direct ocorre por má gestão de endereços e coordenadas.

### 4.1 Regras de Ouro para Endereços
1. **Sempre use JSON estruturado serializado:**
   ```json
   {
     "street_address": ["Logradouro, Número", "Complemento"],
     "city": "Cidade",
     "state": "UF",
     "zip_code": "CEP",
     "country": "BR"
   }
   ```
   (Ao enviar no campo `pickup_address` ou `dropoff_address`, esse JSON é escapado como string).
2. **Consistência absoluta:** A string de endereço enviada no `Create Delivery` deve ser **exatamente idêntica** à enviada no `Create Quote`. Qualquer divergência (mesmo abreviação ou espaço extra) gera erro `400 ("delivery location changed")` e rejeição da cotação.
3. **Comportamento Padrão de Geocoding:**
   * Por padrão, a Uber geocodifica o endereço de entrega (*dropoff*) a partir do texto estruturado.
   * Se você enviar `latitude` e `longitude` que divirjam em **mais de `$1\text{ km}$`** das coordenadas calculadas pela Uber para aquele endereço textual, a plataforma descarta suas coordenadas e utiliza o geocoding próprio dela.
   * Caso sua operação dependa de pinos customizados (ex.: zonas rurais, condomínios gigantes sem arruamento mapeado), é necessário solicitar ao Suporte Uber a habilitação de preferência pelas coordenadas enviadas pelo merchant.

### 4.2 Janelas de Entrega (`Delivery Window`)
Todas as datas devem seguir o padrão **RFC 3339 / ISO 8601** com fuso horário explícito (preferencialmente UTC, ex.: `2026-11-21T18:00:00Z`).
* **Imediata (ASAP / Expressa):** Omita os campos de janela ou informe apenas `pickup_ready_dt` no passado/presente.
* **Agendada:** Suporta agendamento de até **30 dias de antecedência** (sujeito à disponibilidade regional).
  * `pickup_ready_dt`: Início da janela de coleta (momento em que o pedido estará pronto).
  * `pickup_deadline_dt`: Limite máximo para coleta.
  * `dropoff_ready_dt`: Início da janela aceita pelo cliente final.
  * `dropoff_deadline_dt`: Prazo máximo de entrega ao cliente final.

---

## 5. Máquina de Estados, Prefixos de IDs e Fluxo de Retorno

### 5.1 Estados da Entrega (`status`)

```text
                    ┌──────────────────────────────┐
                    ▼                              │
[pending] ──▶ [pickup] ──▶ [pickup_complete] ──▶ [dropoff] ──▶ [delivered]
    │            │                │                  │
    ▼            ▼                ▼                  ▼
[canceled]   [canceled]      [canceled]         [returned]
                                                    │
                                                    ▼
                                       (Nova perna com ID ret_...)
```

| Status | Significado Técnico | Gatilho Principal |
|---|---|---|
| `pending` | Entrega criada; buscando entregador disponível | API `Create Delivery` |
| `pickup` | Entregador aceitou a oferta e está indo à loja | App do entregador (aceite manual) |
| `pickup_complete` | Entregador coletou o pacote na loja | App do entregador (confirmação + POD coleta) |
| `dropoff` | Entregador a caminho do endereço de destino | Transição imediata após coleta |
| `delivered` | Pacote entregue com sucesso ao cliente | App do entregador (swipe + POD entrega) |
| `canceled` | Entrega cancelada (pelo merchant, Uber ou entregador) | API Cancel ou exceção operacional |
| `returned` | Entrega original falhou e foi devolvida à loja | Fluxo de `undeliverable_action: "return"` |
| `shopping_completed` | *(Exclusivo CPP API)* Entregador concluiu a compra no mercado | App do entregador (Pick & Pack) |

### 5.2 Flag `courier_imminent`
* É um booleano presente nos webhooks e no `GET Delivery`.
* Muda para `true` automaticamente via GPS quando o entregador está a aproximadamente **1 minuto** (cerca de 80 metros) do ponto de coleta (durante `pickup`) ou do ponto de entrega (durante `dropoff`).
* **Uso prático:** Acionar bip/alerta no KDS da cozinha/expedição para despachar pedido quente na hora exata ou enviar push "Seu entregador está chegando!" ao cliente.

### 5.3 Prefixos Oficiais de Identificadores e Batching

| Prefixo / Campo | Significado | Observação Crítica |
|---|---|---|
| `dqt_` | ID da Cotação (`quote_id`) | Expira em 15 minutos |
| `del_` | ID da Entrega Original (`delivery_id`) | Perna de ida (`relationship: "original"`) |
| `ret_` | ID da Entrega de Retorno | Criada automaticamente em falhas com `return` (`relationship: "returned"`) |
| `bat_` | ID de Lote (`batch_id`) | Identifica entregas agrupadas no mesmo entregador. **Atenção:** Se o entregador cancelar a caminho da coleta e outro assumir, o `batch_id` muda! |
| `rte_` | ID de Rota (`route_id`) | Identificador da rota executada pelo entregador |

---

## 6. Prova de Entrega (Proof of Delivery — POD)

A Uber Direct oferece 5 mecanismos nativos de validação por waypoint (`pickup_verification`, `dropoff_verification`, `return_verification`).

### 6.1 Matriz de Suporte e Retenção

| Método | Coleta (`pickup`) | Entrega (`dropoff`) | Retorno (`return`) | Retenção da Evidência | Regras & Observações |
|---|---|---|---|---|---|
| **Foto (`picture`)** | Sim | Sim | Sim | **7 dias** no Dashboard / **30 dias** via API | Ativada automaticamente em `leave_at_door`. Sua aplicação deve baixar e armazenar em storage próprio (S3/GCS) se precisar de auditoria $> 30$ dias. |
| **Assinatura (`signature_requirement`)** | Sim | Sim | Sim | **30 dias** via API | Permite exigir `collect_signer_name` e `collect_signer_relationship`. |
| **Código de Barras (`barcodes`)** | Sim | Sim | Sim | Metadados na entrega | Suporta múltiplos códigos. Tipos válidos: `CODE39`, `CODE39_FULL_ASCII`, `CODE128`, `QR`. Retorna `scan_result` com `outcome` e `timestamp`. |
| **PIN (`pincode`)** | Não | Sim | Não | Metadados na entrega | Gerado pela Uber (`dropoff.verification_requirements.pincode.value`). Ideal para eletrônicos e tickets altos. |
| **Identidade (`identification`)** | Não | Sim | Não | Flag `min_age_verified` | Obrigatório para itens regulados (álcool, tabaco, medicamentos). Incompatível com `leave_at_door`. Ativa verificação de sobriedade por padrão (desativável via `no_sobriety_check: true` se aplicável). Falha força viagem de retorno. |

### 6.2 Recomendações por Vertical
* **Restaurantes / Perecíveis:** `leave_at_door` + `picture` (ou `barcodes` na coleta para evitar troca de sacolas).
* **Varejo / Eletrônicos / Alto Valor:** `meet_at_door` + `pincode` + `signature_requirement` + `undeliverable_action: "return"`.
* **Bebidas Alcoólicas / Farmácia Regulada:** `meet_at_door` + `identification` (`min_age: 18`) + `undeliverable_action: "return"`.

---

## 7. Webhooks, Segurança Criptográfica e Resiliência

A configuração dos endpoints é feita no painel `direct.uber.com` (**Developer > Webhooks > Create Webhook**). O servidor de destino **deve obrigatoriamente usar HTTPS** com certificado TLS válido.

### 7.1 Catálogo Completo de Eventos de Webhook

| `kind` / Tipo do Evento | Frequência / Gatilho | Dados Principais |
|---|---|---|
| `event.delivery_status` | Estático — dispara a cada mudança de `status` ou `courier_imminent` | Status atual, objeto `data` completo da entrega, `cancelation_reason` (`primary_reason` e `secondary_reason`), `related_deliveries`, POD |
| `event.courier_update` | Dinâmico — dispara a cada **20 segundos** a partir do status `pickup` | Coordenadas GPS (`lat`/`lng`) do entregador, ETAs atualizados, placa, telefone mascarado + PIN e cópia completa de `data` |
| `event.refund_request` | Quando o suporte gerenciado da Uber aprova/solicita reembolso | Valores de reembolso para que o backend do merchant execute o estorno financeiro no gateway de pagamento |
| `event.shopping_progress` | Exclusivo da API Courier Pick & Pack (CPP) | Progresso de coleta de itens em prateleira e substituições |
| `direct.organization` | Eventos administrativos da organização (adicionado em Out/2026) | Ativação/desativação de política de faturamento (*billing policy*) e conclusão de formulário fiscal (*tax form*) em sub-organizações |

> **Nota sobre Privacidade pós-entrega:** Quando o status chega a `delivered`, a Uber remove propositalmente as coordenadas GPS (`lat`/`lng`) e informações do veículo do entregador do payload do webhook final.

### 7.2 Exemplo Simplificado de Payload (`event.delivery_status`)
```json
{
  "account_id": "cus_...",
  "created": "2026-11-21T23:42:10.123Z",
  "customer_id": "e3b0c442-98fc-1c14-9afb-f4c8996fb924",
  "delivery_id": "del_9x8y7z6w5v",
  "id": "evt_1234567890",
  "kind": "event.delivery_status",
  "live_mode": true,
  "status": "dropoff",
  "data": {
    "id": "del_9x8y7z6w5v",
    "status": "dropoff",
    "complete": false,
    "courier_imminent": true,
    "tracking_url": "https://www.ubereats.com/orders/...",
    "batch_id": "bat_abc123",
    "route_id": "rte_xyz789",
    "fee": 1490,
    "currency": "brl",
    "pickup_eta": "2026-11-21T23:32:00Z",
    "dropoff_eta": "2026-11-21T23:43:00Z",
    "courier": {
      "name": "Carlos M.",
      "rating": "4.95",
      "vehicle_type": "motorcycle",
      "vehicle_license_plate": "4B89",
      "img_href": "https://...",
      "location": {
        "lat": -23.56371,
        "lng": -46.66882
      },
      "public_phone_info": {
        "phone_number": "+551130000000",
        "pin_code": "123456"
      }
    },
    "related_deliveries": []
  }
}
```

### 7.3 Verificação Criptográfica (HMAC-SHA256)

Toda requisição de webhook da Uber é assinada com **HMAC-SHA256** utilizando a **Signing Key específica** cadastrada naquele webhook (NÃO utilize o `client_secret`).

#### Headers de Assinatura
* `x-uber-signature`: Suportado em **todos** os webhooks (use sempre este como padrão).
* `x-postmates-signature`: Header legado presente em `event.delivery_status` e `event.courier_update`, mas **inexistente** no `event.refund_request`.

#### Pegadinha Crítica de Parsing (Raw Body & Unicode)
* O hash HMAC **deve** ser computado sobre os **bytes brutos (*raw body*)** recebidos no HTTP POST, **antes** de qualquer `JSON.parse()` ou desserialização.
* Payloads podem conter sequências de escape Unicode (ex.: `\u0026` no lugar de `&`). Bibliotecas que desserializam e reserializam o JSON alteram esses bytes e fazem a verificação de assinatura falhar silenciosamente!
* Utilize sempre comparação em tempo constante (`hmac.compare_digest` / `crypto.timingSafeEqual`) para prevenir *timing attacks*.

#### Implementação Segura em Node.js / TypeScript (Express)
```typescript
import crypto from 'crypto';
import express, { Request, Response } from 'express';

const app = express();

// Captura o rawBody intacto antes do parse JSON
app.post(
  '/webhooks/uber-direct',
  express.raw({ type: 'application/json' }),
  (req: Request, res: Response) => {
    const signatureHeader = req.header('x-uber-signature');
    const signingKey = process.env.UBER_WEBHOOK_SIGNING_KEY!;

    if (!signatureHeader || !Buffer.isBuffer(req.body)) {
      return res.status(401).send('Missing signature or raw body');
    }

    const expectedHash = crypto
      .createHmac('sha256', signingKey)
      .update(req.body)
      .digest('hex');

    const sigBuf = Buffer.from(signatureHeader, 'utf8');
    const expBuf = Buffer.from(expectedHash, 'utf8');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return res.status(401).send('Invalid signature');
    }

    // Responda 200 rapidamente e enfileire o processamento assíncrono
    const event = JSON.parse(req.body.toString('utf8'));
    enqueueWebhookEvent(event); // Ex: SQS / BullMQ / RabbitMQ

    return res.status(200).json({ received: true });
  }
);
```

#### Implementação Segura em Python (FastAPI)
```python
import hashlib
import hmac
import json
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()
WEBHOOK_SIGNING_KEY = "sua_signing_key_do_webhook"

@app.post("/webhooks/uber-direct")
async def uber_webhook(request: Request):
    raw_body: bytes = await request.body()
    signature = request.headers.get("x-uber-signature", "")

    expected = hmac.new(
        WEBHOOK_SIGNING_KEY.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    if not signature or not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")

    payload = json.loads(raw_body.decode("utf-8"))
    # Enfileirar para processamento assíncrono + deduplicação por payload["id"]
    return {"status": "ok"}
```

### 7.4 Política de Retries e Arquitetura de Resiliência

* **Quando a Uber reenvia:** Apenas em erros de servidor `500`, `502`, `503`, `504`, timeout ou falha de rede. Respostas `4xx` (como `400` ou `401`) **não** disparam retry.
* **Limite rígido:** O primeiro retry ocorre após **10 segundos**, com intervalo crescente, mas a Uber **interrompe definitivamente após 3 falhas consecutivas**.
* **Arquitetura Obrigatória em Produção:**
  1. **Ack Rápido:** Valide o HMAC, grave o evento bruto em uma fila/banco e devolva HTTP `200` em menos de 1–2 segundos.
  2. **Deduplicação e Ordem:** Webhooks podem chegar fora de ordem ou duplicados. Use `event.id` para idempotência e valide transições de estado (não regredir de `delivered` para `dropoff`).
  3. **Job de Reconciliação (Fallback Polling):** Mantenha um *cron worker* rodando a cada 2–5 minutos que consulta `GET /deliveries/{delivery_id}` para todas as entregas com status aberto que não receberam eventos recentes (ex.: há mais de 3 minutos).

---

## 8. APIs Complementares (Multi-Loja, Reembolsos e Pick & Pack)

### 8.1 Organizations API (`scope: direct.organizations`)
Ideal para plataformas SaaS, franqueadoras, dark kitchens e redes de varejo:
* Criação programática de sub-organizações vinculadas à conta matriz.
* Suporte a **onboarding descentralizado self-serve** definindo `contract_type: "CONTRACT_TYPE_PARENT"` e informando `point_of_contact` (`first_name`, `last_name`, e-mail).
* Consulta de detalhes de faturamento (`billing_information`) e monitoramento via webhook `direct.organization`.
* Convite de usuários com **controle granular de permissões (`role_assignments`)** em nível de organização ou de loja específica (usando `external_store_id`), incluindo perfis como `ROLE_SUPPORT`. *(Obs.: exige habilitação de store-level access via Account Manager; alterações posteriores de role exigem uso do Dashboard).*

### 8.2 Business Location Management API
Permite listar, consultar e atualizar programaticamente os dados operacionais das lojas/unidades físicas vinculadas à organização, evitando manutenção manual no painel quando a rede possui dezenas ou centenas de endereços.

### 8.3 Refund Submission API
Permite abrir solicitações de reembolso programaticamente via API para entregas que apresentem falhas cobertas pelos critérios contratuais da Uber (ex.: avaria, extravio, atraso crítico), integrando o pós-venda direto no seu CRM/ERP.

### 8.4 Courier Pick & Pack (CPP) API
Projetada para supermercados, conveniências e farmácias onde não há equipe interna de separação: o entregador recebe a lista de itens, coleta nas prateleiras, propõe substituições (`replacement_types`) e dispara atualizações via webhook `event.shopping_progress` e status `shopping_completed`.

---

## 9. Sandbox, Robo Courier, Rate Limits e Troubleshooting

### 9.1 Rate Limits
* **OAuth Token (`auth.uber.com`):** **100 requisições/hora** por aplicação.
* **Sandbox:** **200 requisições a cada 10 minutos** por `application_id`.
* **Produção:** Variável por endpoint. Exceder o limite retorna HTTP `429` com código `customer_limited` (implemente fila com *exponential backoff* + *jitter*).

### 9.2 Testes Automatizados com Robo Courier (Sandbox)

No ambiente Sandbox, inclua o objeto `test_specifications` no payload de `Create Delivery` para acionar o **Robo Courier**, que simula todo o ciclo de vida de um entregador real e dispara os webhooks correspondentes.

#### Modo Automático (Sucesso)
```json
"test_specifications": {
  "robo_courier_specification": {
    "mode": "auto"
  }
}
```
Cronograma padrão no modo `auto` (quando não há janela futura):
* `T + 00s`: Entregador atribuído (`pending` → `pickup`).
* `T + 30s`: Entregador a caminho da coleta.
* `T + 60s`: `courier_imminent: true` na coleta (posicionado no endereço de pickup).
* `T + 90s`: Coleta realizada (`pickup_complete` → `dropoff`).
* `T + 120s`: `courier_imminent: true` na entrega (posicionado no endereço de dropoff).
* `T + 150s`: Entrega concluída (`delivered`).

*(Também é possível usar modo customizado definindo timestamps explícitos como `enroute_for_pickup_at` e `dropoff_at`).*

#### Simulação de Cancelamento e Retorno
```json
"test_specifications": {
  "robo_courier_specification": {
    "mode": "auto",
    "cancel_reason": "customer_unavailable"
  }
}
```
Valores suportados em `cancel_reason`:
* `cannot_access_customer_location`
* `cannot_find_customer_address`
* `customer_rejected_order`
* `customer_unavailable`

> **Limitações do Robo Courier:** Não simula *batching* (entregas agrupadas), não simula *Parking Bay Check-in* e **não deve ser usado para testes de carga/estresse**.

### 9.3 Matriz de Erros HTTP e Troubleshooting

| HTTP | Código / Mensagem | Causa Raiz Comum | Ação Recomendada no Backend |
|---|---|---|---|
| `400` | `delivery location changed` | Endereço no `Create Delivery` difere da formatação enviada no `Create Quote` | Armazene a string exata serializada usada na cotação e reutilize-a literalmente |
| `400` | `address_undeliverable_limited_couriers` | Sem entregadores disponíveis ou fora da área de cobertura atual | Não exibir opção Uber Direct no checkout ou oferecer fallback logístico |
| `400` | `invalid_params` | Campos malformados (ex.: telefone fora do padrão E.164 `+55...`, valor negativo, JSON não escapado) | Validar schema antes do envio (Zod/Pydantic) |
| `401` | `unauthorized` | Token expirado, revogado ou escopo errado (`direct.organizations` vs `eats.deliveries`) | Invalidar cache do token, renovar uma vez e repetir a chamada |
| `403` | `customer_blocked` (`tax_form_required`) | Conta suspensa, falta de método de pagamento ou **formulário fiscal pendente** no painel da organização | Alertar operação/financeiro imediatamente com link do painel da org |
| `404` | `delivery_not_found` | `delivery_id` inexistente ou pertencente a outro `customer_id` / ambiente (Test vs Live) | Conferir mapeamento `customer_id` ↔ loja e ambiente |
| `429` | `customer_limited` | Rate limit excedido (produção, sandbox ou OAuth 100/h) | Enfileirar com *exponential backoff* + *jitter*; auditar cache de token |
| `5xx` | `internal_server_error` / `503` | Instabilidade transitória na Uber | Retry com a **mesma `idempotency_key`** no `Create Delivery` |

### 9.4 Checklist de Go-Live (Produção)
1. [ ] Cadastro empresarial completo + método de pagamento/faturamento configurado + **formulário fiscal preenchido**.
2. [ ] Cache distribuído de OAuth Token implementado (sem chamadas por pedido).
3. [ ] `idempotency_key` gerada e persistida no banco antes de chamar `Create Delivery`.
4. [ ] Validação HMAC-SHA256 sobre *raw body* validada com casos de escape Unicode.
5. [ ] Worker assíncrono de webhooks + Job de reconciliação (`GET Delivery`) ativos.
6. [ ] Rotina de download e arquivamento de imagens de POD (fotos/assinaturas) configurada (expiram em 30 dias na API).
7. [ ] Fluxos de exceção (`canceled`, `returned`, estorno no gateway de pagamento) testados via Robo Courier.
8. [ ] **Piloto controlado com lojas reais** executado e aprovado junto ao Account Manager / time de integração da Uber (obrigatório antes da liberação em escala).
9. [ ] Troca das credenciais de Sandbox para Produção (`live_mode: true`) e verificação de URLs de webhook no ambiente Live.

---

## 10. Contexto de Negócio, Limites Operacionais, Prós e Contras

### 10.1 Parâmetros Operacionais (Brasil)
* **Cobertura:** Presente nos 27 estados, todas as capitais e mais de 180 municípios brasileiros onde a Uber opera.
* **Limites físicos padrão:** Pacotes compatíveis com o volume aproximado de uma mala, até **$22{,}65\text{ kg}$** ($50\text{ lb}$).
* **Raio padrão:** Aproximadamente **$16\text{ km}$** ($10\text{ milhas}$), expansível mediante negociação comercial.
* **Modelos de Suporte:**
  * *Gerenciado pela marca:* Seu time atende o cliente e aciona a Uber quando necessário.
  * *Gerenciado pela Uber:* A Uber atende em tempo real e decide reembolsos. **Regra Crítica:** A Uber **nunca** estorna o cartão/Pix do seu cliente final diretamente — ela envia um webhook (`event.refund_request`) informando a decisão para que o **seu sistema** execute o estorno financeiro.

### 10.2 Prós e Contras (Visão Empreendedor + Engenheiro)

| Dimensão | Prós | Contras / Riscos |
|---|---|---|
| **Comercial** | Zero mensalidade fixa, zero comissão sobre ticket do produto, 100% de posse dos dados do cliente e controle total do preço do frete no checkout. | Não gera demanda/tráfego orgânico; exige investimento próprio em aquisição de clientes. |
| **Operacional** | Escala elástica imediata em mais de 180 cidades, modalidades expressa, mesmo dia e agendada (até 30 dias). | Preço dinâmico sobe em picos/chuva; dependência de liquidez local de entregadores; retorno (`return`) gera custo extra. |
| **Técnico** | API REST madura, coleção oficial no Postman (`postman.com/uber/workspace/uber-direct`), POD granular (PIN, foto, ID, barcode) e Robo Courier excelente para QA. | Rate limit rígido de OAuth (100/h), cotação expira em 15 min, webhook desiste após 3 erros, imagens de POD somem após 30 dias e piloto real obrigatório antes do go-live massivo. |

---

## 11. Regras de Ouro para Contexto de Agente de IA (Guardrails)

Se este documento for injetado como contexto em um agente de IA (suporte técnico, arquiteto de soluções ou assistente de negócios), o agente deve obedecer estritamente às diretrizes abaixo:

1. **Separação conceitual:** Nunca confundir Uber Direct (logística *white-label* via API sem comissão de venda) com Uber Eats (marketplace).
2. **Precisão monetária e temporal:** Sempre expressar valores de API (`fee`, `tip`, `manifest_total_value`, `price`, `amount`) em **centavos (inteiros)**, datas em **RFC 3339 (UTC)** e lembrar que `quote_id` expira em **15 minutos**.
3. **Arquitetura obrigatória em recomendações de código:**
   * Sempre exigir **cache de token OAuth** (TTL até 30 dias, limite 100 req/h).
   * Sempre incluir **`idempotency_key`** em `Create Delivery`.
   * Sempre serializar `pickup_address` e `dropoff_address` como **JSON estruturado em string idêntica** entre cotação e criação.
   * Sempre validar webhooks com **HMAC-SHA256 sobre o `raw_body`** usando a **Signing Key** (e header `x-uber-signature`), jamais sobre JSON reserializado.
   * Sempre prever **cron de reconciliação (`GET Delivery`)**, pois webhooks param após 3 falhas.
4. **Regras de negócio imutáveis:**
   * Gorjetas via `Update Delivery` **só podem aumentar** (até 3 semanas após entrega).
   * `undeliverable_action` padrão é `return` (gera viagem `ret_` cobrada); definir explicitamente por vertical de produto.
   * Itens restritos (álcool/medicamentos/tabaco) exigem `identification` e são incompatíveis com `leave_at_door`.
   * Fotos/assinaturas de POD expiram em **30 dias na API** (7 dias no painel) — sempre recomendar persistência em bucket próprio.
   * Reembolso ao cliente final é sempre executado pelo gateway de pagamento do merchant, nunca diretamente pela Uber.
5. **Planejamento de lançamento:** Sempre alertar sobre o preenchimento do formulário fiscal (evita `403 customer_blocked`), validação com Robo Courier e necessidade de piloto com lojas reais antes da escala em produção.