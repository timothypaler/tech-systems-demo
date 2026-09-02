import type { Metadata } from "next";
import "./globals.css";
import "./product-visual.css";
import "./readability.css";
import "./motion.css";
import { DemoBanner } from "@/components/demo-banner";
import { RouteLoader } from "@/components/route-loader";
import { ExperienceMotion } from "@/components/experience-motion";

export const metadata: Metadata = {
  title: "Tech Systems Demo | Computers, Security & Networks",
  description: "A demonstration storefront for compatible PC builds, technology products, security systems and network solutions.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ExperienceMotion /><RouteLoader /><DemoBanner/>{children}</body></html>;
}
