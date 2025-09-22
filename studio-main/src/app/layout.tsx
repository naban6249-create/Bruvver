import { cn } from "@/lib/utils"; // ✅ FIX: Import the cn utility
import { AuthProvider } from "@/components/admin/contexts/auth-provider";
import { Toaster } from "@/components/ui/toaster";
import { alegreya, belleza } from "@/lib/fonts";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn('font-body antialiased', alegreya.variable, belleza.variable)}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}