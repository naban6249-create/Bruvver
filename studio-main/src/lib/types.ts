// lib/types.ts

export interface Branch {
  id: number;
  name: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  openingBalance?: number;
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

export interface UserBranchPermissionCreate {
  user_id: number;
  branch_id: number;
  permission_level: 'view_only' | 'full_access';
}

export interface UserPermissionSummary {
  user_id: number;
  username: string;
  full_name: string;
  branches: UserBranchPermission[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'worker';
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  last_login?: string;
  branch_permissions: UserBranchPermission[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Ingredient {
  id?: number;
  name: string;
  quantity: number;
  unit: string;
  image_url?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  category: string;
  is_available: boolean;
  branchId?: number;
  ingredients: Ingredient[];
  created_at?: string;
  updated_at?: string;
}

export interface DailySale {
  id: number;
  itemId: string;
  branchId: number;
  quantity: number;
  revenue: number;
  saleDate: string;
}

export interface DailyExpense {
  id: number;
  branch_id: number;
  category: string;
  item_name: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unit_cost: number;
  total_amount: number;
  expense_date: string;
  receipt_number?: string;
  vendor?: string;
  created_by: number;
  created_at: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: number;
  branch_id: number;
  customer_name?: string;
  customer_email?: string;
  total_amount: number;
  status: string;
  order_type: string;
  created_at: string;
  completed_at?: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions?: string;
  menu_item?: MenuItem;
}

export interface Inventory {
  id: number;
  item_name: string;
  current_stock: number;
  unit: string;
  minimum_threshold: number;
  cost_per_unit?: number;
  supplier?: string;
  branch_id: number;
  last_restocked?: string;
  created_at: string;
  updated_at: string;
}