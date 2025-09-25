-- Initialize database with proper settings
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a default admin user if none exists
-- Password: admin123 (hashed with bcrypt)
INSERT INTO admins (username, email, full_name, password_hash, role, is_active, is_superuser, created_at)
SELECT 'admin@coffee.com', 'admin@coffee.com', 'System Administrator', '$2b$12$8QX9ZqPq7YQ5Y8xZ8QX9ZqPq7YQ5Y8xZ8QX9ZqPq7YQ5Y8xZ8QX9ZqPq7YQ5Y8xZ', 'admin', true, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE username = 'admin@coffee.com');
