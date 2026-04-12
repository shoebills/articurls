import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

/** Inter — same family shadcn/Tailwind docs use most often for UI */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** JetBrains Mono — common pairing for code / editor */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f5f8",
};

export const metadata: Metadata = {
  title: {
    default: "Articurls — Write in public",
    template: "%s · Articurls",
  },
  description: "A modern blogging platform with analytics, subscribers, and scheduling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} min-h-dvh antialiased`}
      data-theme="light"
    >
      <body className="flex min-h-dvh flex-col overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
