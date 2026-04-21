-- Koreksi payroll non-tukang untuk 1 karyawan tertentu.
-- Ganti target_employee_name, lalu jalankan bertahap:
-- 1. preview
-- 2. update
-- 3. verifikasi
-- Reward payroll tidak disentuh.

-- 0. Parameter target
WITH params AS (
    SELECT
        '%nama karyawan%'::TEXT AS target_employee_name,
        NULL::INT AS period_month,
        NULL::INT AS period_year
),
target_payroll AS (
    SELECT
        p.id,
        p.employee_id,
        e.name,
        e.position,
        COALESCE(d.name, '') AS department_name,
        p.period_month,
        p.period_year,
        COALESCE(p.base_salary, 0) AS base_salary,
        COALESCE(p.allowances, 0) AS allowances,
        COALESCE(p.meal_allowance, 0) AS meal_allowance,
        COALESCE(p.gasoline_allowance, 0) AS gasoline_allowance,
        COALESCE(p.position_allowance, 0) AS position_allowance,
        COALESCE(p.discretionary_allowance, 0) AS discretionary_allowance,
        COALESCE(p.thr_allowance, 0) AS thr_allowance,
        COALESCE(p.reward_allowance, 0) AS reward_allowance,
        COALESCE(p.net_salary, 0) AS net_salary,
        LEAST(
            COALESCE(p.allowances, 0),
            COALESCE(p.meal_allowance, 0) + COALESCE(p.gasoline_allowance, 0)
        ) AS removed_auto_allowance
    FROM payroll p
    JOIN employees e ON e.id = p.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    CROSS JOIN params prm
    WHERE
        e.name ILIKE prm.target_employee_name
        AND NOT (
            COALESCE(e.position, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
            OR COALESCE(d.name, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
        )
        AND (prm.period_month IS NULL OR p.period_month = prm.period_month)
        AND (prm.period_year IS NULL OR p.period_year = prm.period_year)
)
SELECT
    id,
    employee_id,
    name,
    position,
    department_name,
    period_month,
    period_year,
    base_salary,
    allowances,
    meal_allowance,
    gasoline_allowance,
    position_allowance,
    discretionary_allowance,
    thr_allowance,
    reward_allowance,
    net_salary,
    removed_auto_allowance,
    net_salary - removed_auto_allowance AS estimated_net_salary_after_fix
FROM target_payroll
ORDER BY period_year DESC, period_month DESC, name;

-- 1. Jalankan koreksi
WITH params AS (
    SELECT
        '%nama karyawan%'::TEXT AS target_employee_name,
        NULL::INT AS period_month,
        NULL::INT AS period_year
),
target_payroll AS (
    SELECT
        p.id,
        LEAST(
            COALESCE(p.allowances, 0),
            COALESCE(p.meal_allowance, 0) + COALESCE(p.gasoline_allowance, 0)
        ) AS removed_auto_allowance
    FROM payroll p
    JOIN employees e ON e.id = p.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    CROSS JOIN params prm
    WHERE
        e.name ILIKE prm.target_employee_name
        AND NOT (
            COALESCE(e.position, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
            OR COALESCE(d.name, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
        )
        AND (prm.period_month IS NULL OR p.period_month = prm.period_month)
        AND (prm.period_year IS NULL OR p.period_year = prm.period_year)
        AND (
            COALESCE(p.meal_allowance, 0) <> 0
            OR COALESCE(p.gasoline_allowance, 0) <> 0
        )
)
UPDATE payroll p
SET
    allowances = GREATEST(COALESCE(p.allowances, 0) - t.removed_auto_allowance, 0),
    meal_allowance = 0,
    gasoline_allowance = 0,
    net_salary = COALESCE(p.net_salary, 0) - t.removed_auto_allowance,
    updated_at = NOW()
FROM target_payroll t
WHERE p.id = t.id
RETURNING
    p.id,
    p.employee_id,
    p.period_month,
    p.period_year,
    p.allowances,
    p.meal_allowance,
    p.gasoline_allowance,
    p.reward_allowance,
    p.net_salary;

-- 2. Verifikasi hasil akhir
WITH params AS (
    SELECT
        '%nama karyawan%'::TEXT AS target_employee_name,
        NULL::INT AS period_month,
        NULL::INT AS period_year
)
SELECT
    p.id,
    e.name,
    e.position,
    COALESCE(d.name, '') AS department_name,
    p.period_month,
    p.period_year,
    COALESCE(p.base_salary, 0) AS base_salary,
    COALESCE(p.allowances, 0) AS allowances,
    COALESCE(p.meal_allowance, 0) AS meal_allowance,
    COALESCE(p.gasoline_allowance, 0) AS gasoline_allowance,
    COALESCE(p.position_allowance, 0) AS position_allowance,
    COALESCE(p.discretionary_allowance, 0) AS discretionary_allowance,
    COALESCE(p.thr_allowance, 0) AS thr_allowance,
    COALESCE(p.reward_allowance, 0) AS reward_allowance,
    COALESCE(p.net_salary, 0) AS net_salary
FROM payroll p
JOIN employees e ON e.id = p.employee_id
LEFT JOIN departments d ON d.id = e.department_id
CROSS JOIN params prm
WHERE
    e.name ILIKE prm.target_employee_name
    AND (prm.period_month IS NULL OR p.period_month = prm.period_month)
    AND (prm.period_year IS NULL OR p.period_year = prm.period_year)
ORDER BY p.period_year DESC, p.period_month DESC, e.name;
