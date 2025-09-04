# test_main.py
import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database import get_database, Base
from models import MenuItem, Admin
from auth import get_password_hash

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_database] = override_get_db

client = TestClient(app)

@pytest.fixture
def test_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def sample_menu_item(test_db):
    item = MenuItem(
        id="test-1",
        name="Test Coffee",
        price=3.50,
        description="Test coffee item",
        category="hot",
        image_url="https://example.com/test.jpg"
    )
    test_db.add(item)
    test_db.commit()
    return item

@pytest.fixture
def test_admin(test_db):
    admin = Admin(
        username="testadmin",
        email="admin@test.com",
        full_name="Test Admin",
        password_hash=get_password_hash("testpassword"),
        is_active=True
    )
    test_db.add(admin)
    test_db.commit()
    return admin

@pytest.fixture
def auth_headers(test_admin):
    response = client.post("/api/auth/login", json={
        "username": "testadmin",
        "password": "testpassword"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

class TestAPI:
    def test_root_endpoint(self):
        response = client.get("/")
        assert response.status_code == 200
        assert "Coffee Command Center API" in response.json()["message"]

    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

class TestMenu:
    def test_get_menu(self, sample_menu_item):
        response = client.get("/api/menu")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["name"] == "Test Coffee"

    def test_get_menu_item(self, sample_menu_item):
        response = client.get(f"/api/menu/{sample_menu_item.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Coffee"
        assert data["price"] == 3.50

    def test_get_nonexistent_menu_item(self):
        response = client.get("/api/menu/nonexistent")
        assert response.status_code == 404

    def test_create_menu_item(self, auth_headers):
        new_item = {
            "name": "New Test Coffee",
            "price": 4.0,
            "description": "A new test coffee",
            "category": "hot",
            "ingredients": [
                {"name": "Coffee Beans", "quantity": 20, "unit": "g"},
                {"name": "Water", "quantity": 200, "unit": "ml"}
            ]
        }
        
        response = client.post("/api/menu", json=new_item, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Test Coffee"
        assert len(data["ingredients"]) == 2

class TestAuth:
    def test_register_admin(self):
        admin_data = {
            "username": "newadmin",
            "email": "newadmin@test.com",
            "full_name": "New Admin",
            "password": "newpassword123"
        }
        
        response = client.post("/api/auth/register", json=admin_data)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "newadmin"
        assert data["email"] == "newadmin@test.com"

    def test_login_admin(self, test_admin):
        login_data = {
            "username": "testadmin",
            "password": "testpassword"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_credentials(self):
        login_data = {
            "username": "invalid",
            "password": "wrong"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401

    def test_get_current_user(self, auth_headers):
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testadmin"

class TestOrders:
    def test_create_order(self, sample_menu_item):
        order_data = {
            "customer_name": "John Doe",
            "customer_email": "john@example.com",
            "order_type": "dine_in",
            "items": [
                {
                    "menu_item_id": sample_menu_item.id,
                    "quantity": 2,
                    "special_instructions": "Extra hot"
                }
            ]
        }
        
        response = client.post("/api/orders", json=order_data)
        assert response.status_code == 200
        data = response.json()
        assert data["customer_name"] == "John Doe"
        assert data["total_amount"] == 7.0  # 3.50 * 2
        assert len(data["items"]) == 1

    def test_get_orders(self, auth_headers):
        response = client.get("/api/orders", headers=auth_headers)
        assert response.status_code == 200

class TestSales:
    def test_record_sale(self, sample_menu_item, auth_headers):
        sale_data = {
            "menu_item_id": sample_menu_item.id,
            "quantity": 3
        }
        
        response = client.post("/api/sales", json=sale_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["quantity"] == 3
        assert data["revenue"] == 10.5  # 3.50 * 3

    def test_get_sales_summary(self, auth_headers):
        response = client.get("/api/sales/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_items_sold" in data
        assert "total_revenue" in data

# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])