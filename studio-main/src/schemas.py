# schemas.py
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# Ingredient Schemas
class IngredientBase(BaseModel):
    name: str
    quantity: float
    unit: str

class IngredientCreate(IngredientBase):
    pass

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None

class IngredientResponse(IngredientBase):
    id: int
    menu_item_id: str
    
    class Config:
        from_attributes = True

# Menu Item Schemas
class MenuItemBase(BaseModel):
    name: str
    price: float
    description: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    is_available: Optional[bool] = True

class MenuItemCreate(MenuItemBase):
    ingredients: List[IngredientCreate] = []

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    is_available: Optional[bool] = None
    ingredients: Optional[List[IngredientCreate]] = None

class MenuItemResponse(MenuItemBase):
    id: str
    ingredients: List[IngredientResponse] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Order Schemas
class OrderItemCreate(BaseModel):
    menu_item_id: str
    quantity: int
    special_instructions: Optional[str] = None

class OrderItemResponse(BaseModel):
    id: int
    menu_item_id: str
    quantity: int
    unit_price: float
    total_price: float
    special_instructions: Optional[str] = None
    menu_item: Optional[MenuItemResponse] = None
    
    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    order_type: str = "dine_in"  # dine_in, takeaway, delivery
    items: List[OrderItemCreate]

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None

class OrderResponse(BaseModel):
    id: int
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    total_amount: float
    status: str
    order_type: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    items: List[OrderItemResponse] = []
    
    class Config:
        from_attributes = True

# Sales Schemas
class DailySaleCreate(BaseModel):
    menu_item_id: str
    quantity: int

class DailySaleResponse(BaseModel):
    id: int
    menu_item_id: str
    quantity: int
    revenue: float
    sale_date: datetime
    menu_item: Optional[MenuItemResponse] = None
    
    class Config:
        from_attributes = True

class SalesSummary(BaseModel):
    date: str
    total_items_sold: int
    total_revenue: float
    sales_by_item: List[dict]

# Admin Schemas
class AdminBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None

class AdminCreate(AdminBase):
    password: str

class AdminUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminResponse(AdminBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Inventory Schemas
class InventoryBase(BaseModel):
    item_name: str
    current_stock: float
    unit: str
    minimum_threshold: Optional[float] = 0
    cost_per_unit: Optional[float] = None
    supplier: Optional[str] = None

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    item_name: Optional[str] = None
    current_stock: Optional[float] = None
    unit: Optional[str] = None
    minimum_threshold: Optional[float] = None
    cost_per_unit: Optional[float] = None
    supplier: Optional[str] = None

class InventoryResponse(InventoryBase):
    id: int
    last_restocked: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class StockMovementCreate(BaseModel):
    inventory_id: int
    movement_type: str  # restock, usage, waste, adjustment
    quantity: float
    unit: str
    reason: Optional[str] = None

class StockMovementResponse(BaseModel):
    id: int
    inventory_id: int
    movement_type: str
    quantity: float
    unit: str
    reason: Optional[str] = None
    created_at: datetime
    created_by: Optional[int] = None
    
    class Config:
        from_attributes = True

# Report Schemas
class DailyReportResponse(BaseModel):
    id: int
    report_date: datetime
    total_sales: int
    total_revenue: float
    top_selling_item: Optional[str] = None
    export_status: str
    exported_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Dashboard Summary Schema
class DashboardSummary(BaseModel):
    today_sales: int
    today_revenue: float
    pending_orders: int
    low_stock_items: int
    top_selling_items: List[dict]
    recent_orders: List[OrderResponse]