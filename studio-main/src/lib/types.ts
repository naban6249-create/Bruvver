// types.ts - Updated with RBAC support

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
  image_path?: string;
  imageUrl?: string;
  ingredients: Ingredient[];
  created_at?: string;
  updated_at?: string;
  branch_id?: number;
}

export interface MenuItemCreate {
  name: string;
  price: number;
  description: string;
  category: string;
  is_available: boolean;
  ingredients: Ingredient[];
  branch_id?: number;
}

export interface DailySale {
  itemId: string;
  quantity: number;
}

export interface Branch {
  id: number;
  name: string;
  location?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBranchPermission {
  id: number;
  user_id: number;
  branch_id: number;
  permission_level: 'view_only' | 'full_access';
  created_at: string;
  updated_at: string;
  branch?: Branch;
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: 'admin' | 'worker';
  branch_permissions: UserBranchPermission[];
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  last_login?: string | null;
}

export interface DailyExpense {
  id: number;
  branch_id: number;
  category: string;
  item_name: string;
  description?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unit_cost: number;
  total_amount: number;
  expense_date: string;
  receipt_number?: string | null;
  vendor?: string | null;
  created_by: number;
  created_at: string;
}

export interface DailyReport {
  id: number;
  branch_id: number;
  report_date: string;
  total_sales: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  top_selling_item?: string | null;
  created_at: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UserPermissionSummary {
  user_id: number;
  username: string;
  full_name: string;
  branches: UserBranchPermission[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}