import type { MenuItem, DailySale, IngredientMetadata } from './types';

export const INGREDIENTS_DATA: IngredientMetadata[] = [
  { name: 'Water', imageUrl: 'https://picsum.photos/64/64', unit: 'ml' },
  { name: 'Milk', imageUrl: 'https://picsum.photos/64/64', unit: 'ml' },
  { name: 'Coffee Beans', imageUrl: 'https://picsum.photos/64/64', unit: 'g' },
  { name: 'Caramel Syrup', imageUrl: 'https://picsum.photos/64/64', unit: 'pumps' },
  { name: 'Vanilla Syrup', imageUrl: 'https://picsum.photos/64/64', unit: 'pumps' },
  { name: 'Ice', imageUrl: 'https://picsum.photos/64/64', unit: 'g' },
  { name: 'Chocolate Syrup', imageUrl: 'https://picsum.photos/64/64', unit: 'pumps' },
  { name: 'Whipped Cream', imageUrl: 'https://picsum.photos/64/64', unit: 'g' },
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: '1',
    name: 'Classic Espresso',
    imageUrl: 'https://picsum.photos/600/400',
    price: 3.50,
    ingredients: [
      { name: 'Coffee Beans', quantity: 18, unit: 'g' },
      { name: 'Water', quantity: 60, unit: 'ml' },
    ],
  },
  {
    id: '2',
    name: 'Caramel Macchiato',
    imageUrl: 'https://picsum.photos/600/400',
    price: 4.75,
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
    ingredients: [
      { name: 'Coffee Beans', quantity: 18, unit: 'g' },
      { name: 'Milk', quantity: 120, unit: 'ml' },
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
];
