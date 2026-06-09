import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Omnic3ntro | Messaging Platform",
  description: "Plataforma de mensajería omnicanal - C3ntro Telecom",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="h-full bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
