-- Koreksi payroll tukang per periode tertentu.
-- Edit nilai period_month dan period_year di bawah sebelum menjalankan.
-- Set salah satunya ke NULL jika ingin melewati filter tersebut.
-- Reward payroll tidak disentuh.

-- 0. Parameter periode
WITH params AS (
    SELECT
        3::INT AS period_month,
        2026::INT AS period_year
),
worker_employees AS (
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
SELECT
    p.id,
    e.name,
    e.position,
    w.department_name,
    p.period_month,
    p.period_year,
    p.allowances,
    COALESCE(p.gasoline_allowance, 0) AS gasoline_allowance,
    COALESCE(p.meal_allowance, 0) AS meal_allowance,
    COALESCE(p.position_allowance, 0) AS position_allowance,
    COALESCE(p.discretionary_allowance, 0) AS discretionary_allowance,
    COALESCE(p.thr_allowance, 0) AS thr_allowance,
    COALESCE(p.reward_allowance, 0) AS reward_allowance,
    p.net_salary,
    p.net_salary - COALESCE(p.allowances, 0) AS estimated_net_salary_after_fix
FROM payroll p
JOIN worker_employees w ON w.employee_id = p.employee_id
JOIN employees e ON e.id = p.employee_id
CROSS JOIN params prm
WHERE
    (prm.period_month IS NULL OR p.period_month = prm.period_month)
    AND (prm.period_year IS NULL OR p.period_year = prm.period_year)
    AND (
        COALESCE(p.allowances, 0) <> 0
        OR COALESCE(p.gasoline_allowance, 0) <> 0
        OR COALESCE(p.meal_allowance, 0) <> 0
        OR COALESCE(p.position_allowance, 0) <> 0
        OR COALESCE(p.discretionary_allowance, 0) <> 0
        OR COALESCE(p.thr_allowance, 0) <> 0
        OR COALESCE(p.manual_allowance_details, '[]'::jsonb) <> '[]'::jsonb
    )
ORDER BY p.period_year DESC, p.period_month DESC, e.name;

-- 1. Jalankan koreksi per periode
WITH params AS (
    SELECT
        3::INT AS period_month,
        2026::INT AS period_year
),
worker_employees AS (
    SELECT e.id AS employee_id
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE
        COALESCE(e.position, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
        OR COALESCE(d.name, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
),
target_payroll AS (
    SELECT
        p.id,
        p.employee_id,
        COALESCE(p.allowances, 0) AS removed_allowances
    FROM payroll p
    JOIN worker_employees w ON w.employee_id = p.employee_id
    CROSS JOIN params prm
    WHERE
        (prm.period_month IS NULL OR p.period_month = prm.period_month)
        AND (prm.period_year IS NULL OR p.period_year = prm.period_year)
        AND (
            COALESCE(p.allowances, 0) <> 0
            OR COALESCE(p.gasoline_allowance, 0) <> 0
            OR COALESCE(p.meal_allowance, 0) <> 0
            OR COALESCE(p.position_allowance, 0) <> 0
            OR COALESCE(p.discretionary_allowance, 0) <> 0
            OR COALESCE(p.thr_allowance, 0) <> 0
            OR COALESCE(p.manual_allowance_details, '[]'::jsonb) <> '[]'::jsonb
        )
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
WHERE p.id = t.id
RETURNING
    p.id,
    p.employee_id,
    p.period_month,
    p.period_year,
    p.allowances,
    p.reward_allowance,
    p.net_salary;

-- 2. Verifikasi hasil akhir per periode
WITH params AS (
    SELECT
        3::INT AS period_month,
        2026::INT AS period_year
),
worker_employees AS (
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
SELECT
    p.id,
    e.name,
    e.position,
    w.department_name,
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
CROSS JOIN params prm
WHERE
    (prm.period_month IS NULL OR p.period_month = prm.period_month)
    AND (prm.period_year IS NULL OR p.period_year = prm.period_year)
ORDER BY p.period_year DESC, p.period_month DESC, e.name;
