-- Koreksi payroll: semua karyawan tukang/pekerja/lapangan tidak boleh punya tunjangan payroll.
-- Aman dijalankan berulang. Reward payroll tidak disentuh.

-- 1. Preview karyawan yang terdeteksi sebagai tukang
WITH worker_employees AS (
    SELECT
        e.id AS employee_id,
        e.name,
        e.position,
        COALESCE(d.name, '') AS department_name
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE
        COALESCE(e.position, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
        OR COALESCE(d.name, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
)
SELECT *
FROM worker_employees
ORDER BY name;

-- 2. Preview payroll tukang yang masih punya tunjangan
WITH worker_employees AS (
    SELECT e.id AS employee_id
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE
        COALESCE(e.position, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
        OR COALESCE(d.name, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
)
SELECT
    p.id,
    p.employee_id,
    e.name,
    e.position,
    COALESCE(d.name, '') AS department_name,
    p.period_month,
    p.period_year,
    p.base_salary,
    p.allowances,
    COALESCE(p.gasoline_allowance, 0) AS gasoline_allowance,
    COALESCE(p.meal_allowance, 0) AS meal_allowance,
    COALESCE(p.position_allowance, 0) AS position_allowance,
    COALESCE(p.discretionary_allowance, 0) AS discretionary_allowance,
    COALESCE(p.thr_allowance, 0) AS thr_allowance,
    COALESCE(p.reward_allowance, 0) AS reward_allowance,
    COALESCE(p.deductions, 0) AS deductions,
    p.net_salary,
    CASE
        WHEN COALESCE(p.manual_allowance_details, '[]'::jsonb) = '[]'::jsonb THEN 0
        ELSE jsonb_array_length(p.manual_allowance_details)
    END AS manual_allowance_item_count,
    p.net_salary - COALESCE(p.allowances, 0) AS net_salary_after_fix
FROM payroll p
JOIN worker_employees w ON w.employee_id = p.employee_id
JOIN employees e ON e.id = p.employee_id
LEFT JOIN departments d ON d.id = e.department_id
WHERE
    COALESCE(p.allowances, 0) <> 0
    OR COALESCE(p.gasoline_allowance, 0) <> 0
    OR COALESCE(p.meal_allowance, 0) <> 0
    OR COALESCE(p.position_allowance, 0) <> 0
    OR COALESCE(p.discretionary_allowance, 0) <> 0
    OR COALESCE(p.thr_allowance, 0) <> 0
    OR COALESCE(p.manual_allowance_details, '[]'::jsonb) <> '[]'::jsonb
ORDER BY p.period_year DESC, p.period_month DESC, e.name;

-- 3. Jalankan koreksi
WITH worker_employees AS (
    SELECT e.id AS employee_id
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE
        COALESCE(e.position, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
        OR COALESCE(d.name, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
),
target_payroll AS (
    SELECT p.id, COALESCE(p.allowances, 0) AS removed_allowances
    FROM payroll p
    JOIN worker_employees w ON w.employee_id = p.employee_id
    WHERE
        COALESCE(p.allowances, 0) <> 0
        OR COALESCE(p.gasoline_allowance, 0) <> 0
        OR COALESCE(p.meal_allowance, 0) <> 0
        OR COALESCE(p.position_allowance, 0) <> 0
        OR COALESCE(p.discretionary_allowance, 0) <> 0
        OR COALESCE(p.thr_allowance, 0) <> 0
        OR COALESCE(p.manual_allowance_details, '[]'::jsonb) <> '[]'::jsonb
)
UPDATE payroll p
SET
    allowances = 0,
    gasoline_allowance = 0,
    meal_allowance = 0,
    position_allowance = 0,
    discretionary_allowance = 0,
    thr_allowance = 0,
    manual_allowance_details = '[]'::jsonb,
    net_salary = p.net_salary - t.removed_allowances,
    updated_at = NOW()
FROM target_payroll t
WHERE p.id = t.id;

-- 4. Verifikasi hasil akhir
WITH worker_employees AS (
    SELECT e.id AS employee_id
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE
        COALESCE(e.position, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
        OR COALESCE(d.name, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
)
SELECT
    p.id,
    e.name,
    e.position,
    COALESCE(d.name, '') AS department_name,
    p.period_month,
    p.period_year,
    p.allowances,
    COALESCE(p.gasoline_allowance, 0) AS gasoline_allowance,
    COALESCE(p.meal_allowance, 0) AS meal_allowance,
    COALESCE(p.position_allowance, 0) AS position_allowance,
    COALESCE(p.discretionary_allowance, 0) AS discretionary_allowance,
    COALESCE(p.thr_allowance, 0) AS thr_allowance,
    COALESCE(p.reward_allowance, 0) AS reward_allowance,
    p.net_salary
FROM payroll p
JOIN worker_employees w ON w.employee_id = p.employee_id
JOIN employees e ON e.id = p.employee_id
LEFT JOIN departments d ON d.id = e.department_id
ORDER BY p.period_year DESC, p.period_month DESC, e.name;
