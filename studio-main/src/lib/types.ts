// Updated types.ts
export interface Ingredient {
  name: string;
  quantity: number;
  unit: 'g' | 'ml' | 'shots' | 'pumps';
}

export interface IngredientMetadata {
  id?: string;
  name: string;
  unit: 'g' | 'ml' | 'shots' | 'pumps';
  imageUrl?: string;
  description?: string;
  category?: string;
  supplier?: string;
  costPerUnit?: number;
  minimumThreshold?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  is_available: boolean;
  image_path?: string;   // from backend (DB column)
  imageUrl?: string;     // frontend-friendly full URL
  ingredients: Ingredient[];
  created_at?: string;
  updated_at?: string;
}

export interface MenuItemCreate {
  name: string;
  price: number;
  description: string;
  category: string;
  is_available: boolean;
  ingredients: Ingredient[];
}

export interface DailySale {
  itemId: string;
  quantity: number;
}