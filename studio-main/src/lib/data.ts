import type { MenuItem, DailySale, IngredientMetadata } from './types';

export const INGREDIENTS_DATA: IngredientMetadata[] = [
  { name: 'Water', imageUrl: '/images/Screenshot-2025-09-02-072706.png', unit: 'ml' },
  { name: 'Milk', imageUrl: '/images/Screenshot-2025-09-02-072706.png', unit: 'ml' },
  { name: 'Coffee Beans', imageUrl: '/images/Screenshot-2025-09-02-072706.png', unit: 'g' },
  { name: 'Caramel Syrup', imageUrl: '/images/Screenshot-2025-09-02-072706.png', unit: 'pumps' },
  { name: 'Vanilla Syrup', imageUrl: '/images/Screenshot-2025-09-02-072706.png', unit: 'pumps' },
  { name: 'Ice', imageUrl: '/images/Screenshot-2025-09-02-072706.png', unit: 'g' },
  { name: 'Chocolate Syrup', imageUrl: '/images/Screenshot-2025-09-02-072706.png', unit: 'pumps' },
  { name: 'Whipped Cream', imageUrl: '/images/Screenshot-2025-09-02-072706.png', unit: 'g' },
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: '1',
    name: 'Classic Espresso',
    imageUrl: '/images/Screenshot-2025-09-02-072706.png',
    price: 3.50,
    description: 'A rich and aromatic shot of concentrated coffee.',
    category: 'hot',
    is_available: true,
    ingredients: [
      { name: 'Coffee Beans', quantity: 18, unit: 'g' },
      { name: 'Water', quantity: 60, unit: 'ml' },
    ],
  },
  {
    id: '2',
    name: 'Caramel Macchiato',
    imageUrl: '/images/Screenshot-2025-09-02-072706.png',
    price: 4.75,
    description: 'Espresso with steamed milk, vanilla, and a caramel drizzle.',
    category: 'hot',
    is_available: true,
    ingredients: [
      { name: 'Coffee Beans', quantity: 18, unit: 'g' },
      { name: 'Milk', quantity: 150, unit: 'ml' },
      { name: 'Caramel Syrup', quantity: 2, unit: 'pumps' },
      { name: 'Vanilla Syrup', quantity: 1, unit: 'pumps' },
    ],
  },
  {
    id: '3',
    name: 'Iced Latte',
    imageUrl: 'https://picsum.photos/600/400',
    price: 4.25,
    description: 'Chilled espresso with milk, served over ice.',
    category: 'iced',
    is_available: true,
    ingredients: [
      { name: 'Coffee Beans', quantity: 18, unit: 'g' },
      { name: 'Milk', quantity: 200, unit: 'ml' },
      { name: 'Ice', quantity: 100, unit: 'g' },
    ],
  },
  {
    id: '4',
    name: 'Mocha Frappuccino',
    imageUrl: 'https://picsum.photos/600/400',
    price: 5.25,
    description: 'Blended coffee with chocolate, milk, and ice, topped with cream.',
    category: 'specialty',
    is_available: true,
    ingredients: [
      { name: 'Coffee Beans', quantity: 18, unit: 'g' },
      { name: 'Milk', quantity: 120, unit: 'ml' },
      { name: 'Chocolate Syrup', quantity: 2, unit: 'pumps' },
      { name: 'Ice', quantity: 150, unit: 'g' },
      { name: 'Whipped Cream', quantity: 30, unit: 'g' },
    ],
  },
  {
    id: '5',
    name: 'Americano',
    imageUrl: 'https://picsum.photos/600/400',
    price: 3.25,
    description: 'A shot of espresso diluted with hot water.',
    category: 'hot',
    is_available: true,
    ingredients: [
      { name: 'Coffee Beans', quantity: 18, unit: 'g' },
      { name: 'Water', quantity: 180, unit: 'ml' },
    ],
  },
  {
    id: '6',
    name: 'Cappuccino',
    imageUrl: 'https://picsum.photos/600/400',
    price: 4.00,
    description: 'Espresso with a perfect balance of steamed milk and foam.',
    category: 'hot',
    is_available: true,
    ingredients: [
      { name: 'Coffee Beans', quantity: 18, unit: 'g' },
      { name: 'Milk', quantity: 120, unit: 'ml' },
    ],
  },
  {
    id: '7',
    name: 'Filter Coffee',
    imageUrl: '/images/filter-coffee.jpg',
    price: 3.00,
    description: 'A traditional South Indian style coffee, brewed to perfection.',
    category: 'hot',
    is_available: true,
    ingredients: [
      { name: 'Coffee Beans', quantity: 20, unit: 'g' },
      { name: 'Milk', quantity: 100, unit: 'ml' },
      { name: 'Water', quantity: 80, unit: 'ml' },
    ],
  },
];

export const DAILY_SALES: DailySale[] = [
  { itemId: '1', quantity: 25 },
  { itemId: '2', quantity: 18 },
  { itemId: '3', quantity: 22 },
  { itemId: '4', quantity: 15 },
  { itemId: '5', quantity: 30 },
  { itemId: '6', quantity: 12 },
  { itemId: '7', quantity: 28 },
];