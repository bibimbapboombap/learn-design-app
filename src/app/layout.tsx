import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Design Learning",
  description: "Tasks and resources for designers.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
