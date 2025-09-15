'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MenuCard } from '@/components/menu-card';
import { Coffee, Loader2 } from 'lucide-react';
import type { MenuItem } from '@/lib/types';
import { getMenuItems } from '@/lib/menu-service';
import { useEffect, useState } from 'react';

const IMAGE_SERVER_BASE_URL = process.env.NEXT_PUBLIC_API_SERVER_URL || 'http://localhost:8000';

export default function Home() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        const items = await getMenuItems();
        
        // Apply the same image URL transformation as in menu-management.tsx
        const transformedItems = items.map((item: any) => {
          let finalImageUrl;
          if (item.image_url) {
            if (item.image_url.startsWith('http')) {
              finalImageUrl = item.image_url;
            } else {
              finalImageUrl = `${IMAGE_SERVER_BASE_URL}${item.image_url}`;
            }
          }
          return {
            ...item,
            imageUrl: finalImageUrl,
          };
        });
        
        // Filter to show only available items on the public page
        const availableItems = transformedItems.filter((item: MenuItem) => item.is_available);
        setMenuItems(availableItems);
      } catch (err) {
        console.error('Failed to fetch menu items:', err);
        setError('Failed to load menu items');
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-50">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6 w-full">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold md:text-base font-headline"
          >
            <Coffee className="h-6 w-6" />
            <span className="sr-only">Coffee Command Center</span>
            Coffee Command Center
          </Link>
        </nav>
        <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <Button asChild>
            <Link href="/admin/login">Admin Login</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl font-headline">
                  Our Handcrafted Coffee Selection
                </h1>
                <p className="mx-auto max-w-[700px] text-foreground/80 md:text-xl">
                  Taste the quality and craftsmanship in every cup. Freshly brewed, just for you.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 bg-muted/40">
          <div className="container px-4 md:px-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading our delicious menu...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">{error}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                >
                  Try Again
                </Button>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No menu items available at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {menuItems.map((item) => (
                  <MenuCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-foreground/60">&copy; 2024 Coffee Command Center. All rights reserved.</p>
      </footer>
    </div>
  );
}