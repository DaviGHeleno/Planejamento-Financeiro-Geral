import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navegacao from "../components/Navegacao";
import { ValoresProvider } from "../components/ValoresContext";
import { DadosProvider } from "../components/DadosContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Planejamento Financeiro",
  description: "Controle de gastos e investimentos, com os dados na sua própria planilha",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-900">
        {/* DadosProvider por fora: a navegação precisa saber se há planilha conectada */}
        <DadosProvider>
          <ValoresProvider>
            <Navegacao />

            {/* Espaço para a lateral (desktop) e para a barra inferior (celular) */}
            <main className="flex-1 md:pl-60 pb-24 md:pb-0">{children}</main>
          </ValoresProvider>
        </DadosProvider>
      </body>
    </html>
  );
}