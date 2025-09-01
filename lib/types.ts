export interface Ingredient {
  name: string;
  quantity: number;
  unit: 'g' | 'ml' | 'shots' | 'pumps';
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  ingredients: Ingredient[];
}

export interface DailySale {
  itemId: string;
  quantity: number;
}
