import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://laundry-kinclong.vercel.app'),
  title: 'Laundry Kinclong - Sistem Kasir & Manajemen',
  description: 'Aplikasi manajemen laundry digital untuk kasir dan pemilik',
  openGraph: {
    title: 'Laundry Kinclong - Sistem Kasir & Manajemen',
    description: 'Aplikasi manajemen laundry digital untuk kasir dan pemilik',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Laundry Kinclong',
      },
    ],
  },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
