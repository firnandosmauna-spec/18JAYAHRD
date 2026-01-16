INSERT INTO departments (name, description, manager_id, budget, created_at, updated_at)
VALUES 
    ('HRD', 'Human Resources Department', NULL, 0, NOW(), NOW()),
    ('Finance', 'Finance & Accounting', NULL, 0, NOW(), NOW()),
    ('Marketing', 'Marketing & Sales', NULL, 0, NOW(), NOW()),
    ('IT', 'Information Technology', NULL, 0, NOW(), NOW()),
    ('Operations', 'General Operations', NULL, 0, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
