import type { Metadata } from "next";
import {
  Source_Sans_3,
  JetBrains_Mono,
} from "next/font/google";

import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Chess Solver",
  description: "Python FastAPI chess backend with Next.js frontend",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`
          ${sourceSans.className}
          ${jetbrainsMono.variable}
        `}
      >
        {children}
      </body>
    </html>
  );
}