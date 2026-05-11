import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}