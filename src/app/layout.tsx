import type { Metadata } from "next";
import { Prompt, Sarabun } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { SetupBanner } from "@/components/setup-banner";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const sarabun = Sarabun({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
  display: "swap",
});

const prompt = Prompt({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบการศึกษาพิเศษ | โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)",
  description:
    "ระบบจัดการสื่อการสอน ติดตามนักเรียนการศึกษาพิเศษ และเผยแพร่ผลงานสาธารณะ โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร) สพป.จันทบุรี เขต 1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${sarabun.variable} ${prompt.variable}`}>
      <body className="font-sans min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white">
        <AuthProvider>
          <SetupBanner />
          <Navbar />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
