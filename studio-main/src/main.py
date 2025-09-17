# main.py - Complete merged version with multi-branch, expenses, worker APIs, enhanced auth & upload
from fastapi import FastAPI, HTTPException, Depends, status, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from typing import List, Optional
import uvicorn
import os
from dotenv import load_dotenv
import shutil
import json
import logging
import uuid

# Set up detailed logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure upload directory exists
os.makedirs("static/images", exist_ok=True)

# Import our modules (based on your uploaded files)
from database import engine, get_database
from models import (
    Base, MenuItem, Ingredient, DailySale, Admin, Order, OrderItem, Inventory,
    Branch, DailyExpense, ExpenseCategory
)
from schemas import (
    UserRole,  # 👈 FIX: import from schemas, not models
    MenuItemUpdate, MenuItemResponse,
    DailySaleCreate, DailySaleResponse, SalesSummary,
    AdminCreate, AdminLogin, AdminResponse, Token,
    OrderCreate, OrderResponse, OrderUpdate,
    InventoryCreate, InventoryResponse, InventoryUpdate,
    DashboardSummary, IngredientResponse, IngredientUpdate,
    BranchResponse, BranchCreate, BranchUpdate,
    DailyExpenseResponse, DailyExpenseCreate, DailyExpenseUpdate,
    ExpenseCategoryResponse, QuickExpenseCreate
)
from sqlalchemy import func, and_

from auth import (
    authenticate_user, create_access_token, get_current_active_user,
    get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
)
from automation import start_automation, stop_automation, manual_export_sales, manual_reset

# Load environment variables
load_dotenv()

# Create tables
Base.metadata.create_all(bind=engine)

# App metadata
app = FastAPI(
    title="Coffee Command Center API",
    description="Complete Backend API for Coffee Shop Management System with Multi-Branch Support",
    version="3.0.0",
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

# Serve static files (images)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Startup/shutdown
@app.on_event("startup")
async def startup_event():
    """Initialize database and start automation"""
    await initialize_sample_data()
    try:
        start_automation()
    except Exception:
        logger.exception("Failed to start automation service on startup.")

@app.on_event("shutdown")
async def shutdown_event():
    """Stop automation services"""
    try:
        stop_automation()
    except Exception:
        logger.exception("Failed to stop automation service on shutdown.")

# -------------------------
# Helper: initialize sample data
# -------------------------
async def initialize_sample_data():
    """Initialize database with sample data if empty"""
    db = next(get_database())
    try:
        # Only add sample items if none exist
        if db.query(MenuItem).count() == 0:
            sample_items = [
                {
                    "id": "1", "name": "Classic Espresso", "price": 120.0,
                    "description": "Rich and bold espresso shot",
                    "category": "hot", "image_url": "https://picsum.photos/600/400",
                    "ingredients": [
                        {"name": "Coffee Beans", "quantity": 18, "unit": "g"},
                        {"name": "Water", "quantity": 60, "unit": "ml"},
                    ]
                },
                {
                    "id": "2", "name": "Caramel Macchiato", "price": 180.0,
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
                    "id": "3", "name": "Iced Latte", "price": 160.0,
                    "description": "Smooth espresso with cold milk over ice",
                    "category": "iced", "image_url": "https://picsum.photos/600/400",
                    "ingredients": [
                        {"name": "Coffee Beans", "quantity": 18, "unit": "g"},
                        {"name": "Milk", "quantity": 200, "unit": "ml"},
                        {"name": "Ice", "quantity": 100, "unit": "g"},
                    ]
                }
            ]

            for item_data in sample_items:
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
                for ingredient_data in item_data["ingredients"]:
                    db_ingredient = Ingredient(
                        menu_item_id=item_data["id"],
                        name=ingredient_data["name"],
                        quantity=ingredient_data["quantity"],
                        unit=ingredient_data["unit"],
                        image_url=None
                    )
                    db.add(db_ingredient)

            # Inventory
            sample_inventory = [
                {"item_name": "Coffee Beans", "current_stock": 5000, "unit": "g", "minimum_threshold": 500},
                {"item_name": "Milk", "current_stock": 2000, "unit": "ml", "minimum_threshold": 200},
                {"item_name": "Caramel Syrup", "current_stock": 50, "unit": "pumps", "minimum_threshold": 10},
            ]
            for inv_data in sample_inventory:
                db_inventory = Inventory(**inv_data)
                db.add(db_inventory)

            # Default admin (if none)
            if db.query(Admin).count() == 0:
                default_admin_password = "testpassword"
                hashed_password = get_password_hash(default_admin_password)
                db_admin = Admin(
                    username="admin@test.com",
                    email="admin@test.com",
                    full_name="Default Admin",
                    password_hash=hashed_password
                )
                db.add(db_admin)
                logger.info("Created default admin user admin@test.com / testpassword")

            db.commit()
            logger.info("Sample data initialized successfully")
    except Exception:
        db.rollback()
        logger.exception("Failed to initialize sample data")
    finally:
        db.close()

# -------------------------
# Root / health
# -------------------------
@app.get("/")
async def root():
    return {
        "message": "Coffee Command Center API with Multi-Branch Support",
        "status": "active",
        "version": app.version,
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": app.version
    }

# -------------------------
# BRANCH MANAGEMENT
# -------------------------
@app.get("/api/branches", response_model=List[BranchResponse])
async def get_branches(
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Get all branches (Admin only)"""
    if hasattr(current_user, 'role') and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    branches = db.query(Branch).filter(Branch.is_active == True).all()
    return branches

@app.post("/api/branches", response_model=BranchResponse)
async def create_branch(
    branch: BranchCreate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Create a new branch (Admin only)"""
    if hasattr(current_user, 'role') and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    existing_branch = db.query(Branch).filter(Branch.name == branch.name).first()
    if existing_branch:
        raise HTTPException(status_code=400, detail="Branch name already exists")
    db_branch = Branch(**branch.dict())
    db.add(db_branch)
    db.commit()
    db.refresh(db_branch)
    return db_branch

@app.put("/api/branches/{branch_id}", response_model=BranchResponse)
async def update_branch(
    branch_id: int,
    branch_update: BranchUpdate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Update a branch (Admin only)"""
    if hasattr(current_user, 'role') and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    db_branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not db_branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    update_data = branch_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_branch, field, value)
    db.commit()
    db.refresh(db_branch)
    return db_branch

@app.delete("/api/branches/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_branch(
    branch_id: int,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Delete a branch (Admin only)"""
    if hasattr(current_user, 'role') and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    db_branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not db_branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    # Check associations
    has_menu_items = db.query(MenuItem).filter(MenuItem.branch_id == branch_id).first()
    has_sales = db.query(DailySale).filter(DailySale.branch_id == branch_id).first()
    has_expenses = db.query(DailyExpense).filter(DailyExpense.branch_id == branch_id).first()
    if has_menu_items or has_sales or has_expenses:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete branch with associated menu items, sales, or expenses. Deactivate instead."
        )
    db.delete(db_branch)
    db.commit()
    return

# -------------------------
# EXPENSES
# -------------------------
@app.get("/api/expenses", response_model=List[DailyExpenseResponse])
async def get_expenses(
    branch_id: Optional[int] = None,
    date: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Get daily expenses with filtering"""
    query = db.query(DailyExpense)
    # Branch filtering
    if hasattr(current_user, 'role') and current_user.role == UserRole.WORKER:
        if not current_user.branch_id:
            raise HTTPException(status_code=403, detail="Worker must be assigned to a branch")
        query = query.filter(DailyExpense.branch_id == current_user.branch_id)
    elif branch_id:
        query = query.filter(DailyExpense.branch_id == branch_id)
    if date:
        try:
            filter_date = datetime.strptime(date, "%Y-%m-%d").date()
            query = query.filter(func.date(DailyExpense.expense_date) == filter_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    if category:
        query = query.filter(DailyExpense.category == category)
    expenses = query.order_by(DailyExpense.expense_date.desc()).offset(skip).limit(limit).all()
    return expenses

@app.post("/api/expenses", response_model=DailyExpenseResponse)
async def create_expense(
    expense: DailyExpenseCreate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Create a new daily expense"""
    # Worker branch restriction
    if hasattr(current_user, 'role') and current_user.role == UserRole.WORKER:
        if not current_user.branch_id or current_user.branch_id != expense.branch_id:
            raise HTTPException(status_code=403, detail="Cannot create expenses for other branches")
    branch = db.query(Branch).filter(Branch.id == expense.branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    db_expense = DailyExpense(**expense.dict(), created_by=current_user.id)
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense
@app.post("/api/expenses/quick-add", response_model=DailyExpenseResponse)
async def quick_add_expense(
    expense_data: QuickExpenseCreate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """
    A simplified endpoint for workers to add common expenses
    like milk or water. It automatically looks up the cost
    from inventory and assigns a category.
    """
    logger.info(f"Quick expense add received for item: {expense_data.item_name}")
    
    # 1. Find the inventory item to get its cost
    # We assume an inventory item exists with the same name (e.g., "Milk")
    inventory_item = db.query(InventoryModel).filter(
        func.lower(InventoryModel.item_name) == func.lower(expense_data.item_name),
        InventoryModel.branch_id == expense_data.branch_id
    ).first()
    
    unit_cost = 0.0
    if inventory_item and inventory_item.cost_per_unit:
        unit_cost = inventory_item.cost_per_unit
    else:
        logger.warning(f"No inventory item or cost found for '{expense_data.item_name}'. Defaulting cost to 0.")

    # 2. Determine category based on item name
    category_name = "Other"
    if "milk" in expense_data.item_name.lower():
        category_name = "Dairy"
    elif "water" in expense_data.item_name.lower():
        category_name = "Utilities"
        
    category_obj = db.query(ExpenseCategory).filter(ExpenseCategory.name == category_name).first()

    # 3. Create the full DailyExpense object
    total_amount = unit_cost * expense_data.quantity
    
    db_expense = DailyExpense(
        item_name=expense_data.item_name,
        quantity=expense_data.quantity,
        unit=expense_data.unit,
        unit_cost=unit_cost,
        total_amount=total_amount,
        branch_id=expense_data.branch_id,
        category=category_name,
        category_id=category_obj.id if category_obj else None,
        expense_date=expense_data.expense_date or datetime.utcnow(),
        created_by=current_user.id
    )
    
    db.add(db_expense)
    
    # 4. Optional: Update inventory stock (deduct what was used)
    if inventory_item:
        inventory_item.current_stock = (inventory_item.current_stock or 0) - expense_data.quantity
        inventory_item.updated_at = datetime.utcnow()
        db.add(inventory_item)
    
    db.commit()
    db.refresh(db_expense)
    
    logger.info(f"Successfully created quick expense ID: {db_expense.id}")
    return db_expense

@app.put("/api/expenses/{expense_id}", response_model=DailyExpenseResponse)
async def update_expense(
    expense_id: int,
    expense_update: DailyExpenseUpdate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Update a daily expense"""
    db_expense = db.query(DailyExpense).filter(DailyExpense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    # Permissions for worker
    if hasattr(current_user, 'role') and current_user.role == UserRole.WORKER:
        if not current_user.branch_id or current_user.branch_id != db_expense.branch_id:
            raise HTTPException(status_code=403, detail="Cannot edit expenses from other branches")
        if db_expense.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Can only edit your own expenses")
    update_data = expense_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_expense, field, value)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@app.delete("/api/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: int,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Delete a daily expense"""
    db_expense = db.query(DailyExpense).filter(DailyExpense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if hasattr(current_user, 'role') and current_user.role == UserRole.WORKER:
        if not current_user.branch_id or current_user.branch_id != db_expense.branch_id:
            raise HTTPException(status_code=403, detail="Cannot delete expenses from other branches")
        if db_expense.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Can only delete your own expenses")
    db.delete(db_expense)
    db.commit()
    return

@app.get("/api/expenses/summary")
async def get_expense_summary(
    branch_id: Optional[int] = None,
    date_filter: Optional[str] = None,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Get expense summary with analytics"""
    target_date = date.today()
    if date_filter:
        try:
            target_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    query = db.query(DailyExpense).filter(func.date(DailyExpense.expense_date) == target_date)
    if hasattr(current_user, 'role') and current_user.role == UserRole.WORKER and current_user.branch_id:
        query = query.filter(DailyExpense.branch_id == current_user.branch_id)
    elif branch_id:
        query = query.filter(DailyExpense.branch_id == branch_id)
    expenses = query.all()
    total_expenses = sum(expense.total_amount for expense in expenses)
    # Group by category
    category_breakdown = {}
    for expense in expenses:
        if expense.category not in category_breakdown:
            category_breakdown[expense.category] = {
                "category": expense.category,
                "total_amount": 0,
                "item_count": 0,
                "items": []
            }
        category_breakdown[expense.category]["total_amount"] += expense.total_amount
        category_breakdown[expense.category]["item_count"] += 1
        category_breakdown[expense.category]["items"].append({
            "item_name": expense.item_name,
            "amount": expense.total_amount,
            "quantity": expense.quantity,
            "unit": expense.unit
        })
    return {
        "date": target_date.strftime("%Y-%m-%d"),
        "branch_id": branch_id,
        "total_expenses": round(total_expenses, 2),
        "expense_count": len(expenses),
        "category_breakdown": list(category_breakdown.values())
    }

# -------------------------
# EXPENSE CATEGORIES
# -------------------------
@app.get("/api/expense-categories", response_model=List[ExpenseCategoryResponse])
async def get_expense_categories(
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    categories = db.query(ExpenseCategory).filter(ExpenseCategory.is_active == True).all()
    return categories

# -------------------------
# ENHANCED AUTH (login returning user data)
# -------------------------
@app.post("/api/auth/login", response_model=Token)
async def login_admin_enhanced(
    form_data: AdminLogin,
    db: Session = Depends(get_database)
):
    """
    Enhanced login endpoint that provides a JWT token.
    It returns the token and full admin details upon successful authentication.
    """
    logger.info(f"Login attempt for user: {form_data.username}")
    admin = authenticate_user(
        db,
        username=form_data.username,
        password=form_data.password
    )
    if not admin:
        logger.warning(f"Failed login for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create the user data payload for the token
    # This must match the schemas.AdminResponse model
    user_data = {
        "id": admin.id,
        "username": admin.username,
        "email": admin.email,
        "full_name": admin.full_name,
        "role": admin.role.value if hasattr(admin.role, 'value') else getattr(admin, 'role', 'admin'),
        "branch_id": getattr(admin, 'branch_id', None),
        "is_active": admin.is_active,
        "is_superuser": admin.is_superuser,  # <-- FIX: ADDED THIS LINE
        "created_at": admin.created_at      # <-- FIX: ADDED THIS LINE
    }

    # Create the access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin.username, "role": user_data["role"]},
        expires_delta=access_token_expires
    )

    logger.info(f"Successful login for user: {admin.username}")
    return Token(access_token=access_token, token_type="bearer", user=user_data)

# -------------------------
# IMAGE UPLOAD (validated)
# -------------------------
UPLOAD_DIR = "static/images"
@app.post("/api/upload-image")
async def upload_image_validated(file: UploadFile = File(...)):
    """Upload and validate image files with size and format restrictions"""
    try:
        allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {', '.join([t.split('/')[1] for t in allowed_types])}"
            )
        MAX_SIZE = 2 * 1024 * 1024  # 2MB
        file_content = await file.read()
        if len(file_content) > MAX_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: 2MB, current size: {len(file_content)/1024/1024:.2f}MB"
            )
        await file.seek(0)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        ext = os.path.splitext(file.filename)[1] if file.filename else '.jpg'
        filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_url = f"/static/images/{filename}"
        logger.info(f"Image uploaded successfully: {file_url}")
        return {"url": file_url, "filename": filename, "size": len(file_content), "content_type": file.content_type}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading image: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------
# INGREDIENT ROUTES
# -------------------------
@app.get("/api/ingredients", response_model=List[IngredientResponse])
async def get_all_ingredients(
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    ingredients = db.query(Ingredient).all()
    return ingredients

@app.get("/api/ingredients/unique")
async def get_unique_ingredients(
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    unique_ingredients = db.query(Ingredient.name, Ingredient.unit).distinct().all()
    ingredient_data = []
    for name, unit in unique_ingredients:
        ingredients = db.query(Ingredient).filter(Ingredient.name == name, Ingredient.unit == unit).all()
        total_usage = 0
        for ingredient in ingredients:
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
            "base_quantity": ingredients[0].quantity if ingredients else 0
        })
    return ingredient_data

@app.put("/api/ingredients/batch-update")
async def update_ingredient_metadata(
    ingredient_updates: List[dict],
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    try:
        updated_count = 0
        for update in ingredient_updates:
            ingredient_name = update.get("original_name") or update.get("name")
            new_name = update.get("name")
            if not ingredient_name:
                continue
            ingredients = db.query(Ingredient).filter(Ingredient.name == ingredient_name).all()
            for ingredient in ingredients:
                if new_name and new_name != ingredient.name:
                    ingredient.name = new_name
                    updated_count += 1
        db.commit()
        return {"message": f"Updated {updated_count} ingredient records", "updated_count": updated_count}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating ingredient metadata: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update ingredients: {str(e)}")

@app.patch("/api/ingredients/{ingredient_id}", response_model=IngredientResponse)
async def update_ingredient(
    ingredient_id: int,
    ingredient_update: IngredientUpdate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    logger.info(f"Updating ingredient {ingredient_id} with data: {ingredient_update.dict()}")
    db_ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not db_ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    try:
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

@app.delete("/api/ingredients/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ingredient(
    ingredient_id: int,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    db_ingredient = db.query(Ingredient).filter(Ingredient.id == ingredient_id).first()
    if not db_ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    db.delete(db_ingredient)
    db.commit()
    return

# -------------------------
# MENU (CRUD with branch support)
# -------------------------
@app.get("/api/menu", response_model=List[MenuItemResponse])
async def get_menu_enhanced(
    branch_id: Optional[int] = None,
    category: Optional[str] = None,
    available_only: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    query = db.query(MenuItem)
    if current_user and hasattr(current_user, 'role') and current_user.role == UserRole.WORKER and current_user.branch_id:
        query = query.filter(MenuItem.branch_id == current_user.branch_id)
    elif branch_id:
        query = query.filter(MenuItem.branch_id == branch_id)
    if available_only:
        query = query.filter(MenuItem.is_available == True)
    if category:
        query = query.filter(MenuItem.category == category)
    items = query.offset(skip).limit(limit).all()
    return items

@app.get("/api/menu/{item_id}", response_model=MenuItemResponse)
async def get_menu_item(item_id: str, db: Session = Depends(get_database)):
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
    branch_id: Optional[int] = Form(None),
    ingredients: str = Form("[]"),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    # Generate new numeric id string
    max_id_query = db.query(func.max(MenuItem.id)).scalar()
    max_id = 0
    if max_id_query:
        try:
            max_id = int(max_id_query)
        except (ValueError, TypeError):
            max_id = 0
    new_id = str(max_id + 1)
    image_path = None
    if image and image.filename:
        image_path = f"/static/images/{new_id}_{image.filename}"
        with open(f"static/images/{new_id}_{image.filename}", "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
    db_item = MenuItem(
        id=new_id, name=name, price=price, description=description,
        category=category, branch_id=branch_id, image_url=image_path, is_available=is_available
    )
    db.add(db_item)
    db.flush()
    ingredients_list = json.loads(ingredients)
    for ingredient in ingredients_list:
        db_ingredient = Ingredient(
            menu_item_id=new_id,
            name=ingredient['name'],
            quantity=ingredient['quantity'],
            unit=ingredient['unit'],
            image_url=ingredient.get('image_url')
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
    is_available: str = Form("True"),
    ingredients: str = Form("[]"),
    image: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    logger.info(f"Attempting to update item_id: {item_id}")
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    try:
        image_path = db_item.image_url
        if image and image.filename:
            image_path = f"/static/images/{item_id}_{image.filename}"
            save_path = f"static/images/{item_id}_{image.filename}"
            with open(save_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
        db_item.name = name
        db_item.price = price
        db_item.description = description
        db_item.category = category
        db_item.is_available = is_available.lower() in ['true', '1', 't', 'y', 'yes']
        db_item.image_url = image_path
        # Replace ingredients
        db.query(Ingredient).filter(Ingredient.menu_item_id == item_id).delete(synchronize_session=False)
        ingredients_list = json.loads(ingredients)
        for ingredient_data in ingredients_list:
            db_ingredient = Ingredient(
                menu_item_id=item_id,
                name=ingredient_data.get("name"),
                quantity=ingredient_data.get("quantity"),
                unit=ingredient_data.get("unit"),
                image_url=ingredient_data.get("image_url")
            )
            db.add(db_ingredient)
        db.commit()
        db.refresh(db_item)
        logger.info(f"Successfully updated item_id: {item_id}")
        return db_item
    except Exception as e:
        db.rollback()
        logger.exception("Error updating menu item")
        raise HTTPException(status_code=500, detail="Internal Server Error during item update.")

@app.delete("/api/menu/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu_item_api(
    item_id: str,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    db.delete(db_item)
    db.commit()
    return

# -------------------------
# ORDERS
# -------------------------
@app.post("/api/orders", response_model=OrderResponse)
async def create_order(order: OrderCreate, db: Session = Depends(get_database)):
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
    db_order = Order(
        customer_name=order.customer_name,
        customer_email=order.customer_email,
        total_amount=total_amount,
        order_type=order.order_type,
        branch_id=getattr(order, "branch_id", None)
    )
    db.add(db_order)
    db.flush()
    for item_data in order_items_data:
        db_order_item = OrderItem(order_id=db_order.id, **item_data)
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
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order_update.status:
        order.status = order_update.status
        if order_update.status == "completed":
            order.completed_at = datetime.utcnow()
            for item in order.items:
                db_sale = DailySale(menu_item_id=item.menu_item_id, quantity=item.quantity, revenue=item.total_price, branch_id=order.branch_id)
                db.add(db_sale)
    if order_update.customer_name:
        order.customer_name = order_update.customer_name
    if order_update.customer_email:
        order.customer_email = order_update.customer_email
    db.commit()
    db.refresh(order)
    return order

# -------------------------
# SALES
# -------------------------
@app.get("/api/sales", response_model=List[DailySaleResponse])
async def get_sales_enhanced(
    branch_id: Optional[int] = None,
    date_filter: Optional[str] = None,
    item_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    query = db.query(DailySale)
    if hasattr(current_user, 'role') and current_user.role == UserRole.WORKER and current_user.branch_id:
        query = query.filter(DailySale.branch_id == current_user.branch_id)
    elif branch_id:
        query = query.filter(DailySale.branch_id == branch_id)
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

@app.get("/api/sales/summary")
async def get_sales_summary_enhanced(
    branch_id: Optional[int] = None,
    date_filter: Optional[str] = None,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    target_date = date.today()
    if date_filter:
        try:
            target_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    query = db.query(DailySale).filter(func.date(DailySale.sale_date) == target_date)
    if hasattr(current_user, 'role') and current_user.role == UserRole.WORKER and current_user.branch_id:
        query = query.filter(DailySale.branch_id == current_user.branch_id)
    elif branch_id:
        query = query.filter(DailySale.branch_id == branch_id)
    sales = query.all()
    total_items_sold = sum(sale.quantity for sale in sales)
    total_revenue = sum(sale.revenue for sale in sales)
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
        "branch_id": branch_id,
        "total_items_sold": total_items_sold,
        "total_revenue": round(total_revenue, 2),
        "sales_by_item": list(sales_by_item.values())
    }

@app.post("/api/sales", response_model=DailySaleResponse)
async def record_sale(
    sale: DailySaleCreate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    menu_item = db.query(MenuItem).filter(MenuItem.id == sale.menu_item_id).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    revenue = menu_item.price * sale.quantity
    db_sale = DailySale(menu_item_id=sale.menu_item_id, quantity=sale.quantity, revenue=revenue, branch_id=sale.branch_id)
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    return db_sale

# -------------------------
# DASHBOARD
# -------------------------
@app.get("/api/dashboard", response_model=DashboardSummary)
async def get_dashboard_data_enhanced(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    today = date.today()
    target_branch_id = None
    if hasattr(current_user, 'role') and current_user.role == UserRole.WORKER:
        target_branch_id = current_user.branch_id
        if not target_branch_id:
            raise HTTPException(status_code=403, detail="Worker must be assigned to a branch")
    elif branch_id:
        target_branch_id = branch_id
    sales_filter = func.date(DailySale.sale_date) == today
    expense_filter = func.date(DailyExpense.expense_date) == today
    if target_branch_id:
        sales_filter = and_(sales_filter, DailySale.branch_id == target_branch_id)
        expense_filter = and_(expense_filter, DailyExpense.branch_id == target_branch_id)
    today_sales = db.query(DailySale).filter(sales_filter).all()
    today_items_sold = sum(sale.quantity for sale in today_sales)
    today_revenue = sum(sale.revenue for sale in today_sales)
    today_expenses = db.query(DailyExpense).filter(expense_filter).all()
    total_expenses = sum(expense.total_amount for expense in today_expenses)
    net_profit = today_revenue - total_expenses
    # Expense breakdown
    expense_breakdown = {}
    for expense in today_expenses:
        if expense.category not in expense_breakdown:
            expense_breakdown[expense.category] = 0
        expense_breakdown[expense.category] += expense.total_amount
    expense_breakdown_list = [{"category": cat, "amount": round(amount, 2)} for cat, amount in expense_breakdown.items()]
    # Pending orders
    orders_query = db.query(Order).filter(Order.status.in_(["pending", "preparing"]))
    if target_branch_id:
        orders_query = orders_query.filter(Order.branch_id == target_branch_id)
    pending_orders_count = orders_query.count()
    # Low stock items
    inventory_query = db.query(Inventory).filter(Inventory.current_stock <= Inventory.minimum_threshold)
    if target_branch_id:
        inventory_query = inventory_query.filter(Inventory.branch_id == target_branch_id)
    low_stock_count = inventory_query.count()
    # Top selling items last 7 days
    week_ago = today - timedelta(days=7)
    top_items_query = db.query(
        DailySale.menu_item_id,
        func.sum(DailySale.quantity).label('total_quantity'),
        func.sum(DailySale.revenue).label('total_revenue')
    ).filter(func.date(DailySale.sale_date) >= week_ago)
    if target_branch_id:
        top_items_query = top_items_query.filter(DailySale.branch_id == target_branch_id)
    top_items = top_items_query.group_by(DailySale.menu_item_id).order_by(func.sum(DailySale.quantity).desc()).limit(5).all()
    top_selling_items = []
    for item_sale in top_items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == item_sale.menu_item_id).first()
        if menu_item:
            top_selling_items.append({"name": menu_item.name, "quantity_sold": item_sale.total_quantity, "revenue": round(item_sale.total_revenue, 2)})
    # Recent orders
    recent_orders_query = db.query(Order).order_by(Order.created_at.desc())
    if target_branch_id:
        recent_orders_query = recent_orders_query.filter(Order.branch_id == target_branch_id)
    recent_orders = recent_orders_query.limit(5).all()
    return {
        "branch_id": target_branch_id,
        "today_sales": today_items_sold,
        "today_revenue": round(today_revenue, 2),
        "today_expenses": round(total_expenses, 2),
        "net_profit": round(net_profit, 2),
        "pending_orders": pending_orders_count,
        "low_stock_items": low_stock_count,
        "top_selling_items": top_selling_items,
        "recent_orders": recent_orders,
        "expense_breakdown": expense_breakdown_list
    }

# -------------------------
# INVENTORY
# -------------------------
@app.get("/api/inventory", response_model=List[InventoryResponse])
async def get_inventory_enhanced(
    branch_id: Optional[int] = None,
    low_stock_only: bool = False,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    query = db.query(Inventory)
    if hasattr(current_user, 'role') and current_user.role == UserRole.WORKER and current_user.branch_id:
        query = query.filter(Inventory.branch_id == current_user.branch_id)
    elif branch_id:
        query = query.filter(Inventory.branch_id == branch_id)
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
    db_item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    update_data = item_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)
    db.commit()
    db.refresh(db_item)
    return db_item

# -------------------------
# REPORTS (daily)
# -------------------------
@app.get("/api/reports/daily")
async def get_daily_report(
    branch_id: Optional[int] = None,
    date_filter: Optional[str] = None,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    target_date = date.today()
    if date_filter:
        try:
            target_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    target_branch_id = None
    if hasattr(current_user, 'role') and current_user.role == UserRole.WORKER and current_user.branch_id:
        target_branch_id = current_user.branch_id
    elif branch_id:
        target_branch_id = branch_id
    # Sales data
    sales_query = db.query(DailySale).filter(func.date(DailySale.sale_date) == target_date)
    if target_branch_id:
        sales_query = sales_query.filter(DailySale.branch_id == target_branch_id)
    sales = sales_query.all()
    total_revenue = sum(sale.revenue for sale in sales)
    total_items_sold = sum(sale.quantity for sale in sales)
    # Expenses
    expense_query = db.query(DailyExpense).filter(func.date(DailyExpense.expense_date) == target_date)
    if target_branch_id:
        expense_query = expense_query.filter(DailyExpense.branch_id == target_branch_id)
    expenses = expense_query.all()
    total_expenses = sum(expense.total_amount for expense in expenses)
    # Net profit
    net_profit = total_revenue - total_expenses
    # Branch info
    branch_info = None
    if target_branch_id:
        branch = db.query(Branch).filter(Branch.id == target_branch_id).first()
        if branch:
            branch_info = {"id": branch.id, "name": branch.name, "location": branch.location}
    # Expense categories breakdown
    expense_categories = {}
    for expense in expenses:
        if expense.category not in expense_categories:
            expense_categories[expense.category] = {"category": expense.category, "total_amount": 0, "item_count": 0}
        expense_categories[expense.category]["total_amount"] += expense.total_amount
        expense_categories[expense.category]["item_count"] += 1
    # Top selling items
    item_sales = {}
    for sale in sales:
        if sale.menu_item_id not in item_sales:
            menu_item = db.query(MenuItem).filter(MenuItem.id == sale.menu_item_id).first()
            item_sales[sale.menu_item_id] = {"item_name": menu_item.name if menu_item else "Unknown", "quantity_sold": 0, "revenue": 0}
        item_sales[sale.menu_item_id]["quantity_sold"] += sale.quantity
        item_sales[sale.menu_item_id]["revenue"] += sale.revenue
    top_items = sorted(item_sales.values(), key=lambda x: x["quantity_sold"], reverse=True)[:5]
    return {
        "date": target_date.strftime("%Y-%m-%d"),
        "branch": branch_info,
        "sales_summary": {"total_revenue": round(total_revenue, 2), "total_items_sold": total_items_sold, "top_selling_items": top_items},
        "expense_summary": {"total_expenses": round(total_expenses, 2), "expense_count": len(expenses), "category_breakdown": list(expense_categories.values())},
        "profit_analysis": {"gross_profit": round(total_revenue, 2), "total_expenses": round(total_expenses, 2), "net_profit": round(net_profit, 2), "profit_margin": round((net_profit / total_revenue * 100) if total_revenue > 0 else 0, 2)}
    }

# -------------------------
# WORKER-SPECIFIC (read-only) endpoints
# -------------------------
@app.get("/api/worker/dashboard")
async def get_worker_dashboard(
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == UserRole.WORKER):
        raise HTTPException(status_code=403, detail="Worker access required")
    if not current_user.branch_id:
        raise HTTPException(status_code=403, detail="Worker must be assigned to a branch")
    return await get_dashboard_data_enhanced(branch_id=current_user.branch_id, db=db, current_user=current_user)

@app.get("/api/worker/sales")
async def get_worker_sales(
    date_filter: Optional[str] = None,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == UserRole.WORKER):
        raise HTTPException(status_code=403, detail="Worker access required")
    return await get_sales_enhanced(branch_id=current_user.branch_id, date_filter=date_filter, db=db, current_user=current_user)

@app.get("/api/worker/expenses")
async def get_worker_expenses(
    date: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == UserRole.WORKER):
        raise HTTPException(status_code=403, detail="Worker access required")
    return await get_expenses(branch_id=current_user.branch_id, date=date, category=category, db=db, current_user=current_user)

# -------------------------
# ADMIN: User management
# -------------------------
@app.get("/api/admin/users", response_model=List[AdminResponse])
async def get_all_users(
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Admin access required")
    users = db.query(Admin).all()
    return users

@app.post("/api/admin/users", response_model=AdminResponse)
async def create_user(
    user: AdminCreate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Admin access required")
    existing_user = db.query(Admin).filter((Admin.username == user.username) | (Admin.email == user.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    hashed_password = get_password_hash(user.password)
    db_user = Admin(username=user.username, email=user.email, full_name=user.full_name, password_hash=hashed_password, role=user.role, branch_id=user.branch_id)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.put("/api/admin/users/{user_id}", response_model=AdminResponse)
async def update_user(
    user_id: int,
    user_update: AdminResponse,  # reuse response schema for update body shape loosely; you can change to AdminUpdate schema if available
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Admin access required")
    db_user = db.query(Admin).filter(Admin.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "password":
            continue
        setattr(db_user, field, value)
    db.commit()
    db.refresh(db_user)
    return db_user

# -------------------------
# Manual automation triggers
# -------------------------
@app.post("/api/admin/export-sales")
async def trigger_sales_export(current_user: Admin = Depends(get_current_active_user)):
    try:
        await manual_export_sales()
        return {"message": "Sales export completed successfully"}
    except Exception as e:
        logger.exception("Export failed")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@app.post("/api/admin/daily-reset")
async def trigger_daily_reset(current_user: Admin = Depends(get_current_active_user)):
    try:
        await manual_reset()
        return {"message": "Daily reset completed successfully"}
    except Exception as e:
        logger.exception("Daily reset failed")
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")

# -------------------------
# Categories endpoint
# -------------------------
@app.get("/api/categories")
async def get_categories(db: Session = Depends(get_database)):
    categories = db.query(MenuItem.category).filter(MenuItem.category.isnot(None), MenuItem.is_available == True).distinct().all()
    return [cat[0] for cat in categories if cat[0]]

# -------------------------
# Run the server
# -------------------------
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=os.getenv("ENVIRONMENT") == "development")
