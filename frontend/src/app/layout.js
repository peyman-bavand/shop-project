import { Geist, Geist_Mono } from "next/font/google";
import ShopProvider from "@/components/ShopProvider";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "کتاب‌فروشی",
  description: "فروشگاه آنلاین کتاب",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ShopProvider>
          <SiteHeader />
          <div className="flex-1">{children}</div>
        </ShopProvider>
      </body>
    </html>
  );
}
