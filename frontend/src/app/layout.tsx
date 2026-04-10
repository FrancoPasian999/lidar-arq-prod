import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "sonner";
import { ProjectProvider } from "@/context/ProjectContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "LidarArch Workflow Studio | Precision Architectural Surveying",
  description: "Transform LiDAR point clouds into architectural plans with precision and speed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-black text-white h-screen overflow-hidden`}>
        <ProjectProvider>
          <div className="flex h-full w-full">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 bg-zinc-900">
              {children}
            </main>
          </div>
          <Toaster theme="dark" position="bottom-right" richColors />
        </ProjectProvider>
      </body>
    </html>
  );
}
