// SO DE ENSAIO. Carrega o Mercado Pago falso e a Uber falsa de uma vez:
//
//   NODE_OPTIONS=--import=./scripts/ensaio/as-duas-falsas.mjs npm run dev
//
// O Next mantem so um --import do NODE_OPTIONS no processo que roda o site;
// com dois, o do servidor ficava so com a Uber falsa e o Pix ia ao Mercado Pago
// de verdade. Um arquivo que importa os dois resolve. Nenhum codigo do site o
// importa.

import './mercadopago-falso.mjs'
import './uber-falsa.mjs'
