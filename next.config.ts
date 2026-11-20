import type { NextConfig } from "next";
import { FONTE_SEM_NONCE } from "./src/lib/seguranca/rotas";

/**
 * Cabecalhos de seguranca em toda resposta (spec 11). A CSP aqui e a sem
 * nonce, das paginas estaticas: so o proprio site, nenhum dominio de fora.
 * 'unsafe-eval' so em desenvolvimento, porque o React usa eval para mostrar
 * a pilha dos erros do servidor. Sem upgrade-insecure-requests: o HSTS ja
 * cobre, e ela atrapalha o next start local. O HSTS vai sem
 * includeSubDomains e sem preload ate o dominio ser escolhido (spec 18).
 *
 * As paginas com dado pessoal (src/lib/seguranca/rotas.ts) ganham a CSP com
 * nonce no proxy.ts; a regra da CSP daqui fica fora delas, para a resposta nao
 * sair com duas politicas. Os outros cabecalhos valem em toda rota.
 */
const desenvolvimento = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${desenvolvimento ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: FONTE_SEM_NONCE,
        headers: [{ key: "Content-Security-Policy", value: csp }],
      },
    ];
  },
};

export default nextConfig;
