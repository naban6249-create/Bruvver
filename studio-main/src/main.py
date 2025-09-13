# main.py - Enhanced version with complete functionality
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # <-- [THE FIX] IMPORT THIS
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from typing import List, Optional
import uvicorn
import os
from dotenv import load_dotenv
from fastapi import File, UploadFile, Form
import shutil
import json
import logging
import uuid

# Set up detailed logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


os.makedirs("static/images", exist_ok=True)

# Import our modules
from database import engine, get_database
from models import Base, MenuItem, Ingredient, DailySale, Admin, Order, OrderItem, Inventory
from schemas import (
    MenuItemUpdate, MenuItemResponse,
    DailySaleCreate, DailySaleResponse, SalesSummary,
    AdminCreate, AdminLogin, AdminResponse, Token,
    OrderCreate, OrderResponse, OrderUpdate,
    InventoryCreate, InventoryResponse, InventoryUpdate,
    DashboardSummary, IngredientResponse, IngredientUpdate
)
from auth import (
    authenticate_user, create_access_token, get_current_active_user,
    get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
)
from automation import start_automation, stop_automation, manual_export_sales, manual_reset

# Load environment variables
load_dotenv()

# Create tables
Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI(
    title="Coffee Command Center API",
    description="Complete Backend API for Coffee Shop Management System",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:9002").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# [THE FIX] This line tells FastAPI to serve any files requested under "/static"
# from the "static" folder in your project. This is what makes images work.
app.mount("/static", StaticFiles(directory="static"), name="static")


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize database and start automation"""
    await initialize_sample_data()
    start_automation()

@app.on_event("shutdown")
async def shutdown_event():
    """Stop automation services"""
    stop_automation()

# Helper functions
async def initialize_sample_data():
    """Initialize database with sample data if empty"""
    db = next(get_database())

    try:
        # Check if we already have data
        if db.query(MenuItem).count() == 0:
            # Sample menu items
            sample_items = [
                {
                    "id": "1", "name": "Classic Espresso", "price": 3.0,
                    "description": "Rich and bold espresso shot",
                    "category": "hot", "image_url": "https://picsum.photos/600/400",
                    "ingredients": [
                        {"name": "Coffee Beans", "quantity": 18, "unit": "g"},
                        {"name": "Water", "quantity": 60, "unit": "ml"},
                    ]
                },
                {
                    "id": "2", "name": "Caramel Macchiato", "price": 4.5,
                    "description": "Espresso with steamed milk and caramel",
                    "category": "hot", "image_url": "https://picsum.photos/600/400",
                    "ingredients": [
                        {"name": "Coffee Beans", "quantity": 18, "unit": "g"},
                        {"name": "Milk", "quantity": 150, "unit": "ml"},
                        {"name": "Caramel Syrup", "quantity": 2, "unit": "pumps"},
                        {"name": "Vanilla Syrup", "quantity": 1, "unit": "pumps"},
                    ]
                },
                {
                    "id": "3", "name": "Iced Latte", "price": 4.0,
                    "description": "Smooth espresso with cold milk over ice",
                    "category": "iced", "image_url": "https://picsum.photos/600/400",
                    "ingredients": [
                        {"name": "Coffee Beans", "quantity": 18, "unit": "g"},
                        {"name": "Milk", "quantity": 200, "unit": "ml"},
                        {"name": "Ice", "quantity": 100, "unit": "g"},
                    ]
                },
                {
                    "id": "4", "name": "Mocha Frappuccino", "price": 5.0,
                    "description": "Blended coffee with chocolate and whipped cream",
                    "category": "specialty", "image_url": "https://picsum.photos/600/400",
                    "ingredients": [
                        {"name": "Coffee Beans", "quantity": 18, "unit": "g"},
                        {"name": "Milk", "quantity": 120, "unit": "ml"},
                        {"name": "Chocolate Syrup", "quantity": 2, "unit": "pumps"},
                        {"name": "Ice", "quantity": 150, "unit": "g"},
                        {"name": "Whipped Cream", "quantity": 30, "unit": "g"},
                    ]
                },
                {
                    "id": "5", "name": "Americano", "price": 3.25,
                    "description": "Espresso diluted with hot water",
                    "category": "hot", "image_url": "https://picsum.photos/600/400",
                    "ingredients": [
                        {"name": "Coffee Beans", "quantity": 18, "unit": "g"},
                        {"name": "Water", "quantity": 180, "unit": "ml"},
                    ]
                },
                {
                    "id": "6", "name": "Cappuccino", "price": 3.75,
                    "description": "Espresso with steamed milk and foam",
                    "category": "hot", "image_url": "https://picsum.photos/600/400",
                    "ingredients": [
                        {"name": "Coffee Beans", "quantity": 18, "unit": "g"},
                        {"name": "Milk", "quantity": 120, "unit": "ml"},
                    ]
                }
            ]

            for item_data in sample_items:
                # Create menu item
                db_item = MenuItem(
                    id=item_data["id"],
                    name=item_data["name"],
                    price=item_data["price"],
                    description=item_data["description"],
                    category=item_data["category"],
                    image_url=item_data["image_url"]
                )
                db.add(db_item)
                db.flush()

                # Add ingredients
                for ingredient_data in item_data["ingredients"]:
                    db_ingredient = Ingredient(
                        menu_item_id=item_data["id"],
                        name=ingredient_data["name"],
                        quantity=ingredient_data["quantity"],
                        unit=ingredient_data["unit"]
                    )
                    db.add(db_ingredient)

            # Add sample inventory
            sample_inventory = [
                {"item_name": "Coffee Beans", "current_stock": 5000, "unit": "g", "minimum_threshold": 500},
                {"item_name": "Milk", "current_stock": 2000, "unit": "ml", "minimum_threshold": 200},
                {"item_name": "Caramel Syrup", "current_stock": 50, "unit": "pumps", "minimum_threshold": 10},
                {"item_name": "Vanilla Syrup", "current_stock": 30, "unit": "pumps", "minimum_threshold": 5},
                {"item_name": "Chocolate Syrup", "current_stock": 40, "unit": "pumps", "minimum_threshold": 8},
                {"item_name": "Whipped Cream", "current_stock": 500, "unit": "g", "minimum_threshold": 50},
                {"item_name": "Ice", "current_stock": 10000, "unit": "g", "minimum_threshold": 1000},
            ]

            for inv_data in sample_inventory:
                db_inventory = Inventory(**inv_data)
                db.add(db_inventory)

            if db.query(Admin).count() == 0:
                default_admin_password = "testpassword"
                hashed_password = get_password_hash(default_admin_password)
                db_admin = Admin(
                    username="admin@test.com", # This is used for login
                    email="admin@test.com",
                    full_name="Default Admin",
                    password_hash=hashed_password
                )
                db.add(db_admin)
                print(f"Created default admin user with username 'admin@test.com' and password '{default_admin_password}'")

            db.commit()
            print("Sample data initialized successfully")

    finally:
        db.close()

# API Routes

@app.get("/")
async def root():
    return {
        "message": "Coffee Command Center API",
        "status": "active",
        "version": "2.0.0",
        "docs": "/docs"
    }

# NEW: Ingredient Routes for managing ingredient metadata
@app.get("/api/ingredients", response_model=List[IngredientResponse])
async def get_all_ingredients(
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Get all ingredients from all menu items (Admin only)"""
    ingredients = db.query(Ingredient).all()
    return ingredients

@app.get("/api/ingredients/unique")
async def get_unique_ingredients(
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Get unique ingredient names with their usage data (Admin only)"""
    # Get all unique ingredient names and their units
    unique_ingredients = db.query(
        Ingredient.name,
        Ingredient.unit
    ).distinct().all()
    
    # Calculate total usage for each unique ingredient
    ingredient_data = []
    for name, unit in unique_ingredients:
        # Get all ingredients with this name and unit
        ingredients = db.query(Ingredient).filter(
            Ingredient.name == name,
            Ingredient.unit == unit
        ).all()
        
        # Calculate total usage from sales
        total_usage = 0
        for ingredient in ingredients:
            # Get sales for this menu item today
            today_sales = db.query(DailySale).filter(
                DailySale.menu_item_id == ingredient.menu_item_id,
                func.date(DailySale.sale_date) == date.today()
            ).all()
            
            for sale in today_sales:
                total_usage += sale.quantity * ingredient.quantity
        
        ingredient_data.append({
            "name": name,
            "unit": unit,
            "total_usage": total_usage,
            "base_quantity": ingredients[0].quantity if ingredients else 0  # Reference quantity
        })
    
    return ingredient_data

@app.put("/api/ingredients/batch-update")
async def update_ingredient_metadata(
    ingredient_updates: List[dict],
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Update ingredient metadata across all menu items (Admin only)"""
    try:
        updated_count = 0
        
        for update in ingredient_updates:
            ingredient_name = update.get("original_name") or update.get("name")
            new_name = update.get("name")
            
            if not ingredient_name:
                continue
                
            # Update all ingredients with this name
            ingredients = db.query(Ingredient).filter(
                Ingredient.name == ingredient_name
            ).all()
            
            for ingredient in ingredients:
                if new_name and new_name != ingredient.name:
                    ingredient.name = new_name
                    updated_count += 1
        
        db.commit()
        
        return {
            "message": f"Updated {updated_count} ingredient records",
            "updated_count": updated_count
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating ingredient metadata: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update ingredients: {str(e)}")

# Menu Routes
@app.get("/api/menu", response_model=List[MenuItemResponse])
async def get_menu(
    category: Optional[str] = None,
    available_only: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_database)
):
    """Get all menu items with optional filtering"""
    query = db.query(MenuItem)

    if available_only:
        query = query.filter(MenuItem.is_available == True)

    if category:
        query = query.filter(MenuItem.category == category)

    items = query.offset(skip).limit(limit).all()
    return items

@app.get("/api/menu/{item_id}", response_model=MenuItemResponse)
async def get_menu_item(item_id: str, db: Session = Depends(get_database)):
    """Get a specific menu item by ID"""
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item

@app.post("/api/menu", response_model=MenuItemResponse)
async def create_menu_item(
    name: str = Form(...),
    price: float = Form(...),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    is_available: bool = Form(True),
    ingredients: str = Form("[]"), # Receive ingredients as a JSON string
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Create a new menu item (Admin only)"""
    # Generate new ID
    max_id_query = db.query(func.max(MenuItem.id)).scalar()
    max_id = 0
    if max_id_query:
        try:
            max_id = int(max_id_query)
        except (ValueError, TypeError):
            max_id = 0 # Fallback if the max id is not a valid integer
    
    new_id = str(max_id + 1)


    image_path = None
    if image and image.filename:
        image_path = f"/static/images/{new_id}_{image.filename}"
        with open(f"static/images/{new_id}_{image.filename}", "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

    db_item = MenuItem(
        id=new_id,
        name=name,
        price=price,
        description=description,
        category=category,
        image_url=image_path, # Save the path to the database
        is_available=is_available
    )
    db.add(db_item)
    db.flush()

    # Add ingredients
    ingredients_list = json.loads(ingredients)
    for ingredient in ingredients_list:
        db_ingredient = Ingredient(
            menu_item_id=new_id,
            name=ingredient['name'],
            quantity=ingredient['quantity'],
            unit=ingredient['unit']
        )
        db.add(db_ingredient)

    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/api/menu/{item_id}", response_model=MenuItemResponse)
async def update_menu_item_api(
    item_id: str,
    name: str = Form(...),
    price: float = Form(...),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    is_available: bool = Form(True),
    ingredients: str = Form("[]"),
    image: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Update a menu item (Admin only)"""
    logger.info(f"Attempting to update item_id: {item_id}")
    
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not db_item:
        logger.warning(f"Menu item with id {item_id} not found.")
        raise HTTPException(status_code=404, detail="Menu item not found")

    try:
        image_path = db_item.image_url # Default to existing image
        if image and image.filename:
            logger.info(f"Image received: {image.filename}")
            image_path = f"/static/images/{item_id}_{image.filename}"
            save_path = f"static/images/{item_id}_{image.filename}"
            logger.info(f"Saving image to: {save_path}")
            with open(save_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            logger.info("Image saved successfully.")
        
        # Update fields on the database object
        db_item.name = name
        db_item.price = price
        db_item.description = description
        db_item.category = category
        db_item.is_available = is_available
        db_item.image_url = image_path

        # Handle ingredients: delete old, add new
        db.query(Ingredient).filter(Ingredient.menu_item_id == item_id).delete(synchronize_session=False)
        
        ingredients_list = json.loads(ingredients)
        for ingredient_data in ingredients_list:
            db_ingredient = Ingredient(
                menu_item_id=item_id,
                name=ingredient_data.get("name"),
                quantity=ingredient_data.get("quantity"),
                unit=ingredient_data.get("unit")
            )
            db.add(db_ingredient)

        db.commit()
        db.refresh(db_item)

        logger.info(f"Successfully updated item_id: {item_id}")
        return db_item

    except Exception as e:
        db.rollback()
        logger.error(f"An error occurred during menu item update: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal Server Error during item update.")


@app.delete("/api/menu/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu_item_api(
    item_id: str,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Delete a menu item (Admin only)"""
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    db.delete(db_item)
    db.commit()
    return

# Order Routes
@app.post("/api/orders", response_model=OrderResponse)
async def create_order(order: OrderCreate, db: Session = Depends(get_database)):
    """Create a new order"""
    # Calculate total amount
    total_amount = 0
    order_items_data = []

    for item in order.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == item.menu_item_id).first()
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item {item.menu_item_id} not found")

        if not menu_item.is_available:
            raise HTTPException(status_code=400, detail=f"Menu item {menu_item.name} is not available")

        item_total = menu_item.price * item.quantity
        total_amount += item_total

        order_items_data.append({
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
    for item_data in order_items_data:
        db_order_item = OrderItem(
            order_id=db_order.id,
            **item_data
        )
        db.add(db_order_item)

    db.commit()
    db.refresh(db_order)
    return db_order

@app.get("/api/orders", response_model=List[OrderResponse])
async def get_orders(
    status_filter: Optional[str] = None,
    date_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Get orders with optional filtering (Admin only)"""
    query = db.query(Order)

    if status_filter:
        query = query.filter(Order.status == status_filter)

    if date_filter:
        try:
            filter_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            query = query.filter(func.date(Order.created_at) == filter_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    return orders

@app.get("/api/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Get specific order by ID (Admin only)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@app.patch("/api/orders/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: int,
    order_update: OrderUpdate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Update order status (Admin only)"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order_update.status:
        order.status = order_update.status
        if order_update.status == "completed":
            order.completed_at = datetime.utcnow()

            # Record sales for completed orders
            for item in order.items:
                db_sale = DailySale(
                    menu_item_id=item.menu_item_id,
                    quantity=item.quantity,
                    revenue=item.total_price
                )
                db.add(db_sale)

    if order_update.customer_name:
        order.customer_name = order_update.customer_name

    if order_update.customer_email:
        order.customer_email = order_update.customer_email

    db.commit()
    db.refresh(order)
    return order

# Sales Routes
@app.get("/api/sales", response_model=List[DailySaleResponse])
async def get_sales(
    date_filter: Optional[str] = None,
    item_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Get sales data with filtering (Admin only)"""
    query = db.query(DailySale)

    if date_filter:
        try:
            filter_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            query = query.filter(func.date(DailySale.sale_date) == filter_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    if item_id:
        query = query.filter(DailySale.menu_item_id == item_id)

    sales = query.order_by(DailySale.sale_date.desc()).offset(skip).limit(limit).all()
    return sales

@app.post("/api/sales", response_model=DailySaleResponse)
async def record_sale(
    sale: DailySaleCreate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Record a manual sale (Admin only)"""
    menu_item = db.query(MenuItem).filter(MenuItem.id == sale.menu_item_id).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")

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

@app.get("/api/sales/summary")
async def get_sales_summary(
    date_filter: Optional[str] = None,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Get sales summary with analytics (Admin only)"""
    target_date = date.today()

    if date_filter:
        try:
            target_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Query sales for the target date
    sales = db.query(DailySale).filter(
        func.date(DailySale.sale_date) == target_date
    ).all()

    # Calculate summary statistics
    total_items_sold = sum(sale.quantity for sale in sales)
    total_revenue = sum(sale.revenue for sale in sales)

    # Group by menu item
    sales_by_item = {}
    for sale in sales:
        item_id = sale.menu_item_id
        if item_id not in sales_by_item:
            menu_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
            sales_by_item[item_id] = {
                "item_id": item_id,
                "item_name": menu_item.name if menu_item else "Unknown",
                "item_price": menu_item.price if menu_item else 0,
                "quantity_sold": 0,
                "revenue": 0
            }

        sales_by_item[item_id]["quantity_sold"] += sale.quantity
        sales_by_item[item_id]["revenue"] += sale.revenue

    return {
        "date": target_date.strftime("%Y-%m-%d"),
        "total_items_sold": total_items_sold,
        "total_revenue": round(total_revenue, 2),
        "sales_by_item": list(sales_by_item.values())
    }

# Authentication Routes
@app.post("/api/auth/register", response_model=AdminResponse)
async def register_admin(admin: AdminCreate, db: Session = Depends(get_database)):
    """Register a new admin"""
    # Check if username or email already exists
    existing_admin = db.query(Admin).filter(
        (Admin.username == admin.username) | (Admin.email == admin.email)
    ).first()

    if existing_admin:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    # Hash password
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

@app.post("/api/auth/login", response_model=Token)
async def login_admin(credentials: AdminLogin, db: Session = Depends(get_database)):
    """Admin login with JWT token"""
    admin = authenticate_user(db, credentials.username, credentials.password)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last login
    admin.last_login = datetime.utcnow()
    db.commit()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin.username}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=AdminResponse)
async def read_users_me(current_user: Admin = Depends(get_current_active_user)):
    """Get current user info"""
    return current_user

# Dashboard Route
@app.get("/api/dashboard", response_model=DashboardSummary)
async def get_dashboard_data(
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Get dashboard summary data (Admin only)"""
    today = date.today()

    # Today's sales
    today_sales = db.query(DailySale).filter(
        func.date(DailySale.sale_date) == today
    ).all()

    today_items_sold = sum(sale.quantity for sale in today_sales)
    today_revenue = sum(sale.revenue for sale in today_sales)

    # Pending orders
    pending_orders_count = db.query(Order).filter(
        Order.status.in_(["pending", "preparing"])
    ).count()

    # Low stock items
    low_stock_count = db.query(Inventory).filter(
        Inventory.current_stock <= Inventory.minimum_threshold
    ).count()

    week_ago = today - timedelta(days=7)
    top_items = db.query(
        DailySale.menu_item_id,
        func.sum(DailySale.quantity).label('total_quantity'),
        func.sum(DailySale.revenue).label('total_revenue')
    ).filter(
        func.date(DailySale.sale_date) >= week_ago
    ).group_by(DailySale.menu_item_id).order_by(
        func.sum(DailySale.quantity).desc()
    ).limit(5).all()

    top_selling_items = []
    for item_sale in top_items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == item_sale.menu_item_id).first()
        if menu_item:
            top_selling_items.append({
                "name": menu_item.name,
                "quantity_sold": item_sale.total_quantity,
                "revenue": round(item_sale.total_revenue, 2)
            })

    # Recent orders
    recent_orders = db.query(Order).order_by(Order.created_at.desc()).limit(5).all()

    return {
        "today_sales": today_items_sold,
        "today_revenue": round(today_revenue, 2),
        "pending_orders": pending_orders_count,
        "low_stock_items": low_stock_count,
        "top_selling_items": top_selling_items,
        "recent_orders": recent_orders
    }

# Inventory Routes
@app.get("/api/inventory", response_model=List[InventoryResponse])
async def get_inventory(
    low_stock_only: bool = False,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Get inventory items (Admin only)"""
    query = db.query(Inventory)
    if low_stock_only:
        query = query.filter(Inventory.current_stock <= Inventory.minimum_threshold)
    inventory = query.all()
    return inventory

@app.post("/api/inventory", response_model=InventoryResponse)
async def create_inventory_item(
    item: InventoryCreate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Create new inventory item (Admin only)"""
    db_item = Inventory(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.patch("/api/inventory/{item_id}", response_model=InventoryResponse)
async def update_inventory(
    item_id: int,
    item_update: InventoryUpdate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Update inventory item (Admin only)"""
    db_item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    update_data = item_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.patch("/api/ingredients/{ingredient_id}", response_model=IngredientResponse)
async def update_ingredient(
    ingredient_id: int,
    ingredient_update: IngredientUpdate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Update ingredient details including image (Admin only)"""
    logger.info(f"Updating ingredient {ingredient_id} with data: {ingredient_update.dict()}")
    
    db_ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not db_ingredient:
        logger.warning(f"Ingredient with id {ingredient_id} not found")
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    try:
        # Update only the fields that were provided
        update_data = ingredient_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_ingredient, field, value)
            logger.info(f"Updated {field} to {value}")
        
        db.commit()
        db.refresh(db_ingredient)
        
        logger.info(f"Successfully updated ingredient {ingredient_id}")
        return db_ingredient
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating ingredient {ingredient_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update ingredient: {str(e)}")

# Make sure your upload endpoint exists and is working (this should already be in main.py)
@app.post("/api/upload-image")
async def upload_image(file: UploadFile = File(...)):
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Validate file size (5MB limit)
        if file.size and file.size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")
        
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        ext = os.path.splitext(file.filename)[1] if file.filename else '.jpg'
        filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Return the static path that frontend can use
        file_url = f"/static/images/{filename}"
        logger.info(f"Image uploaded successfully: {file_url}")
        return {"url": file_url}
    except Exception as e:
        logger.error(f"Error uploading image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Manual automation triggers
@app.post("/api/admin/export-sales")
async def trigger_sales_export(
    current_user: Admin = Depends(get_current_active_user)
):
    """Manually trigger sales export to Google Sheets (Admin only)"""
    try:
        await manual_export_sales()
        return {"message": "Sales export completed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@app.post("/api/admin/daily-reset")
async def trigger_daily_reset(
    current_user: Admin = Depends(get_current_active_user)
):
    """Manually trigger daily reset (Admin only)"""
    try:
        await manual_reset()
        return {"message": "Daily reset completed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0"
    }

# Categories endpoint
@app.get("/api/categories")
async def get_categories(db: Session = Depends(get_database)):
    """Get all available menu categories"""
    categories = db.query(MenuItem.category).filter(
        MenuItem.category.isnot(None),
        MenuItem.is_available == True
    ).distinct().all()
    return [cat[0] for cat in categories if cat[0]]
UPLOAD_DIR = "static/images"

@app.post("/api/upload-image")
async def upload_image(file: UploadFile = File(...)):
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Return the static path that frontend can use
        file_url = f"/static/images/{filename}"
        return {"url": file_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("ENVIRONMENT") == "development"
    )
