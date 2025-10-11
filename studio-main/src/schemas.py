from pydantic import BaseModel, EmailStr, validator
from typing import List, Optional
from datetime import datetime
from enum import Enum

# -----------------------
# ENUMS
# -----------------------
class UserRole(str, Enum):
    ADMIN = "admin"
    WORKER = "worker"

class PermissionLevel(str, Enum):
    VIEW_ONLY = "view_only"
    FULL_ACCESS = "full_access"

# -----------------------
# BRANCH PERMISSION SCHEMAS
# -----------------------
class UserBranchPermissionBase(BaseModel):
    user_id: int
    branch_id: int
    permission_level: PermissionLevel

class UserBranchPermissionCreate(UserBranchPermissionBase):
    pass

class UserBranchPermissionUpdate(BaseModel):
    permission_level: Optional[PermissionLevel] = None

class UserBranchPermissionResponse(UserBranchPermissionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    branch: Optional['BranchResponse'] = None

    class Config:
        from_attributes = True

# -----------------------
# BRANCH SCHEMAS
# -----------------------
class BranchBase(BaseModel):
    name: str
    location: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None

class BranchResponse(BranchBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# -----------------------
# USER SCHEMAS (Updated)
# -----------------------
class AdminBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.WORKER

class AdminCreate(AdminBase):
    password: str
    branch_permissions: Optional[List[UserBranchPermissionCreate]] = []

class AdminUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
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
    branch_permissions: List[UserBranchPermissionResponse] = []

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: AdminResponse

class TokenData(BaseModel):
    username: Optional[str] = None

# -----------------------
# PERMISSION CHECK SCHEMAS
# -----------------------
class PermissionCheckRequest(BaseModel):
    branch_id: int
    required_permission: PermissionLevel = PermissionLevel.VIEW_ONLY

class PermissionCheckResponse(BaseModel):
    has_permission: bool
    user_permission: Optional[PermissionLevel] = None
    branch_name: Optional[str] = None

class UserPermissionSummary(BaseModel):
    user_id: int
    username: str
    full_name: str
    branches: List[UserBranchPermissionResponse]

# -----------------------
# DAILY EXPENSE SCHEMAS
# -----------------------
class ExpenseCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class ExpenseCategoryResponse(ExpenseCategoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class DailyExpenseBase(BaseModel):
    category: str
    item_name: str
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_cost: float
    total_amount: float
    expense_date: Optional[datetime] = None
    receipt_number: Optional[str] = None
    vendor: Optional[str] = None

class DailyExpenseCreate(DailyExpenseBase):
    branch_id: int

class DailyExpenseUpdate(BaseModel):
    category: Optional[str] = None
    item_name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_cost: Optional[float] = None
    total_amount: Optional[float] = None
    expense_date: Optional[datetime] = None
    receipt_number: Optional[str] = None
    vendor: Optional[str] = None

class DailyExpenseResponse(DailyExpenseBase):
    id: int
    branch_id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class QuickExpenseCreate(BaseModel):
    item_name: str
    quantity: float
    unit: str
    unit_cost: float  # Add this field
    branch_id: int
    expense_date: Optional[datetime] = None

# -----------------------
# INGREDIENT SCHEMAS
# -----------------------
class IngredientBase(BaseModel):
    name: str
    quantity: float
    unit: str
    image_url: Optional[str] = None

class IngredientCreate(IngredientBase):
    pass

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    image_url: Optional[str] = None

class IngredientResponse(IngredientBase):
    id: int
    menu_item_id: int

    class Config:
        from_attributes = True

# -----------------------
# MENU ITEM SCHEMAS
# -----------------------
class MenuItemBase(BaseModel):
    name: str
    price: float
    description: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    is_available: bool = True
    branch_id: Optional[int] = None

class MenuItemCreate(MenuItemBase):
    ingredients: List[IngredientCreate] = []

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    is_available: Optional[bool] = None
    branch_id: Optional[int] = None
    ingredients: Optional[List[IngredientCreate]] = None

class MenuItemResponse(MenuItemBase):
    id: int
    ingredients: List[IngredientResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# -----------------------
# ORDER SCHEMAS
# -----------------------
class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int
    special_instructions: Optional[str] = None

class OrderItemResponse(BaseModel):
    id: int
    menu_item_id: int
    quantity: int
    unit_price: float
    total_price: float
    special_instructions: Optional[str] = None
    menu_item: Optional[MenuItemResponse] = None

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    branch_id: int
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    order_type: str = "dine_in"
    items: List[OrderItemCreate]

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None

class OrderResponse(BaseModel):
    id: int
    branch_id: int
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

# -----------------------
# SALES SCHEMAS
# -----------------------
class DailySaleCreate(BaseModel):
    menu_item_id: str  # Changed from int to str
    branch_id: int
    quantity: int
    payment_method: str = "cash"

class DailySaleResponse(BaseModel):
    id: int
    menu_item_id: int
    branch_id: int
    quantity: int
    revenue: float
    payment_method: str  # NEW
    sale_date: datetime
    menu_item: Optional[MenuItemResponse] = None

    class Config:
        from_attributes = True

class SalesSummary(BaseModel):
    date: str
    branch_id: Optional[int] = None
    total_items_sold: int
    total_revenue: float
    sales_by_item: List[dict]

# -----------------------
# INVENTORY SCHEMAS
# -----------------------
class InventoryBase(BaseModel):
    item_name: str
    current_stock: float
    unit: str
    minimum_threshold: Optional[float] = 0
    cost_per_unit: Optional[float] = None
    supplier: Optional[str] = None
    branch_id: int

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

# -----------------------
# REPORT SCHEMAS
# -----------------------
class DailyReportResponse(BaseModel):
    id: int
    branch_id: int
    report_date: datetime
    total_sales: int
    total_revenue: float
    total_expenses: float
    net_profit: float
    top_selling_item: Optional[str] = None
    export_status: str
    exported_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# -----------------------
# DASHBOARD SUMMARY
# -----------------------
class DashboardSummary(BaseModel):
    branch_id: Optional[int] = None
    total_items_sold: int
    total_revenue: float
    total_expenses: float
    net_profit: float
    pending_orders: int
    low_stock_items: int
    top_selling_items: List[dict]
    recent_orders: List[OrderResponse]
    expense_breakdown: List[dict]

# -----------------------
# OPENING BALANCE SCHEMAS
# -----------------------
class OpeningBalanceBase(BaseModel):
    branch_id: int
    amount: float
    date: Optional[datetime] = None

class OpeningBalanceCreate(OpeningBalanceBase):
    pass

class OpeningBalanceUpdateRequest(BaseModel):
    amount: float
    date: Optional[datetime] = None

class OpeningBalanceUpdate(BaseModel):
    amount: Optional[float] = None
    date: Optional[datetime] = None

class OpeningBalanceResponse(OpeningBalanceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# -----------------------
# DAILY BALANCE SUMMARY
# -----------------------
class DailyBalanceSummary(BaseModel):
    opening_balance: float
    total_revenue: float
    total_expenses: float
    calculated_balance: float
    transaction_count: int

# -----------------------
# EXPENSES
# -----------------------
class DailyExpenseBase(BaseModel):
    branch_id: int
    category: str
    item_name: str
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_cost: float
    total_amount: float
    expense_date: Optional[datetime] = None
    receipt_number: Optional[str] = None
    vendor: Optional[str] = None

class DailyExpenseCreate(DailyExpenseBase):
    pass

class DailyExpenseUpdate(BaseModel):
    category: Optional[str] = None
    item_name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_cost: Optional[float] = None
    expense_date: Optional[datetime] = None
    receipt_number: Optional[str] = None
    vendor: Optional[str] = None

class DailyExpenseResponse(DailyExpenseBase):
    id: int
    category_id: Optional[int] = None
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

# -----------------------
# IMAGE UPLOAD
# -----------------------
class ImageUploadResponse(BaseModel):
    url: str
    filename: str
    size: int

    @validator("url")
    def validate_image_url(cls, v):
        allowed_extensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"]
        if not any(v.lower().endswith(ext) for ext in allowed_extensions):
            raise ValueError("Invalid image format")
        return v

# -----------------------
# PASSWORD RESET SCHEMAS (Legacy - for backward compatibility)
# -----------------------
class ForgotPasswordRequestLegacy(BaseModel):
    username_or_email: str

class ResetPasswordRequestLegacy(BaseModel):
    token: str
    new_password: str

# -----------------------
# PASSWORD RESET SCHEMAS (New System)
# -----------------------
class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class PasswordResetResponse(BaseModel):
    message: str
    success: bool
    username: Optional[str] = None
