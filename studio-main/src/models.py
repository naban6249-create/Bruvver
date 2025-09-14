# models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class MenuItem(Base):
    __tablename__ = "menu_items"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    image_url = Column(String, nullable=True)
    category = Column(String, nullable=True)  # hot, iced, specialty, etc.
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    ingredients = relationship("Ingredient", back_populates="menu_item", cascade="all, delete-orphan")
    sales = relationship("DailySale", back_populates="menu_item")
    order_items = relationship("OrderItem", back_populates="menu_item")

class Ingredient(Base):
    __tablename__ = "ingredients"
    
    id = Column(Integer, primary_key=True, index=True)
    menu_item_id = Column(String, ForeignKey("menu_items.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)  # g, ml, shots, pumps
    image_url = Column(String, nullable=True) # This line is crucial
    
    # Relationships
    menu_item = relationship("MenuItem", back_populates="ingredients")

class DailySale(Base):
    __tablename__ = "daily_sales"
    
    id = Column(Integer, primary_key=True, index=True)
    menu_item_id = Column(String, ForeignKey("menu_items.id"))
    quantity = Column(Integer, nullable=False)
    revenue = Column(Float, nullable=False)
    sale_date = Column(DateTime, default=func.now(), index=True)
    
    # Relationships
    menu_item = relationship("MenuItem", back_populates="sales")

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, nullable=True)
    customer_email = Column(String, nullable=True)
    total_amount = Column(Float, nullable=False)
    status = Column(String, default="pending")  # pending, preparing, ready, completed, cancelled
    order_type = Column(String, default="dine_in")  # dine_in, takeaway, delivery
    created_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"))
    menu_item_id = Column(String, ForeignKey("menu_items.id"))
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    special_instructions = Column(Text, nullable=True)
    
    # Relationships
    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem", back_populates="order_items")

class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    last_login = Column(DateTime, nullable=True)

class Inventory(Base):
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, nullable=False, index=True)
    current_stock = Column(Float, nullable=False)
    unit = Column(String, nullable=False)  # g, ml, pieces, etc.
    minimum_threshold = Column(Float, default=0)
    cost_per_unit = Column(Float, nullable=True)
    supplier = Column(String, nullable=True)
    last_restocked = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class StockMovement(Base):
    __tablename__ = "stock_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, ForeignKey("inventory.id"))
    movement_type = Column(String, nullable=False)  # restock, usage, waste, adjustment
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    created_by = Column(Integer, ForeignKey("admins.id"), nullable=True)

class DailyReport(Base):
    __tablename__ = "daily_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    report_date = Column(DateTime, nullable=False, index=True)
    total_sales = Column(Integer, default=0)
    total_revenue = Column(Float, default=0.0)
    top_selling_item = Column(String, nullable=True)
    export_status = Column(String, default="pending")  # pending, exported, failed
    exported_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())