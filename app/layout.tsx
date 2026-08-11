import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart СӨХ удирдлага",
  description: "Монголын орон сууцны удирдлагын систем",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="mn"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full h-full flex flex-col overflow-x-hidden font-sans">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
