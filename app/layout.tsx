import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Noise } from "./components/noise";
import { PwaRegister } from "./components/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  title: "Aviões",
  description: "O diário de aviões da gente.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Aviões",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#15191b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const store = await cookies();
  const theme = store.get("av_theme")?.value ?? "system";

  return (
    <html
      lang="pt-BR"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-hidden bg-bg text-ink">
        <Noise />
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col overflow-hidden border-x border-line">
          {children}
        </div>
        <PwaRegister />
      </body>
    </html>
  );
}
