from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base
import enum

# Permission levels enum
class PermissionLevel(str, enum.Enum):
    VIEW_ONLY = "view_only"
    FULL_ACCESS = "full_access"

class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    location = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Updated relationships
    user_permissions = relationship("UserBranchPermission", back_populates="branch", cascade="all, delete-orphan")
    menu_items = relationship("MenuItem", back_populates="branch", cascade="all, delete-orphan")
    sales = relationship("DailySale", back_populates="branch", cascade="all, delete-orphan")
    expenses = relationship("DailyExpense", back_populates="branch", cascade="all, delete-orphan")
    inventory = relationship("Inventory", back_populates="branch", cascade="all, delete-orphan")
    reports = relationship("DailyReport", back_populates="branch", cascade="all, delete-orphan")
    opening_balances = relationship("OpeningBalance", back_populates="branch", cascade="all, delete-orphan")

class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="worker")  # "admin" or "worker"
    
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # New relationship for branch permissions
    branch_permissions = relationship("UserBranchPermission", back_populates="user", cascade="all, delete-orphan")
    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")

# NEW: Junction table for user-branch permissions
class UserBranchPermission(Base):
    __tablename__ = "user_branch_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("admins.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    # Store enum values (e.g., 'view_only', 'full_access') to match existing DB data
    permission_level = Column(
        SQLEnum(PermissionLevel, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        nullable=False,
        default=PermissionLevel.VIEW_ONLY,
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("Admin", back_populates="branch_permissions")
    branch = relationship("Branch", back_populates="user_permissions")
    
    # Ensure unique user-branch combinations
    __table_args__ = (UniqueConstraint('user_id', 'branch_id', name='unique_user_branch'),)

class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    category = Column(String, nullable=True)
    is_available = Column(Boolean, default=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    branch = relationship("Branch", back_populates="menu_items")
    ingredients = relationship("Ingredient", back_populates="menu_item", cascade="all, delete-orphan")

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"))
    name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    image_url = Column(String, nullable=True)

    menu_item = relationship("MenuItem", back_populates="ingredients")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    customer_name = Column(String, nullable=True)
    customer_email = Column(String, nullable=True)
    total_amount = Column(Float, nullable=False)
    status = Column(String, default="pending")
    order_type = Column(String, default="dine_in")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    branch = relationship("Branch")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    menu_item_id = Column(String, ForeignKey("menu_items.id"))  # Change Integer to String
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    special_instructions = Column(String, nullable=True)

    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem")

class DailySale(Base):
    __tablename__ = "daily_sales"

    id = Column(Integer, primary_key=True, index=True)
    menu_item_id = Column(String, ForeignKey("menu_items.id"))
    branch_id = Column(Integer, ForeignKey("branches.id"))
    quantity = Column(Integer, nullable=False)
    revenue = Column(Float, nullable=False)
    payment_method = Column(String, default="cash")  # NEW: "cash" or "gpay"
    sale_date = Column(DateTime, default=datetime.utcnow)

    branch = relationship("Branch", back_populates="sales")
    menu_item = relationship("MenuItem")

class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    expenses = relationship("DailyExpense", back_populates="category_rel", cascade="all, delete")

class DailyExpense(Base):
    __tablename__ = "daily_expenses"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=True)
    category = Column(String, nullable=False)
    item_name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    quantity = Column(Float, nullable=True)
    unit = Column(String, nullable=True)
    unit_cost = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    expense_date = Column(DateTime, default=datetime.utcnow)
    receipt_number = Column(String, nullable=True)
    vendor = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("admins.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    branch = relationship("Branch", back_populates="expenses")
    creator = relationship("Admin")
    category_rel = relationship("ExpenseCategory", back_populates="expenses")

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, nullable=False)
    current_stock = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    minimum_threshold = Column(Float, default=0)
    cost_per_unit = Column(Float, nullable=True)
    supplier = Column(String, nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    last_restocked = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    branch = relationship("Branch", back_populates="inventory")

class DailyReport(Base):
    __tablename__ = "daily_reports"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"))
    report_date = Column(DateTime, default=datetime.utcnow)
    total_sales = Column(Integer, default=0)
    total_revenue = Column(Float, default=0.0)
    total_expenses = Column(Float, default=0.0)
    net_profit = Column(Float, default=0.0)
    top_selling_item = Column(String, nullable=True)
    export_status = Column(String, default="pending")
    exported_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    branch = relationship("Branch", back_populates="reports")

class OpeningBalance(Base):
    __tablename__ = "opening_balances"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    branch = relationship("Branch", back_populates="opening_balances")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("admins.id"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("Admin", back_populates="reset_tokens")
