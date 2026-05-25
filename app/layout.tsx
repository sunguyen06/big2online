import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Big 2 Royale",
  description: "A polished single-player Big 2 card table against three CPU opponents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
