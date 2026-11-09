import type { NextConfig } from "next";

const production = process.env.NODE_ENV === "production";

// Regulile de securitate pe care le trimitem browserului cu fiecare pagină.
// Content-Security-Policy: de unde are voie pagina să încarce scripturi, stiluri, poze și conexiuni.
// Doar de pe site-ul nostru; Next.js are nevoie de scripturile mici scrise direct în pagină
// ('unsafe-inline') și, cât lucrăm local, de eval. Când adăugăm plata cu cardul sau statistici,
// adăugăm aici adresele lor.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${production ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'", // nimeni nu ne poate pune site-ul într-un iframe (clickjacking)
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" }, // la fel ca frame-ancestors, pentru browsere vechi
  { key: "X-Content-Type-Options", value: "nosniff" }, // un fișier e exact ce spune serverul că e
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, // alte site-uri nu văd adresa completă a paginii
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }, // nu folosim camera, microfonul, locația
  // Doar pe server: browserul ține minte un an că site-ul merge numai prin HTTPS
  ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
];

// Facturile în PDF (/factura/...) și certificatul bio (/bio/...): browserul arată PDF-urile cu
// cititorul lui, care pentru el e un „plugin”. Regula object-src 'none' de mai sus l-ar putea bloca,
// așa că pentru aceste adrese trimitem o regulă potrivită pentru un fișier: totul doar de pe site-ul nostru.
const pdfHeaders = [
  { key: "Content-Security-Policy", value: "default-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'self'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig: NextConfig = {
  /* config options here */
  poweredByHeader: false, // nu mai spunem tuturor că rulăm Next.js
  async headers() {
    // Când două reguli se potrivesc pe aceeași adresă, câștigă ultima: de aceea PDF-urile sunt la final
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/factura/:path*", headers: pdfHeaders },
      { source: "/bio/:path*", headers: pdfHeaders },
    ];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
