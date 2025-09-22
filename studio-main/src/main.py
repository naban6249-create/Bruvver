# main.py - Complete merged version with multi-branch, expenses, worker APIs, enhanced auth & upload
from fastapi import FastAPI, HTTPException, Depends, status, File, UploadFile, Form, Body, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, text
from datetime import datetime, date, timedelta
from typing import List, Optional
from pydantic import BaseModel
import uvicorn
import os
from dotenv import load_dotenv
import shutil
import json
import logging
from apscheduler.schedulers.background import BackgroundScheduler
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
    Branch, DailyExpense, ExpenseCategory, UserBranchPermission, PermissionLevel
)
from schemas import (
    UserRole,  # 👈 FIX: import from schemas, not models
    MenuItemUpdate, MenuItemResponse,
    DailySaleCreate, DailySaleResponse, SalesSummary,
    AdminCreate, AdminLogin, AdminResponse, AdminUpdate, Token,
    OrderCreate, OrderResponse, OrderUpdate,
    InventoryCreate, InventoryResponse, InventoryUpdate,
    DashboardSummary, IngredientResponse, IngredientUpdate,
    BranchResponse, BranchCreate, BranchUpdate,
    DailyExpenseResponse, DailyExpenseCreate, DailyExpenseUpdate,
    ExpenseCategoryResponse, QuickExpenseCreate,
    UserPermissionSummary, UserBranchPermissionCreate,  # ✅ This was missing!
    UserBranchPermissionResponse,  # ✅ Add this too
    UserBranchPermissionBase,# Added UserPermissionSummary
)
from sqlalchemy import func, and_

from auth import (
    authenticate_user, create_access_token, get_current_active_user,
    get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
)
from automation import start_automation, stop_automation, manual_export_sales, manual_reset
from sheets_exporter import export_day

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
    # Start daily export scheduler (runs at 00:05 local time, exports yesterday)
    try:
        start_daily_export_scheduler()
    except Exception:
        logger.exception("Failed to start daily export scheduler")
    # Best-effort catch-up run on startup (idempotent export clears date rows first)
    try:
        export_yesterday_job()
    except Exception:
        logger.exception("Failed to perform catch-up export on startup")

@app.on_event("shutdown")
async def shutdown_event():
    """Stop automation services"""
    try:
        stop_automation()
    except Exception:
        logger.exception("Failed to stop automation service on shutdown.")
    try:
        if 'daily_export_scheduler' in globals():
            daily_export_scheduler.shutdown(wait=False)
    except Exception:
        logger.exception("Failed to shutdown daily export scheduler")

# -------------------------
# GOOGLE SHEETS DAILY EXPORT
# -------------------------
# Scheduler is started on app startup. Exports "yesterday" so a full day is captured.
daily_export_scheduler: Optional[BackgroundScheduler] = None

def export_yesterday_job():
    db = next(get_database())
    try:
        yday = date.today() - timedelta(days=1)
        export_day(db, yday, branch_id=None)
        logger.info(f"Exported daily sales/expenses for {yday} to Google Sheets")
    except Exception:
        logger.exception("Daily export job failed")
    finally:
        db.close()

def start_daily_export_scheduler():
    global daily_export_scheduler
    if daily_export_scheduler and daily_export_scheduler.running:
        return
    tz = os.getenv("TZ", "Asia/Kolkata")
    # Coalesce: if multiple runs pile up while down, run once
    # misfire_grace_time: allow late executions after downtime (24h)
    daily_export_scheduler = BackgroundScheduler(
        timezone=tz,
        job_defaults={
            'coalesce': True,
            'misfire_grace_time': 24 * 60 * 60,
        },
    )
    # Run daily at 00:05
    daily_export_scheduler.add_job(
        export_yesterday_job,
        'cron',
        hour=0,
        minute=5,
        id='export_yesterday',
        replace_existing=True,
        coalesce=True,
        misfire_grace_time=24 * 60 * 60,
    )
    daily_export_scheduler.start()

class ManualExportRequest(BaseModel):
    date: str  # YYYY-MM-DD
    branch_id: Optional[int] = None

@app.post("/api/reports/export-to-sheets")
def manual_export_to_sheets(req: ManualExportRequest, db: Session = Depends(get_database), current_user: Admin = Depends(get_current_active_user)):
    # Optional: require admin
    if hasattr(current_user, 'role') and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    try:
        target_date = datetime.strptime(req.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    try:
        export_day(db, target_date, branch_id=req.branch_id)
        return {"message": "Export completed", "date": req.date, "branch_id": req.branch_id}
    except Exception as e:
        logger.exception("Manual export failed")
        raise HTTPException(status_code=500, detail=str(e))

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
                    password_hash=hashed_password,
                    role="admin",
                    is_active=True,
                    is_superuser=True,
                )
                db.add(db_admin)
                logger.info("Created default admin user admin@test.com / testpassword (role=admin)")

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
    if hasattr(current_user, 'role') and current_user.role != "admin":
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
    if hasattr(current_user, 'role') and current_user.role != "admin":
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
    if hasattr(current_user, 'role') and current_user.role != "admin":
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
    if hasattr(current_user, 'role') and current_user.role != "admin":
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
    # Branch filtering and permission check for workers
    if hasattr(current_user, 'role') and current_user.role == "worker":
        # Fetch branches this user has any permission for
        user_branch_ids = [
            b.branch_id for b in db.query(UserBranchPermission).filter(
                UserBranchPermission.user_id == current_user.id
            ).all()
        ]
        if branch_id is not None:
            if branch_id not in user_branch_ids:
                raise HTTPException(status_code=403, detail="No access to this branch")
            query = query.filter(DailyExpense.branch_id == branch_id)
        else:
            if not user_branch_ids:
                raise HTTPException(status_code=403, detail="No branch permissions assigned")
            query = query.filter(DailyExpense.branch_id.in_(user_branch_ids))
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
    # Ensure created_at is a valid datetime for response validation
    from datetime import datetime as _dt
    for exp in expenses:
        if getattr(exp, "created_at", None) is None:
            # Prefer expense_date if present, otherwise now
            setattr(exp, "created_at", getattr(exp, "expense_date", None) or _dt.utcnow())
    return expenses

@app.post("/api/expenses", response_model=DailyExpenseResponse)
async def create_expense(
    expense: DailyExpenseCreate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Create a new daily expense"""
    # Worker permission restriction: must have FULL_ACCESS for this branch
    if hasattr(current_user, 'role') and current_user.role == "worker":
        perm = db.query(UserBranchPermission).filter(
            UserBranchPermission.user_id == current_user.id,
            UserBranchPermission.branch_id == expense.branch_id
        ).first()
        if not perm:
            raise HTTPException(status_code=403, detail="No access to this branch")
        pl = getattr(perm, "permission_level", None)
        if hasattr(pl, "value"):
            pl = pl.value
        if pl != "full_access":
            raise HTTPException(status_code=403, detail="Insufficient permissions for this branch")
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
    # Worker permission restriction: must have FULL_ACCESS for this branch
    if hasattr(current_user, 'role') and current_user.role == "worker":
        perm = db.query(UserBranchPermission).filter(
            UserBranchPermission.user_id == current_user.id,
            UserBranchPermission.branch_id == expense_data.branch_id
        ).first()
        if not perm:
            raise HTTPException(status_code=403, detail="No access to this branch")
        pl = getattr(perm, "permission_level", None)
        if hasattr(pl, "value"):
            pl = pl.value
        if pl != "full_access":
            raise HTTPException(status_code=403, detail="Insufficient permissions for this branch")

    # 1. Find the inventory item to get its cost
    # We assume an inventory item exists with the same name (e.g., "Milk")
    inventory_item = db.query(Inventory).filter(
        func.lower(Inventory.item_name) == func.lower(expense_data.item_name),
        Inventory.branch_id == expense_data.branch_id
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
    # Permissions for worker: require FULL_ACCESS for the branch
    if hasattr(current_user, 'role') and current_user.role == "worker":
        perm = db.query(UserBranchPermission).filter(
            UserBranchPermission.user_id == current_user.id,
            UserBranchPermission.branch_id == db_expense.branch_id
        ).first()
        if not perm:
            raise HTTPException(status_code=403, detail="No access to this branch")
        pl = getattr(perm, "permission_level", None)
        if hasattr(pl, "value"):
            pl = pl.value
        if pl != "full_access":
            raise HTTPException(status_code=403, detail="Insufficient permissions for this branch")
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
    if hasattr(current_user, 'role') and current_user.role == "worker":
        perm = db.query(UserBranchPermission).filter(
            UserBranchPermission.user_id == current_user.id,
            UserBranchPermission.branch_id == db_expense.branch_id
        ).first()
        if not perm:
            raise HTTPException(status_code=403, detail="No access to this branch")
        pl = getattr(perm, "permission_level", None)
        if hasattr(pl, "value"):
            pl = pl.value
        if pl != "full_access":
            raise HTTPException(status_code=403, detail="Insufficient permissions for this branch")
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
    if hasattr(current_user, 'role') and current_user.role == "worker" and current_user.branch_id:
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
    admin = authenticate_user(db, username=form_data.username, password=form_data.password)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Load branch permissions
    permissions = db.query(UserBranchPermission).filter(UserBranchPermission.user_id == admin.id).all()
    
    user_data = {
        "id": admin.id,
        "username": admin.username,
        "email": admin.email,
        "full_name": admin.full_name,
        "role": admin.role,
        "is_active": admin.is_active,
        "is_superuser": admin.is_superuser,
        "created_at": admin.created_at,
        "branch_permissions": permissions
    }

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin.username, "role": user_data["role"]},
        expires_delta=access_token_expires
    )

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
# PERMISSION MANAGEMENT
# (Consolidated definitions are located later in this file.)
# -------------------------
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
    if current_user and hasattr(current_user, 'role') and current_user.role == "worker" and current_user.branch_id:
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
# UTILITIES FOR SEEDING/MAINTENANCE (service key protected)
# -------------------------
@app.post("/api/dev/seed-branch-menu")
async def seed_branch_menu(
    request: Request,
    branch_id: int = Body(1, embed=True),
    make_available: bool = Body(True, embed=True),
    db: Session = Depends(get_database),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
):
    """Assign existing sample menu items to a branch and ensure availability.

    Auth: Requires X-API-Key matching SERVICE_API_KEY.
    """
    service_key = os.getenv("SERVICE_API_KEY")
    if not (service_key and x_api_key and x_api_key == service_key):
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Ensure branch exists (create if missing)
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        branch = Branch(id=branch_id, name="Coimbatore", is_active=True)
        db.add(branch)
        db.flush()

    # Assign unassigned items to this branch and optionally mark available
    updated = 0
    items = db.query(MenuItem).all()
    for it in items:
        changed = False
        if getattr(it, "branch_id", None) in (None, 0):
            it.branch_id = branch_id
            changed = True
        if make_available and getattr(it, "is_available", None) is not True:
            it.is_available = True
            changed = True
        if changed:
            updated += 1
            db.add(it)
    db.commit()
    return {"updated_items": updated, "branch_id": branch_id}

# -------------------------
# BRANCH-SCOPED MENU ENDPOINTS
# -------------------------
# Add this updated endpoint to your main.py file (replace the existing one)

@app.get("/api/branches/{branch_id}/menu", response_model=List[MenuItemResponse])
async def get_branch_menu(
    request: Request,
    branch_id: int,
    category: Optional[str] = None,
    available_only: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_database),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    """
    Public read with service key: If X-API-Key matches SERVICE_API_KEY (env), allow access without JWT.
    Otherwise, require valid Bearer JWT in Authorization header.
    """
    service_key = os.getenv("SERVICE_API_KEY")
    authorized = False

    # Debug logging
    logger.info(f"Service key from env: {'SET' if service_key else 'NOT SET'}")
    logger.info(f"X-API-Key header: {'PROVIDED' if x_api_key else 'NOT PROVIDED'}")
    logger.info(f"Authorization header: {'PROVIDED' if authorization else 'NOT PROVIDED'}")

    # 1) Service key bypass for public read
    if service_key and x_api_key:
        if x_api_key == service_key:
            authorized = True
            logger.info("Authorized via X-API-Key")
        else:
            logger.warning("X-API-Key provided but doesn't match SERVICE_API_KEY")

    # 2) Fallback to JWT Authorization: Bearer <token>
    if not authorized and authorization and authorization.lower().startswith("bearer "):
        try:
            token = authorization.split(" ", 1)[1]
            from auth import verify_token, get_user  # local import to avoid cycles
            token_data = verify_token(token, HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            ))
            user = get_user(db, username=token_data.username)
            if user and getattr(user, "is_active", True):
                authorized = True
                logger.info("Authorized via JWT token")
        except HTTPException:
            logger.warning("JWT token validation failed")
        except Exception as e:
            logger.error(f"JWT token validation error: {e}")

    if not authorized:
        logger.error("Authentication failed - no valid X-API-Key or JWT token")
        raise HTTPException(
            status_code=401, 
            detail="Authentication required. Provide X-API-Key or Authorization header."
        )

    # Verify branch exists
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    # Query items
    query = db.query(MenuItem).filter(MenuItem.branch_id == branch_id)
    if available_only:
        query = query.filter(MenuItem.is_available == True)
    if category:
        query = query.filter(MenuItem.category == category)
    
    items = query.offset(skip).limit(limit).all()
    logger.info(f"Returning {len(items)} menu items for branch {branch_id}")
    return items

@app.post("/api/branches/{branch_id}/menu", response_model=MenuItemResponse)
async def create_branch_menu_item(
    branch_id: int,
    name: str = Form(...),
    price: float = Form(...),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    is_available: bool = Form(True),
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

@app.put("/api/branches/{branch_id}/menu/{item_id}", response_model=MenuItemResponse)
async def update_branch_menu_item(
    branch_id: int,
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
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.branch_id == branch_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found for this branch")
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
        return db_item
    except Exception:
        db.rollback()
        logger.exception("Error updating branch menu item")
        raise HTTPException(status_code=500, detail="Internal Server Error during item update.")

@app.delete("/api/branches/{branch_id}/menu/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_branch_menu_item(
    branch_id: int,
    item_id: str,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.branch_id == branch_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found for this branch")
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
    """Get sales with proper branch filtering"""
    query = db.query(DailySale)
    # Workers: must be restricted to their assigned branch
    if hasattr(current_user, 'role') and current_user.role == "worker":
        if not current_user.branch_id:
            raise HTTPException(status_code=403, detail="Worker must be assigned to a branch")
        query = query.filter(DailySale.branch_id == current_user.branch_id)
    elif branch_id:
        # Admins can optionally filter by branch_id
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
    if hasattr(current_user, 'role') and current_user.role == "worker" and current_user.branch_id:
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
# BRANCH-SCOPED SALES ENDPOINTS
# -------------------------
@app.get("/api/branches/{branch_id}/daily-sales", response_model=List[DailySaleResponse])
async def get_branch_daily_sales(
    branch_id: int,
    date_filter: Optional[str] = None,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Get daily sales for a specific branch"""
    # Permission check for workers: must have any permission for this branch
    if hasattr(current_user, 'role') and current_user.role == "worker":
        has_perm = db.query(UserBranchPermission).filter(
            UserBranchPermission.user_id == current_user.id,
            UserBranchPermission.branch_id == branch_id
        ).first()
        if not has_perm:
            raise HTTPException(status_code=403, detail="No access to this branch")

    query = db.query(DailySale).filter(DailySale.branch_id == branch_id)
    if date_filter:
        try:
            filter_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            query = query.filter(func.date(DailySale.sale_date) == filter_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        # Default to today if no date specified
        today = date.today()
        query = query.filter(func.date(DailySale.sale_date) == today)
    return query.order_by(DailySale.sale_date.desc()).all()

@app.put("/api/branches/{branch_id}/daily-sales/{item_id}", response_model=DailySaleResponse)
async def set_branch_daily_sale_quantity(
    branch_id: int,
    item_id: int,
    quantity: int = Form(...),
    date_filter: Optional[str] = Form(None),
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Set/update daily sales quantity for a specific branch and item"""
    # Permission check for workers: must have FULL_ACCESS for this branch
    if hasattr(current_user, 'role') and current_user.role == "worker":
        perm = db.query(UserBranchPermission).filter(
            UserBranchPermission.user_id == current_user.id,
            UserBranchPermission.branch_id == branch_id
        ).first()
        if not perm:
            raise HTTPException(status_code=403, detail="No access to this branch")
        # Normalize to string for comparison in case of enum instance
        pl = getattr(perm, "permission_level", None)
        if hasattr(pl, "value"):
            pl = pl.value
        if pl != "full_access":
            raise HTTPException(status_code=403, detail="Insufficient permissions for this branch")

    # Verify menu item exists for this branch
    menu_item = db.query(MenuItem).filter(
        MenuItem.id == item_id,
        MenuItem.branch_id == branch_id
    ).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found for this branch")

    if quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot be negative")

    revenue = float(menu_item.price) * int(quantity)
    # Determine target date for upsert (default to server today; allow explicit override)
    target_date = date.today()
    if date_filter:
        try:
            target_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Upsert: update existing sale for today or create new
    existing_sale = db.query(DailySale).filter(
        DailySale.menu_item_id == item_id,
        DailySale.branch_id == branch_id,
        func.date(DailySale.sale_date) == target_date
    ).first()

    if existing_sale:
        existing_sale.quantity = quantity
        existing_sale.revenue = revenue
        db.commit()
        db.refresh(existing_sale)
        return existing_sale
    else:
        # When creating a new record, set sale_date to the target_date with current time
        db_sale = DailySale(
            menu_item_id=item_id,
            quantity=quantity,
            revenue=revenue,
            branch_id=branch_id,
            sale_date=datetime.combine(target_date, datetime.now().time())
        )
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
    """Get dashboard data with proper branch isolation"""
    today = date.today()
    target_branch_id = None
    if hasattr(current_user, 'role') and current_user.role == "worker":
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
    if hasattr(current_user, 'role') and current_user.role == "worker" and current_user.branch_id:
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
    if hasattr(current_user, 'role') and current_user.role == "worker" and current_user.branch_id:
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
# REPORTS: Real sales summary (day/week/month)
# -------------------------
@app.get("/api/reports/sales-summary")
async def get_sales_summary(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Return real totals for today, last 7 days, and month-to-date.
    Filters by the user's branch if worker; otherwise optional branch_id.
    """
    # Determine scope
    target_branch_id = None
    if hasattr(current_user, 'role') and current_user.role == "worker" and current_user.branch_id:
        target_branch_id = current_user.branch_id
    elif branch_id:
        target_branch_id = branch_id

    today = date.today()
    week_start = today - timedelta(days=6)  # last 7 days inclusive
    month_start = today.replace(day=1)      # month-to-date

    def compute_range(start_d: date, end_d: date):
        q = db.query(
            func.coalesce(func.sum(DailySale.quantity), 0).label("items"),
            func.coalesce(func.sum(DailySale.revenue), 0.0).label("revenue"),
        ).filter(func.date(DailySale.sale_date) >= start_d, func.date(DailySale.sale_date) <= end_d)
        if target_branch_id:
            q = q.filter(DailySale.branch_id == target_branch_id)
        row = q.one()
        return {
            "total_items_sold": int(row.items or 0),
            "total_revenue": round(float(row.revenue or 0.0), 2),
        }

    # Today's per-item breakdown (highest to lowest)
    item_rows = db.query(
        DailySale.menu_item_id,
        func.coalesce(func.sum(DailySale.quantity), 0).label("qty"),
        func.coalesce(func.sum(DailySale.revenue), 0.0).label("rev"),
    ).filter(func.date(DailySale.sale_date) == today)
    if target_branch_id:
        item_rows = item_rows.filter(DailySale.branch_id == target_branch_id)
    item_rows = item_rows.group_by(DailySale.menu_item_id).order_by(func.sum(DailySale.quantity).desc()).all()

    today_items = []
    for r in item_rows:
        mi = db.query(MenuItem).filter(MenuItem.id == r.menu_item_id).first()
        if mi:
            today_items.append({
                "item_id": mi.id,
                "name": mi.name,
                "quantity_sold": int(r.qty or 0),
                "revenue": round(float(r.rev or 0.0), 2),
            })

    # Week per-item breakdown (last 7 days inclusive)
    week_rows = db.query(
        DailySale.menu_item_id,
        func.coalesce(func.sum(DailySale.quantity), 0).label("qty"),
        func.coalesce(func.sum(DailySale.revenue), 0.0).label("rev"),
    ).filter(func.date(DailySale.sale_date) >= week_start, func.date(DailySale.sale_date) <= today)
    if target_branch_id:
        week_rows = week_rows.filter(DailySale.branch_id == target_branch_id)
    week_rows = week_rows.group_by(DailySale.menu_item_id).order_by(func.sum(DailySale.quantity).desc()).all()

    week_items = []
    for r in week_rows:
        mi = db.query(MenuItem).filter(MenuItem.id == r.menu_item_id).first()
        if mi:
            week_items.append({
                "item_id": mi.id,
                "name": mi.name,
                "quantity_sold": int(r.qty or 0),
                "revenue": round(float(r.rev or 0.0), 2),
            })

    # Month per-item breakdown (month-to-date)
    month_rows = db.query(
        DailySale.menu_item_id,
        func.coalesce(func.sum(DailySale.quantity), 0).label("qty"),
        func.coalesce(func.sum(DailySale.revenue), 0.0).label("rev"),
    ).filter(func.date(DailySale.sale_date) >= month_start, func.date(DailySale.sale_date) <= today)
    if target_branch_id:
        month_rows = month_rows.filter(DailySale.branch_id == target_branch_id)
    month_rows = month_rows.group_by(DailySale.menu_item_id).order_by(func.sum(DailySale.quantity).desc()).all()

    month_items = []
    for r in month_rows:
        mi = db.query(MenuItem).filter(MenuItem.id == r.menu_item_id).first()
        if mi:
            month_items.append({
                "item_id": mi.id,
                "name": mi.name,
                "quantity_sold": int(r.qty or 0),
                "revenue": round(float(r.rev or 0.0), 2),
            })

    return {
        "branch_id": target_branch_id,
        "day": compute_range(today, today),
        "week": compute_range(week_start, today),
        "month": compute_range(month_start, today),
        "today_items": today_items,
        "week_items": week_items,
        "month_items": month_items,
    }

# -------------------------
# REPORTS: Real expense summary (day/week/month)
# -------------------------
@app.get("/api/reports/expense-summary")
async def get_expense_summary(
    branch_id: Optional[int] = None,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Return real expense totals for today, last 7 days, and month-to-date."""
    # Scope branch
    target_branch_id = None
    if hasattr(current_user, 'role') and current_user.role == "worker" and current_user.branch_id:
        target_branch_id = current_user.branch_id
    elif branch_id:
        target_branch_id = branch_id

    today = date.today()
    week_start = today - timedelta(days=6)
    month_start = today.replace(day=1)

    def compute_expense_range(start_d: date, end_d: date):
        q = db.query(
            func.coalesce(func.sum(DailyExpense.total_amount), 0.0).label("total"),
            func.count(DailyExpense.id).label("count"),
        ).filter(func.date(DailyExpense.expense_date) >= start_d, func.date(DailyExpense.expense_date) <= end_d)
        if target_branch_id:
            q = q.filter(DailyExpense.branch_id == target_branch_id)
        row = q.one()
        return {
            "total_expenses": round(float(row.total or 0.0), 2),
            "expense_count": int(row.count or 0),
        }

    return {
        "branch_id": target_branch_id,
        "day": compute_expense_range(today, today),
        "week": compute_expense_range(week_start, today),
        "month": compute_expense_range(month_start, today),
    }

# -------------------------
# WORKER-SPECIFIC (read-only) endpoints
# -------------------------
@app.get("/api/worker/dashboard")
async def get_worker_dashboard(
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == "worker"):
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
    if not (hasattr(current_user, 'role') and current_user.role == "worker"):
        raise HTTPException(status_code=403, detail="Worker access required")
    return await get_sales_enhanced(branch_id=current_user.branch_id, date_filter=date_filter, db=db, current_user=current_user)

@app.get("/api/worker/expenses")
async def get_worker_expenses(
    date: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == "worker"):
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
    """Get all users with their permissions loaded"""
    if not (hasattr(current_user, 'role') and current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    users = db.query(Admin).all()
    # Load permissions for each user
    for user in users:
        user.branch_permissions = db.query(UserBranchPermission).filter(
            UserBranchPermission.user_id == user.id
        ).all()
    return users

@app.get("/api/admin/users-lite")
async def get_all_users_lite(
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Return minimal user info (id, username, email, full_name) for admin UI prefill.
    This avoids strict Pydantic validation on nested relations.
    """
    if not (hasattr(current_user, 'role') and current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    rows = db.query(Admin).all()
    result = []
    for u in rows:
        result.append({
            "id": getattr(u, "id", None),
            "username": getattr(u, "username", None) or "",
            "email": getattr(u, "email", None) or "",
            "full_name": getattr(u, "full_name", None) or "",
        })
    return result

@app.get("/api/admin/user-permissions", response_model=List[UserPermissionSummary])
async def get_all_user_permissions(
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Get comprehensive user permissions summary"""
    if not (hasattr(current_user, 'role') and current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        # Local imports to avoid circular issues during app import
        from schemas import (
            UserPermissionSummary as UPS,
            UserBranchPermissionResponse as UBPR,
            BranchResponse as BRR,
            PermissionLevel as SPermissionLevel,
        )

        # Get all worker users
        users = db.query(Admin).filter(Admin.role == "worker").all()
        summaries: List[UPS] = []
        for user in users:
            permissions = db.query(UserBranchPermission).filter(
                UserBranchPermission.user_id == user.id
            ).all()

            branches: List[UBPR] = []
            for perm in permissions:
                branch = db.query(Branch).filter(Branch.id == perm.branch_id).first()
                # Normalize permission_level to schemas enum
                pl = getattr(perm, "permission_level", None)
                if hasattr(pl, "value"):
                    pl = pl.value
                try:
                    ple = SPermissionLevel(pl) if pl is not None else SPermissionLevel.VIEW_ONLY
                except Exception:
                    # Fallback: coerce invalid values to VIEW_ONLY
                    ple = SPermissionLevel.VIEW_ONLY

                # Build BranchResponse manually to avoid from_orm dependency on orm_mode
                if branch:
                    from datetime import datetime as _dt
                    branch_resp = BRR(
                        id=getattr(branch, "id", None),
                        name=getattr(branch, "name", None) or "",
                        location=getattr(branch, "location", None),
                        address=getattr(branch, "address", None),
                        phone=getattr(branch, "phone", None),
                        email=getattr(branch, "email", None),
                        is_active=getattr(branch, "is_active", True),
                        created_at=getattr(branch, "created_at", None) or _dt.utcnow(),
                        updated_at=getattr(branch, "updated_at", None) or _dt.utcnow(),
                    )
                else:
                    branch_resp = None
                from datetime import datetime as _dt
                branches.append(UBPR(
                    id=getattr(perm, "id", None),
                    user_id=getattr(perm, "user_id", None),
                    branch_id=getattr(perm, "branch_id", None),
                    permission_level=ple,  # pydantic will serialize properly
                    created_at=getattr(perm, "created_at", None) or _dt.utcnow(),
                    updated_at=getattr(perm, "updated_at", None) or _dt.utcnow(),
                    branch=branch_resp,
                ))

            summaries.append(UPS(
                user_id=getattr(user, "id", None),
                username=getattr(user, "username", None) or "",
                full_name=getattr(user, "full_name", None) or "",
                branches=branches,
            ))
        return summaries
    except Exception as e:
        logger.exception("Error building user-permissions response")
        raise HTTPException(status_code=500, detail="Failed to fetch user permissions")

@app.post("/api/admin/assign-branch-permission")
async def assign_branch_permission(
    payload: dict = Body(...),
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    try:
        user_id = int(payload.get("user_id"))
        branch_id = int(payload.get("branch_id"))
        permission_level = str(payload.get("permission_level"))
        if permission_level not in ("view_only", "full_access"):
            raise HTTPException(status_code=400, detail="Invalid permission_level")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")

    existing = db.query(UserBranchPermission).filter(
        UserBranchPermission.user_id == user_id,
        UserBranchPermission.branch_id == branch_id
    ).first()

    if existing:
        existing.permission_level = permission_level
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    new_perm = UserBranchPermission(user_id=user_id, branch_id=branch_id, permission_level=permission_level)
    db.add(new_perm)
    db.commit()
    db.refresh(new_perm)
    return new_perm

@app.delete("/api/admin/revoke-branch-permission/{user_id}/{branch_id}")
async def revoke_branch_permission(
    user_id: int,
    branch_id: int,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    perm = db.query(UserBranchPermission).filter(
        UserBranchPermission.user_id == user_id,
        UserBranchPermission.branch_id == branch_id
    ).first()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")
    db.delete(perm)
    db.commit()
    return {"detail": "Permission revoked"}

# Utility endpoint to normalize legacy enum values. Admin only.
from sqlalchemy import text

@app.post("/api/admin/normalize-permissions")
async def normalize_permissions(
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    try:
        updated = 0
        r1 = db.execute(text("""
            UPDATE user_branch_permissions
            SET permission_level = 'view_only'
            WHERE permission_level = 'VIEW_ONLY'
        """))
        updated += r1.rowcount if r1.rowcount is not None else 0
        r2 = db.execute(text("""
            UPDATE user_branch_permissions
            SET permission_level = 'full_access'
            WHERE permission_level = 'FULL_ACCESS'
        """))
        updated += r2.rowcount if r2.rowcount is not None else 0
        r3 = db.execute(text("""
            UPDATE user_branch_permissions
            SET permission_level = 'view_only'
            WHERE permission_level NOT IN ('view_only','full_access') OR permission_level IS NULL
        """))
        updated += r3.rowcount if r3.rowcount is not None else 0
        db.commit()
        # Verify
        rows = db.execute(text("SELECT DISTINCT permission_level FROM user_branch_permissions")).fetchall()
        values = [row[0] for row in rows]
        return {"updated_rows": updated, "distinct_values": values}
    except Exception as e:
        db.rollback()
        logger.exception("Failed to normalize permissions")
        raise HTTPException(status_code=500, detail=f"Failed to normalize permissions: {e}")

# Grant a worker full access to ALL branches (creates/updates permissions per branch)
@app.post("/api/admin/grant-all-branches-full-access/{user_id}")
async def grant_all_branches_full_access(
    user_id: int,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    branches = db.query(Branch).filter(Branch.is_active == True).all()
    updated = 0
    for br in branches:
        perm = db.query(UserBranchPermission).filter(
            UserBranchPermission.user_id == user_id,
            UserBranchPermission.branch_id == br.id
        ).first()
        if perm:
            perm.permission_level = PermissionLevel.FULL_ACCESS
            updated += 1
        else:
            db.add(UserBranchPermission(user_id=user_id, branch_id=br.id, permission_level=PermissionLevel.FULL_ACCESS))
            updated += 1
    db.commit()
    return {"updated": updated}

# Limit a worker to a single branch (removes other permissions, keeps full_access on that branch)
@app.post("/api/admin/limit-to-single-branch/{user_id}/{branch_id}")
async def limit_to_single_branch(
    user_id: int,
    branch_id: int,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    # Delete other permissions
    db.query(UserBranchPermission).filter(
        UserBranchPermission.user_id == user_id,
        UserBranchPermission.branch_id != branch_id
    ).delete(synchronize_session=False)
    # Ensure full_access on the selected branch
    perm = db.query(UserBranchPermission).filter(
        UserBranchPermission.user_id == user_id,
        UserBranchPermission.branch_id == branch_id
    ).first()
    if perm:
        perm.permission_level = PermissionLevel.FULL_ACCESS
    else:
        db.add(UserBranchPermission(user_id=user_id, branch_id=branch_id, permission_level=PermissionLevel.FULL_ACCESS))
    db.commit()
    return {"limited_to_branch_id": branch_id}

@app.post("/api/admin/users", response_model=AdminResponse)
async def create_user(
    user: AdminCreate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    existing_user = db.query(Admin).filter((Admin.username == user.username) | (Admin.email == user.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    hashed_password = get_password_hash(user.password)
    role_value = getattr(user.role, 'value', user.role)
    db_user = Admin(
        username=user.username,
        email=user.email,
        full_name=user.full_name or user.username,
        password_hash=hashed_password,
        role=role_value,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/api/admin/users/{user_id}/password")
async def set_user_password(
    user_id: int,
    new_password: str,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    db_user = db.query(Admin).filter(Admin.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if not new_password or len(new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    db_user.password_hash = get_password_hash(new_password)
    db.commit()
    return {"message": "Password updated"}

@app.delete("/api/admin/users/{user_id}")
async def delete_user(
    user_id: int,
    hard: bool = False,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    """Delete or deactivate a user.
    - By default performs a soft delete (is_active=False).
    - If hard=True, attempts to permanently delete the user. This may fail if there are dependent rows (e.g., created expenses).
    """
    if not (hasattr(current_user, 'role') and current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    db_user = db.query(Admin).filter(Admin.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if not hard:
        db_user.is_active = False
        db.commit()
        db.refresh(db_user)
        return {"message": "User deactivated"}
    # Hard delete path
    try:
        db.delete(db_user)
        db.commit()
        return {"message": "User deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Hard delete failed: {str(e)}")

@app.put("/api/admin/users/{user_id}", response_model=AdminResponse)
async def update_user(
    user_id: int,
    user_update: AdminUpdate,
    db: Session = Depends(get_database),
    current_user: Admin = Depends(get_current_active_user)
):
    if not (hasattr(current_user, 'role') and current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    db_user = db.query(Admin).filter(Admin.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "password":
            continue
        if field == "role":
            value = getattr(value, 'value', value)
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
