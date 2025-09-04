import type { Metadata } from 'next';
import { Alegreya, Belleza } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

const alegreya = Alegreya({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-alegreya',
});

const belleza = Belleza({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-belleza',
  weight: '400',
});

export const metadata: Metadata = {
  title: 'Coffee Command Center',
  description: 'Manage your coffee shop with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn('font-body antialiased', alegreya.variable, belleza.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
