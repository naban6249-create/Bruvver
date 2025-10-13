// app/layout.tsx
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { alegreya, belleza } from "@/lib/fonts";
import "./globals.css";

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn("font-body antialiased", alegreya.variable, belleza.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
