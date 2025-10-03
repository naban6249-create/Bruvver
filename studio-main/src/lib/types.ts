// lib/types.ts - Improved version with fixes

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

// ✅ FIXED: MenuItem with proper types
export interface MenuItem {
  id: string | number;     // ✅ Accept both (backend sends number, we convert to string)
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;       // Frontend camelCase
  image_url?: string;      // Backend snake_case (for compatibility)
  category: string;
  is_available: boolean;
  branchId: number;        // ✅ REQUIRED - every menu item belongs to a branch
  branch_id?: number;      // Backend snake_case (for compatibility)
  ingredients: Ingredient[];
  created_at?: string;
  updated_at?: string;
}

// ✅ NEW: Type for creating/updating menu items
export interface MenuItemFormData {
  id?: string | number;
  name: string;
  price: number;
  description?: string;
  category: string;
  is_available: boolean;
  branch_id: number;       // Always required for create/update
  image_url?: string;
  image?: File;            // For file uploads
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
  menu_item_id: string | number;  // ✅ Accept both types
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

// ✅ NEW: Helper type guards
export const isMenuItem = (item: any): item is MenuItem => {
  return item && 
         (typeof item.id === 'string' || typeof item.id === 'number') &&
         typeof item.name === 'string' &&
         typeof item.price === 'number';
};

// ✅ NEW: Type conversion helpers
export const normalizeMenuItem = (raw: any): MenuItem => {
  return {
    id: String(raw.id),                                    // Convert to string
    name: raw.name,
    price: Number(raw.price ?? 0),
    description: raw.description ?? '',
    imageUrl: raw.image_url ?? raw.imageUrl ?? '',
    category: raw.category ?? '',
    is_available: Boolean(raw.is_available ?? raw.isAvailable ?? true),
    branchId: Number(raw.branch_id ?? raw.branchId),      // ✅ Always require branch_id
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
};
