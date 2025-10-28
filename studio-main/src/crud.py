# crud.py - Database CRUD operations
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime, date, timedelta

from models import MenuItem, Ingredient, DailySale, Admin, Order, OrderItem, Inventory
from schemas import (
    MenuItemCreate, MenuItemUpdate, DailySaleCreate, OrderCreate, InventoryCreate, AdminCreate
)
from auth import get_password_hash

# Menu Item CRUD
def get_menu_item(db: Session, item_id: str):
    return db.query(MenuItem).filter(MenuItem.id == item_id).first()

def get_menu_items(db: Session, skip: int = 0, limit: int = 100, category: str = None, available_only: bool = True):
    query = db.query(MenuItem)
    
    if available_only:
        query = query.filter(MenuItem.is_available == True)
    
    if category:
        query = query.filter(MenuItem.category == category)
    
    return query.offset(skip).limit(limit).all()

def create_menu_item(db: Session, item: MenuItemCreate, item_id: str):
    db_item = MenuItem(
        id=item_id,
        name=item.name,
        price=item.price,
        description=item.description,
        category=item.category,
        image_url=item.image_url,
        is_available=item.is_available
    )
    db.add(db_item)
    db.flush()
    
    # Add ingredients
    for ingredient in item.ingredients:
        db_ingredient = Ingredient(
            menu_item_id=item_id,
            name=ingredient.name,
            quantity=ingredient.quantity,
            unit=ingredient.unit
        )
        db.add(db_ingredient)
    
    db.commit()
    db.refresh(db_item)
    return db_item

def update_menu_item(db: Session, item_id: str, item_update: MenuItemUpdate):
    db_item = get_menu_item(db, item_id)
    if not db_item:
        return None
    
    update_data = item_update.dict(exclude_unset=True)
    
    # Handle ingredients separately
    if "ingredients" in update_data:
        ingredients_data = update_data.pop("ingredients")
        
        # Delete existing ingredients
        db.query(Ingredient).filter(Ingredient.menu_item_id == item_id).delete()
        
        # Add new ingredients
        if ingredients_data:
            for ingredient in ingredients_data:
                db_ingredient = Ingredient(
                    menu_item_id=item_id,
                    **ingredient
                )
                db.add(db_ingredient)
    
    # Update other fields
    for field, value in update_data.items():
        setattr(db_item, field, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_menu_item(db: Session, item_id: str):
    db_item = get_menu_item(db, item_id)
    if db_item:
        db.delete(db_item)
        db.commit()
        return True
    return False

# Sales CRUD
def get_sales(db: Session, date_filter: date = None, item_id: str = None, skip: int = 0, limit: int = 100):
    query = db.query(DailySale)
    
    if date_filter:
        query = query.filter(func.date(DailySale.sale_date) == date_filter)
    
    if item_id:
        query = query.filter(DailySale.menu_item_id == item_id)
    
    return query.order_by(DailySale.sale_date.desc()).offset(skip).limit(limit).all()

def create_sale(db: Session, sale: DailySaleCreate):
    # Get menu item to calculate revenue
    menu_item = get_menu_item(db, sale.menu_item_id)
    if not menu_item:
        return None
    
    revenue = menu_item.price * sale.quantity
    
    db_sale = DailySale(
        menu_item_id=sale.menu_item_id,
        quantity=sale.quantity,
        revenue=revenue
    )
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    return db_sale

def get_sales_summary(db: Session, target_date: date):
    """Get comprehensive sales summary for a specific date"""
    sales = db.query(DailySale).filter(
        func.date(DailySale.sale_date) == target_date
    ).all()
    
    total_items = sum(sale.quantity for sale in sales)
    total_revenue = sum(sale.revenue for sale in sales)
    
    # Get item-wise breakdown
    item_sales = {}
    for sale in sales:
        if sale.menu_item_id not in item_sales:
            item_sales[sale.menu_item_id] = {
                "quantity": 0,
                "revenue": 0
            }
        item_sales[sale.menu_item_id]["quantity"] += sale.quantity
        item_sales[sale.menu_item_id]["revenue"] += sale.revenue
    
    return {
        "total_items": total_items,
        "total_revenue": total_revenue,
        "item_breakdown": item_sales,
        "sale_count": len(sales)
    }

# Order CRUD
def create_order(db: Session, order: OrderCreate):
    # Calculate total amount
    total_amount = 0
    order_items = []
    
    for item in order.items:
        menu_item = get_menu_item(db, item.menu_item_id)
        if not menu_item or not menu_item.is_available:
            return None
        
        item_total = menu_item.price * item.quantity
        total_amount += item_total
        
        order_items.append({
            "menu_item_id": item.menu_item_id,
            "quantity": item.quantity,
            "unit_price": menu_item.price,
            "total_price": item_total,
            "special_instructions": item.special_instructions
        })
    
    # Create order
    db_order = Order(
        customer_name=order.customer_name,
        customer_email=order.customer_email,
        total_amount=total_amount,
        order_type=order.order_type
    )
    db.add(db_order)
    db.flush()
    
    # Create order items
    for item_data in order_items:
        db_order_item = OrderItem(
            order_id=db_order.id,
            **item_data
        )
        db.add(db_order_item)
    
    db.commit()
    db.refresh(db_order)
    return db_order

def get_orders(db: Session, status_filter: str = None, date_filter: date = None, skip: int = 0, limit: int = 100):
    query = db.query(Order)
    
    if status_filter:
        query = query.filter(Order.status == status_filter)
    
    if date_filter:
        query = query.filter(func.date(Order.created_at) == date_filter)
    
    return query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()

def get_order(db: Session, order_id: int):
    return db.query(Order).filter(Order.id == order_id).first()

def update_order_status(db: Session, order_id: int, status: str):
    order = get_order(db, order_id)
    if not order:
        return None
    
    order.status = status
    if status == "completed":
        order.completed_at = datetime.utcnow()
        
        # Record sales for completed orders
        for item in order.items:
            db_sale = DailySale(
                menu_item_id=item.menu_item_id,
                quantity=item.quantity,
                revenue=item.total_price
            )
            db.add(db_sale)
    
    db.commit()
    db.refresh(order)
    return order

# Admin CRUD
def get_admin_by_username(db: Session, username: str):
    return db.query(Admin).filter(Admin.username == username).first()

def get_admin_by_email(db: Session, email: str):
    return db.query(Admin).filter(Admin.email == email).first()

def create_admin(db: Session, admin: AdminCreate):
    hashed_password = get_password_hash(admin.password)
    db_admin = Admin(
        username=admin.username,
        email=admin.email,
        full_name=admin.full_name,
        password_hash=hashed_password
    )
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)
    return db_admin

# Inventory CRUD
def get_inventory_items(db: Session, low_stock_only: bool = False):
    query = db.query(Inventory)
    
    if low_stock_only:
        query = query.filter(Inventory.current_stock <= Inventory.minimum_threshold)
    
    return query.all()

def get_inventory_item(db: Session, item_id: int):
    return db.query(Inventory).filter(Inventory.id == item_id).first()

def create_inventory_item(db: Session, item: InventoryCreate):
    db_item = Inventory(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_inventory_stock(db: Session, item_id: int, new_stock: float, movement_type: str = "adjustment", reason: str = None):
    """Update inventory stock and create stock movement record"""
    db_item = get_inventory_item(db, item_id)
    if not db_item:
        return None
    
    old_stock = db_item.current_stock
    db_item.current_stock = new_stock
    
    # Create stock movement record
    movement_quantity = new_stock - old_stock
    db_movement = StockMovement(
        inventory_id=item_id,
        movement_type=movement_type,
        quantity=abs(movement_quantity),
        unit=db_item.unit,
        reason=reason or f"Stock {movement_type}"
    )
    db.add(db_movement)
    
    db.commit()
    db.refresh(db_item)
    return db_item

def get_orders_between_dates(
    db: Session, 
    start_date: datetime, 
    end_date: datetime,
    branch_id: Optional[int] = None
):
    """
    Get all sales/orders between two dates
    """
    query = db.query(DailySale).filter(
        and_(
            DailySale.sale_date >= start_date,
            DailySale.sale_date <= end_date
        )
    )
    
    # Filter by branch if specified
    if branch_id:
        query = query.filter(DailySale.branch_id == branch_id)
    
    return query.order_by(DailySale.sale_date.desc()).all()

# Analytics functions
def get_sales_analytics(db: Session, start_date: date, end_date: date):
    """Get detailed sales analytics for a date range"""
    sales = db.query(DailySale).filter(
        and_(
            func.date(DailySale.sale_date) >= start_date,
            func.date(DailySale.sale_date) <= end_date
        )
    ).all()
    
    # Daily breakdown
    daily_breakdown = {}
    for sale in sales:
        sale_date = sale.sale_date.date()
        if sale_date not in daily_breakdown:
            daily_breakdown[sale_date] = {"quantity": 0, "revenue": 0}
        
        daily_breakdown[sale_date]["quantity"] += sale.quantity
        daily_breakdown[sale_date]["revenue"] += sale.revenue
    
    # Item popularity
    item_stats = {}
    for sale in sales:
        if sale.menu_item_id not in item_stats:
            menu_item = get_menu_item(db, sale.menu_item_id)
            item_stats[sale.menu_item_id] = {
                "name": menu_item.name if menu_item else "Unknown",
                "quantity": 0,
                "revenue": 0
            }
        
        item_stats[sale.menu_item_id]["quantity"] += sale.quantity
        item_stats[sale.menu_item_id]["revenue"] += sale.revenue
    
    # Sort by popularity
    popular_items = sorted(
        item_stats.values(),
        key=lambda x: x["quantity"],
        reverse=True
    )
    
    return {
        "date_range": f"{start_date} to {end_date}",
        "total_sales": len(sales),
        "total_quantity": sum(sale.quantity for sale in sales),
        "total_revenue": sum(sale.revenue for sale in sales),
        "daily_breakdown": daily_breakdown,
        "popular_items": popular_items[:10]  # Top 10
    }
