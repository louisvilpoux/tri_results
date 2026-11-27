import type { NextConfig } from "next";

type Redirect = Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>[number];

/**
 * www.<domaine> → <domaine> (308, même chemin et mêmes paramètres) : une seule adresse pour les
 * visiteurs, les liens partagés et Google. Le domaine vient de SITE_URL (lue au build) ; sans
 * SITE_URL, ou si elle est elle-même en www, aucune redirection.
 */
function wwwRedirects(): Redirect[] {
  const siteUrl = process.env.SITE_URL?.replace(/\/+$/, "");
  if (!siteUrl) return [];
  const { hostname } = new URL(siteUrl);
  if (hostname.startsWith("www.")) return [];
  return [
    {
      source: "/:path*",
      has: [{ type: "host", value: `www.${hostname}` }],
      destination: `${siteUrl}/:path*`,
      permanent: true,
    },
  ];
}

const nextConfig: NextConfig = {
  // Serveur Node autonome pour l'image Docker (Dockerfile, déploiement Coolify).
  output: "standalone",
  async redirects() {
    return wwwRedirects();
  },
  /* config options here */
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
