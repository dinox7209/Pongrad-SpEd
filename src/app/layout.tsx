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
  title: "ห้องเรียนเสริมวิชาการสู่การเรียนรวม (Resource Room) | โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)",
  description:
    "ห้องเรียนเสริมวิชาการสู่การเรียนรวม (Resource Room) ความร่วมมือระหว่างโรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร) สพป.จันทบุรี เขต 1 และศูนย์การศึกษาพิเศษ ประจำจังหวัดจันทบุรี",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${sarabun.variable} ${prompt.variable}`}>
      <body className="font-sans min-h-screen flex flex-col liquid-canvas text-navy-950 selection:bg-fuchsia-500 selection:text-white relative overflow-x-hidden">
        {/* Ambient Floating Purple-Pink Liquid Orbs */}
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 overflow-hidden pointer-events-none no-print"
        >
          <div className="liquid-orb-float absolute -top-24 -left-20 w-96 h-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div
            className="liquid-orb-float absolute top-1/3 -right-24 w-[28rem] h-[28rem] rounded-full bg-purple-400/20 blur-3xl"
            style={{ animationDelay: "-4s" }}
          />
          <div
            className="liquid-orb-float absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-pink-300/25 blur-3xl"
            style={{ animationDelay: "-7s" }}
          />
        </div>

        <AuthProvider>
          <SetupBanner />
          <Navbar />
          <main className="flex-1 w-full relative">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
