import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Power Platform Tool Box",
  description: "Download and use Power Platform Tool Box to enhance your Power Platform development workflow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
