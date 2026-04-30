import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aviões",
    short_name: "Aviões",
    description: "Conta os aviões que a gente vê junto.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f1e7",
    theme_color: "#f6f1e7",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
