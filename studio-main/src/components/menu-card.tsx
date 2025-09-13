  import Image from 'next/image';
  import type { MenuItem } from '@/lib/types';
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
  import { Badge } from '@/components/ui/badge';

  interface MenuCardProps {
    item: MenuItem;
  }

  export function MenuCard({ item }: MenuCardProps) {
    const imageUrl = item.imageUrl || (item.image_path ? `http://127.0.0.1:8000${item.image_path}`: '/images/Screenshot-2025-09-02-072706.png');
    return (
      <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <CardHeader className="p-0">
          <div className="aspect-video relative">
            <Image
              src={imageUrl}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized
            />
          </div>
          <div className="p-6 pb-2">
              <CardTitle className="font-headline text-2xl">{item.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-grow">
          <CardDescription>
            <div className="flex flex-wrap gap-2">
              {item.ingredients && item.ingredients.map((ingredient) => (
                  <Badge variant="outline" key={ingredient.name}>{ingredient.name}</Badge>
              ))}
            </div>
          </CardDescription>
        </CardContent>
        <CardFooter>
        </CardFooter>
      </Card>
    );
  }