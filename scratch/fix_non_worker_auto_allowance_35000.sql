-- Koreksi extra payroll non-tukang yang berasal dari auto allowance meal + gasoline.
-- Tujuan:
-- 1. Nolkan setting global meal/gasoline agar payroll baru tidak otomatis bertambah 35.000
-- 2. Bersihkan payroll lama non-tukang dengan menghapus komponen meal/gasoline dari allowances dan net_salary

-- 1. Preview setting payroll saat ini
SELECT
    key,
    value,
    description
FROM system_settings
WHERE key IN ('payroll_allowance_meal', 'payroll_allowance_gasoline')
ORDER BY key;

-- 2. Nolkan setting global agar payroll baru tidak otomatis menambah 35.000
UPDATE system_settings
SET
    value = '0',
    description = CASE
        WHEN COALESCE(description, '') ILIKE '%[dinolkan oleh koreksi payroll non-tukang]%' THEN description
        ELSE CONCAT(COALESCE(description, ''), ' [dinolkan oleh koreksi payroll non-tukang]')
    END,
    updated_at = NOW()
WHERE key IN ('payroll_allowance_meal', 'payroll_allowance_gasoline');

-- 3. Preview payroll non-tukang yang masih punya meal/gasoline allowance
WITH non_worker_payroll AS (
    SELECT
        p.id,
        p.employee_id,
        e.name,
        e.position,
        COALESCE(d.name, '') AS department_name,
        p.period_month,
        p.period_year,
        COALESCE(p.allowances, 0) AS allowances,
        COALESCE(p.meal_allowance, 0) AS meal_allowance,
        COALESCE(p.gasoline_allowance, 0) AS gasoline_allowance,
        COALESCE(p.position_allowance, 0) AS position_allowance,
        COALESCE(p.reward_allowance, 0) AS reward_allowance,
        COALESCE(p.net_salary, 0) AS net_salary
    FROM payroll p
    JOIN employees e ON e.id = p.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE NOT (
        COALESCE(e.position, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
        OR COALESCE(d.name, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
    )
)
SELECT
    *,
    (meal_allowance + gasoline_allowance) AS removed_auto_allowance,
    net_salary - (meal_allowance + gasoline_allowance) AS estimated_net_salary_after_fix
FROM non_worker_payroll
WHERE meal_allowance <> 0 OR gasoline_allowance <> 0
ORDER BY period_year DESC, period_month DESC, name;

-- 4. Jalankan koreksi payroll lama non-tukang
WITH target_payroll AS (
    SELECT
        p.id,
        LEAST(
            COALESCE(p.allowances, 0),
            COALESCE(p.meal_allowance, 0) + COALESCE(p.gasoline_allowance, 0)
        ) AS removed_auto_allowance
    FROM payroll p
    JOIN employees e ON e.id = p.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE NOT (
        COALESCE(e.position, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
        OR COALESCE(d.name, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
    )
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

-- 5. Verifikasi hasil akhir
SELECT
    p.id,
    e.name,
    e.position,
    COALESCE(d.name, '') AS department_name,
    p.period_month,
    p.period_year,
    COALESCE(p.allowances, 0) AS allowances,
    COALESCE(p.meal_allowance, 0) AS meal_allowance,
    COALESCE(p.gasoline_allowance, 0) AS gasoline_allowance,
    COALESCE(p.position_allowance, 0) AS position_allowance,
    COALESCE(p.reward_allowance, 0) AS reward_allowance,
    COALESCE(p.net_salary, 0) AS net_salary
FROM payroll p
JOIN employees e ON e.id = p.employee_id
LEFT JOIN departments d ON d.id = e.department_id
WHERE NOT (
    COALESCE(e.position, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
    OR COALESCE(d.name, '') ILIKE ANY (ARRAY['%tukang%', '%pekerja%', '%lapangan%'])
)
ORDER BY p.period_year DESC, p.period_month DESC, e.name;
