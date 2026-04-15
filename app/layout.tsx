import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reely | Content creation tool for video makers",
  description: "Content creation tool for video makers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}