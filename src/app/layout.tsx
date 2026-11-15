import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Koperasi PDF extraction trial", description: "Inspect financial document extraction." };

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
