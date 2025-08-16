import type { Metadata } from "next";
import { Montserrat, Share_Tech } from "next/font/google";
import "./globals.css";
import AppProvider from "@/components/providers/app-provider";

const shareTech = Share_Tech({
  variable: "--font-share-tech",
  subsets: ["latin"],
  weight: ["400"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Question Images",
  description: "AI Assistant for question answering with images",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${shareTech.variable} ${montserrat.variable}`}
      >
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
