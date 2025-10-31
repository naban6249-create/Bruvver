'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MenuCard } from '@/components/menu-card';
import { Loader2 } from 'lucide-react';
import type { MenuItem } from '@/lib/types';
import { useEffect, useState } from 'react';

// Public site should showcase the Coimbatore branch menu
const COIMBATORE_BRANCH_ID = (process.env.NEXT_PUBLIC_COIMBATORE_BRANCH_ID || '1');

export default function Home() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching menu items for branch:', COIMBATORE_BRANCH_ID);
        
        // Fetch directly from backend API
        const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bruvver-backend-1s2p.onrender.com';
        const res = await fetch(
          `${BACKEND_URL}/api/v1/public/menu/${encodeURIComponent(COIMBATORE_BRANCH_ID)}`,
          { 
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json',
              // Use service API key for public menu access
              'X-API-Key': process.env.NEXT_PUBLIC_SERVICE_API_KEY || '',
            }
          }
        );
        
        if (!res.ok) {
          const errorData = await res.text();
          throw new Error(`Failed to fetch menu (${res.status}): ${errorData}`);
        }
        
        const items: MenuItem[] = await res.json();
        console.log('Received menu items:', items.length);
        
        // Filter to show only available items on the public page
        const availableItems = Array.isArray(items) 
          ? items.filter((item: MenuItem) => item.is_available)
          : [];
          
        setMenuItems(availableItems);
      } catch (err) {
        console.error('Failed to fetch menu items:', err);
        setError(err instanceof Error ? err.message : 'Failed to load menu items');
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Re-trigger the useEffect by reloading
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-50">
        <nav className="flex flex-col gap-6 text-lg font-medium md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6 w-full">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold md:text-base font-headline"
          >
            <span className="sr-only">Bruvvver</span>
            <img
              src="/images/bruvvers_logo_main.png"
              alt="Bruvvver Coffee Logo"
              className="h-8 w-auto"
            />
          </Link>
        </nav>
        <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <Button
            variant="ghost"
            className="px-5 py-2.5 text-sm md:px-6 md:text-base text-foreground hover:bg-primary hover:text-primary-foreground"
            onClick={() => window.open('https://www.bruvvers.in/', '_blank')}
          >
            About Us
          </Button>
          <Button asChild className="px-5 py-2.5 text-sm md:px-6 md:text-base">
            <Link href="/admin/login">Login</Link>
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
                <p className="text-destructive mb-4">
                  {error.includes('Failed to fetch menu') 
                    ? 'Unable to load menu items. Please check your connection and try again.'
                    : error
                  }
                </p>
                <Button 
                  onClick={handleRetry} 
                  variant="outline"
                  className="mr-2"
                >
                  Try Again
                </Button>
                <Button 
                  asChild 
                  variant="ghost"
                >
                  <Link href="/admin/login">Admin Login</Link>
                </Button>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No menu items available at the moment.</p>
                <p className="text-sm text-muted-foreground">
                  Our menu is being updated. Please check back soon or contact us directly.
                </p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold font-headline mb-2">
                    Featured Menu Items
                  </h2>
                  <p className="text-muted-foreground">
                    Discover our carefully crafted coffee beverages
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {menuItems.map((item) => (
                    <MenuCard key={item.id} item={item} />
                  ))}
                </div>
                <div className="text-center mt-8">
                  <p className="text-sm text-muted-foreground">
                    Showing {menuItems.length} available item{menuItems.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-foreground/60">&copy; 2025 Bruvver Coffee. All rights reserved.</p>
      </footer>
    </div>
  );
}
