import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import TzCookie from "@/components/TzCookie";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = { themeColor: "#059669" };

export const metadata: Metadata = {
  title: { default: "Votein", template: "%s · Votein" },
  description: "Workout tracker, split designer and program generator",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pb-20 md:pb-0">
        <Nav />
        <TzCookie />
        {children}
      </body>
    </html>
  );
}
