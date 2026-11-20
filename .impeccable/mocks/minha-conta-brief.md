# Esboços de Minha conta (AMO): o que vale para os três

Rodada de decisão do Impeccable, código primeiro (não há geração de imagem).
O dono vai escolher um dos três esboços. Ele pediu "o visual mais lindo
possível"; a cliente prefere moderno, fino e delicado, nunca grosso, marcante
ou cartoonizado. Modo da tela: Operate (a cliente faz uma tarefa: acompanhar o
pedido, ver os antigos, mudar os dados). O mundo visual já está decidido e não
muda: leia `DESIGN.md` inteiro antes de desenhar, e copie os tokens de lá.

## Leia antes

- `DESIGN.md` (tokens, regras nomeadas, componentes: campo, botões, pílula,
  sumário do catálogo, fio das etapas da sacola, as duas portas).
- `PRODUCT.md` (a marca, o tom, o que não se inventa).
- `.impeccable/mocks/decision/conta-abas.html`: esboço anterior aprovado
  (as telas de entrar). Mesmo formato de arquivo, mesmo acabamento.
- `src/app/estilos/auth.css` e `src/app/estilos/sacola.css`: as classes reais
  de campo, botão, fio das etapas e coração, para copiar medidas.
- `src/components/layout/Nav.tsx` e o CSS da nav em `src/app/globals.css`
  (ou o arquivo que ele importa): a nav real, que o esboço reproduz.
- `public/marca/` (logo) e `public/produtos/*.webp` (fotos dos potes).

## Regras do sistema que mais caem

- Títulos em duas vozes: Poppins 300 e, no fim, uma frase curta em Allura
  dentro do `<em>`, em linha própria, em `cobre-texto` (#9A5530) sobre creme.
  Script sempre em minúscula. Nunca título inteiro em script.
- Fio de 1 px (`rgb(43 27 22 / .18)`) só onde segura alguma coisa. Nada de
  divisor solto entre blocos: quem separa é o espaço.
- Cobre raro: script, fio, foco e o coração do logo (cobre #C9784A, 13 px)
  que pousa no fio e aponta o item ou a etapa atual.
- Cantos de 2 a 4 px. Sem sombra, sem cartão flutuante, sem pílula redonda,
  sem ícone colorido, sem caixa em volta de tudo.
- Poppins 300/400/500/600 e Allura, só essas (Google Fonts). Números
  tabulares em preços e datas.
- Botão escuro reto (expresso #2B1B16, texto creme, 50 px, 15 px peso 500).
  Botão de texto (13 a 14 px, `suave` #5E4A40, sublinhado no fio).
- Chão creme #FAF2E9 com a nav creme de 64 px e fio embaixo. Coluna de 1240
  com gutter de 56 px (1128 de conteúdo) no desktop.
- Sem travessão nem meia-risca em nenhum texto.
- Rótulo em caixa alta espaçada (600, 12 px, 0.24em, `cobre-texto`) só nomeia
  uma lista; nunca fica solto acima de um título.

## A nav (igual nos três)

Da esquerda para a direita: botão "Catálogo" com o ícone de três fios, o logo
(use `public/marca/` se houver um arquivo que sirva; senão "AMO" em Poppins
com `translate="no"`), os links da home, e no fim "Minha conta" (link novo,
15 px, com o item marcado como atual: peso 500) e o botão "Sacola" com o
ícone de traço fino. A nav não muda de forma por estar na conta.

## Os dados de exemplo (os mesmos nos três)

- Cliente: Mariana Costa · celular (11) 98765-4321 · mariana@exemplo.com.br ·
  recebe novidades: não.
- Pedido em andamento: **AMO-7K2M9QXR**, estado **A caminho**.
  Etapas e horas (20 de novembro): Feito 14h02 · Pago 14h03 · Em preparo
  14h20 · A caminho 15h10 · Entregue (ainda não). Entrega pelo Uber, chega em
  cerca de 25 minutos; link "Acompanhar no Uber".
  Potes: 2 Prestígio (R$ 18,90 cada, R$ 37,80) · 1 Ninho com frutas vermelhas
  (R$ 21,90) · 1 Mousse de maracujá (R$ 18,90).
  Subtotal, 4 potes: R$ 78,60 · Entrega (Uber): R$ 14,20 · Total: R$ 92,80.
  Pago com Pix. Entregar em: Rua Cuiabá, 412, apto 31 · Alto da Mooca ·
  São Paulo, SP · 03183-002.
- Pedidos anteriores:
  AMO-3F8D2WLA · 8 de novembro · Entregue · 6 potes · R$ 128,40
  AMO-9QTR4ZEN · 25 de outubro · Entregue · 3 potes · R$ 71,10
  AMO-B2XH7MPC · 12 de outubro · Cancelado · 2 potes · R$ 52,00
- Endereços (até 5, um principal): Casa (principal): Rua Cuiabá, 412, apto 31,
  Alto da Mooca, São Paulo, SP, 03183-002 · Trabalho: Rua Tabapuã, 1123,
  sala 52, Itaim Bibi, São Paulo, SP, 04533-014.
- Estados possíveis de um pedido: Aguardando pagamento, Pago, Em preparo,
  A caminho, Entregue, Cancelado. "Cancelar pedido" só existe quando aguarda
  pagamento.
- Fotos: `public/produtos/prestigio.webp`, `ninho-com-frutas-vermelhas.webp`,
  `mousse-de-maracuja.webp`, `pacoca.webp`, `beijinho.webp`, `chocolate.webp`,
  `frutas-amarelas.webp` (miniaturas de 64 por 80, canto de 3 px, fundo linho
  #F6EBDD). Caminho relativo a partir do arquivo: de `.impeccable/mocks/` é
  `../../public/produtos/`; de `.impeccable/mocks/decision/` é
  `../../../public/produtos/`. O mesmo vale para `public/marca/`.

Uma etiqueta discreta "dados de exemplo" (13 px, `suave`) num canto do esboço
basta; não invente preço, prazo ou afirmação além destes.

## As quatro telas (o conteúdo de cada uma)

| Tela | O que mostra |
| --- | --- |
| `/conta` | saudação com o primeiro nome; o pedido em andamento (número, estado, o fio das etapas com o coração, "Acompanhar no Uber", total) ou, sem pedido, o convite ao catálogo; caminhos para Pedidos e para os seus dados; Sair |
| `/conta/pedidos` | lista do mais novo ao mais antigo: número, data, estado, quantos potes, total; o estado vazio tem link para o catálogo |
| `/conta/pedidos/AMO-7K2M9QXR` | estado e as datas de cada passagem; os potes (miniatura, nome, quantos, preço, total); subtotal, entrega e total sobre a linha de soma; endereço da entrega; como foi pago; o link de rastreio |
| `/conta/perfil` | nome e celular; e-mail com a troca (confirma nos dois e-mails); senha com a troca (pede a atual); o aceite de novidades; os endereços (adicionar, alterar, remover, tornar principal); "Excluir conta" discreto no fim |

## Os dois arquivos que cada esboço entrega

1. `.impeccable/mocks/decision/minha-conta-<id>.html`: só a primeira tela de
   `/conta` no desktop, 1440 por 900, altura fixa e `overflow: hidden`, um
   arquivo só, CSS dentro, sem JavaScript, nada carregado de fora além do
   Google Fonts (e as imagens locais), com menos de 200 linhas. É o que a
   página de escolha desenha.
2. `.impeccable/mocks/minha-conta-<id>-telas.html`: as quatro telas completas,
   uma embaixo da outra, cada uma num quadro de 1440 de largura com a nav e o
   rodapé simplificado, com um título pequeno fora do quadro dizendo a rota;
   no fim, a tela `/conta` no celular (390 de largura) ao lado da tela do
   pedido no celular. Sem limite de linhas, mesmo acabamento.

O acabamento é o de um produto pronto: grade alinhada, espaçamento de um
ritmo só, escala de tipo real, hierarquia clara. Abra o arquivo no navegador
headless e confira o que desenhou antes de entregar (veja abaixo).

## Conferir pelo navegador

Nesta máquina as capturas são pelo Edge headless por CDP, com o perfil
temporário no disco D e apagado depois (o disco C está quase cheio). Um jeito
simples: `msedge --headless=new --disable-gpu --user-data-dir=D:/tmp-edge-<id>
--screenshot=D:/tmp-edge-<id>/shot.png --window-size=1440,900 file:///D:/amo/...`,
abrir o PNG com a ferramenta de leitura e apagar a pasta `D:/tmp-edge-<id>`
no fim. O executável fica em `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`.
