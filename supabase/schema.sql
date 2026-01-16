-- HRD JAYATEMPO Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create departments table
CREATE TABLE departments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    manager_id UUID,
    budget DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create employees table
CREATE TABLE employees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100) NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on-leave', 'terminated')),
    join_date DATE NOT NULL,
    salary DECIMAL(15,2) NOT NULL,
    bank_account VARCHAR(50),
    bank VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(255) UNIQUE,
    address TEXT,
    emergency_contact VARCHAR(255),
    sales_target DECIMAL(15,2) DEFAULT 0,
    sales_achieved DECIMAL(15,2) DEFAULT 0,
    attendance_score INTEGER DEFAULT 100 CHECK (attendance_score >= 0 AND attendance_score <= 100),
    innovation_projects INTEGER DEFAULT 0,
    team_leadership BOOLEAN DEFAULT FALSE,
    customer_rating DECIMAL(3,2) CHECK (customer_rating >= 0 AND customer_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leave_requests table
CREATE TABLE leave_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('annual', 'sick', 'maternity', 'paternity', 'marriage', 'bereavement', 'unpaid', 'permission')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    emergency_contact VARCHAR(255),
    handover_to UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent', 'leave', 'holiday')),
    work_hours VARCHAR(10),
    location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- Create payroll table
CREATE TABLE payroll (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    period_year INTEGER NOT NULL,
    base_salary DECIMAL(15,2) NOT NULL,
    allowances DECIMAL(15,2) DEFAULT 0,
    deductions DECIMAL(15,2) DEFAULT 0,
    net_salary DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    pay_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, period_month, period_year)
);

-- Create rewards table
CREATE TABLE rewards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('employee_of_month', 'innovation_award', 'best_team_leader', 'perfect_attendance', 'customer_champion', 'closing', 'custom')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    points INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired')),
    awarded_date DATE NOT NULL,
    claimed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    module VARCHAR(50) NOT NULL,
    user_id UUID, -- Can be NULL for system-wide notifications
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for department manager
ALTER TABLE departments 
ADD CONSTRAINT fk_departments_manager 
FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX idx_payroll_employee_period ON payroll(employee_id, period_year, period_month);
CREATE INDEX idx_rewards_employee ON rewards(employee_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON payroll FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default departments
INSERT INTO departments (name, description) VALUES
('IT', 'Information Technology Department'),
('HRD', 'Human Resources Department'),
('Sales', 'Sales Department'),
('Finance', 'Finance Department'),
('Marketing', 'Marketing Department'),
('CS', 'Customer Service Department');

-- Insert sample employees (you can modify or remove this)
INSERT INTO employees (name, position, department_id, join_date, salary, bank_account, bank, status) 
SELECT 
    'Budi Santoso', 
    'Software Engineer', 
    d.id, 
    '2022-03-15', 
    15000000, 
    '1234567890', 
    'BCA',
    'active'
FROM departments d WHERE d.name = 'IT';

INSERT INTO employees (name, position, department_id, join_date, salary, bank_account, bank, status) 
SELECT 
    'Siti Rahayu', 
    'HR Manager', 
    d.id, 
    '2021-01-10', 
    18000000, 
    '0987654321', 
    'Mandiri',
    'active'
FROM departments d WHERE d.name = 'HRD';

INSERT INTO employees (name, position, department_id, join_date, salary, bank_account, bank, status, sales_target, sales_achieved, customer_rating) 
SELECT 
    'Ahmad Wijaya', 
    'Sales Executive', 
    d.id, 
    '2023-06-01', 
    12000000, 
    '1122334455', 
    'BNI',
    'active',
    500000000,
    750000000,
    4.8
FROM departments d WHERE d.name = 'Sales';

-- Enable Row Level Security (RLS)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INVENTORY MODULE TABLES
-- ============================================

-- Create product_categories table
CREATE TABLE product_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create warehouses table
CREATE TABLE warehouses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(255),
    description TEXT,
    capacity DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    description TEXT,
    stock DECIMAL(15,2) DEFAULT 0,
    min_stock DECIMAL(15,2) DEFAULT 0,
    max_stock DECIMAL(15,2),
    unit VARCHAR(50) NOT NULL,
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    cost DECIMAL(15,2) DEFAULT 0,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    image_url TEXT,
    barcode VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stock_movements table
CREATE TABLE stock_movements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'transfer', 'adjustment')),
    quantity DECIMAL(15,2) NOT NULL,
    reference VARCHAR(100), -- PO number, SO number, etc.
    reference_type VARCHAR(50), -- 'purchase_order', 'sales_order', 'transfer', etc.
    notes TEXT,
    created_by UUID, -- User who created the movement
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for inventory tables
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_warehouse ON products(warehouse_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);

-- Create triggers for updated_at on inventory tables
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_movements_updated_at BEFORE UPDATE ON stock_movements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO product_categories (name, description) VALUES
('Semen', 'Kategori produk semen dan bahan pengikat'),
('Besi', 'Kategori produk besi dan baja'),
('Bata', 'Kategori produk bata dan batako'),
('Pasir', 'Kategori produk pasir dan kerikil'),
('Keramik', 'Kategori produk keramik dan ubin'),
('Cat', 'Kategori produk cat dan pelapis'),
('Pipa', 'Kategori produk pipa dan aksesoris'),
('Kawat', 'Kategori produk kawat dan wire'),
('Kayu', 'Kategori produk kayu dan triplek'),
('Atap', 'Kategori produk atap dan genteng'),
('Kaca', 'Kategori produk kaca dan jendela'),
('Listrik', 'Kategori produk listrik dan elektronik'),
('Sanitasi', 'Kategori produk sanitasi dan plumbing');

-- Insert default warehouse
INSERT INTO warehouses (name, location, description, status) VALUES
('Gudang Utama', 'Jl. Raya Industri No. 123', 'Gudang utama untuk penyimpanan bahan baku', 'active'),
('Gudang Proyek A', 'Jl. Proyek A No. 45', 'Gudang untuk proyek A', 'active');

-- Enable Row Level Security for inventory tables
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory tables
CREATE POLICY "Allow all operations on product_categories" ON product_categories FOR ALL USING (true);
CREATE POLICY "Allow all operations on warehouses" ON warehouses FOR ALL USING (true);
CREATE POLICY "Allow all operations on products" ON products FOR ALL USING (true);
CREATE POLICY "Allow all operations on stock_movements" ON stock_movements FOR ALL USING (true);

-- Create policies (adjust based on your authentication needs)
-- For now, allow all operations (you should restrict this in production)
CREATE POLICY "Allow all operations on departments" ON departments FOR ALL USING (true);
CREATE POLICY "Allow all operations on employees" ON employees FOR ALL USING (true);
CREATE POLICY "Allow all operations on leave_requests" ON leave_requests FOR ALL USING (true);
CREATE POLICY "Allow all operations on attendance" ON attendance FOR ALL USING (true);
CREATE POLICY "Allow all operations on payroll" ON payroll FOR ALL USING (true);
CREATE POLICY "Allow all operations on rewards" ON rewards FOR ALL USING (true);
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true);

-- ============================================
-- LOAN MODULE TABLES
-- ============================================

-- Create employee_loans table
CREATE TABLE employee_loans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    remaining_amount DECIMAL(15,2) NOT NULL,
    installment_amount DECIMAL(15,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid_off')),
    start_date DATE NOT NULL, -- Format: YYYY-MM-DD, indicates start of deduction
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for loans
CREATE INDEX idx_employee_loans_employee ON employee_loans(employee_id);
CREATE INDEX idx_employee_loans_status ON employee_loans(status);

-- Create trigger for updated_at
CREATE TRIGGER update_employee_loans_updated_at BEFORE UPDATE ON employee_loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE employee_loans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on employee_loans" ON employee_loans FOR ALL USING (true);