# SQL Queries สำหรับแต่ละ Action Type

## 1. invoice_detail
**ใช้สำหรับ:** ดูรายละเอียด Invoice ตาม Invoice Number

```sql
SELECT
  l.inv_line_inv_no            AS invoice_no,
  l.inv_line_customer_no       AS customer_no,
  l.inv_line_customer_name     AS customer_name,
  l.inv_line_department        AS department,
  l.inv_line_department_name   AS department_name,
  l.inv_line_sales_person      AS sales_person,
  l.inv_line_sales_person_name AS sales_person_name,
  l.inv_line_no,
  l.inv_line_item_no,
  l.inv_line_description,
  l.inv_line_quantity,
  l.inv_line_unit,
  l.inv_unit_price,
  l.inv_line_amount,
  l.inv_line_amount_vat,
  h.inv_date,
  h.inv_total_amount,
  h.inv_total_vat,
  h.inv_net_amount
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
WHERE l.inv_line_inv_no = '{{ $json.invoice_no }}'
ORDER BY l.inv_line_no
```

---

## 2. customer_invoices
**ใช้สำหรับ:** ดู Invoice ทั้งหมดของลูกค้า 1 ราย

```sql
SELECT DISTINCT
  h.inv_no                     AS invoice_no,
  h.inv_date,
  h.inv_customer_no            AS customer_no,
  h.inv_customer_name         AS customer_name,
  h.inv_total_amount,
  h.inv_total_vat,
  h.inv_net_amount,
  h.inv_department             AS department,
  h.inv_department_name        AS department_name,
  h.inv_sales_person           AS sales_person,
  h.inv_sales_person_name      AS sales_person_name
FROM data_warehouse.service_posted_invoice_header h
WHERE h.inv_customer_name LIKE '%{{ $json.customer_name }}%'
   OR h.inv_customer_no LIKE '%{{ $json.customer_name }}%'
ORDER BY h.inv_date DESC
```

---

## 3. top_items
**ใช้สำหรับ:** หารายการสินค้าที่มียอดขายเยอะที่สุด (พร้อมระยะเวลา)

```sql
SELECT
  l.inv_line_item_no           AS item_no,
  l.inv_line_description       AS item_description,
  SUM(l.inv_line_amount)       AS total_amount,
  SUM(l.inv_line_amount_vat)   AS total_amount_vat,
  SUM(l.inv_line_quantity)     AS total_quantity,
  COUNT(DISTINCT l.inv_line_inv_no) AS invoice_count
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
WHERE 1=1
  {{ $json.time_period ? `
  AND h.inv_date >= DATE_SUB(CURDATE(), INTERVAL 
    CASE 
      WHEN '{{ $json.time_period.period }}' = 'month' THEN {{ $json.time_period.value || 1 }} MONTH
      WHEN '{{ $json.time_period.period }}' = 'year' THEN {{ $json.time_period.value || 1 }} YEAR
      WHEN '{{ $json.time_period.period }}' = 'week' THEN {{ $json.time_period.value || 1 }} WEEK
      WHEN '{{ $json.time_period.period }}' = 'day' THEN {{ $json.time_period.value || 1 }} DAY
      WHEN '{{ $json.time_period.period }}' = 'this_month' THEN DAY(CURDATE()) DAY
      WHEN '{{ $json.time_period.period }}' = 'this_year' THEN DAYOFYEAR(CURDATE()) DAY
      ELSE 30 DAY
    END
  )
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'this_year' ? `
  AND YEAR(h.inv_date) = YEAR(CURDATE())
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'last_year' ? `
  AND YEAR(h.inv_date) = YEAR(CURDATE()) - 1
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'this_month' ? `
  AND YEAR(h.inv_date) = YEAR(CURDATE())
  AND MONTH(h.inv_date) = MONTH(CURDATE())
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'last_month' ? `
  AND YEAR(h.inv_date) = YEAR(CURDATE())
  AND MONTH(h.inv_date) = MONTH(CURDATE()) - 1
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'date' ? `
  AND YEAR(h.inv_date) = {{ $json.time_period.year }}
  AND MONTH(h.inv_date) = {{ $json.time_period.month }}
  ` : '' }}
GROUP BY 
  l.inv_line_item_no,
  l.inv_line_description
ORDER BY total_amount DESC
LIMIT 20
```

**หมายเหตุ:** สำหรับ n8n ควรใช้ Expression เพื่อสร้าง WHERE clause แบบ dynamic

---

## 4. top_center
**ใช้สำหรับ:** หาศูนย์/หน่วยงานที่มียอดขายเยอะที่สุด (พร้อมระยะเวลา)

```sql
SELECT
  h.inv_department              AS department,
  h.inv_department_name         AS department_name,
  COUNT(DISTINCT h.inv_no)      AS invoice_count,
  SUM(h.inv_total_amount)      AS total_amount,
  SUM(h.inv_total_vat)         AS total_vat,
  SUM(h.inv_net_amount)        AS net_amount,
  AVG(h.inv_net_amount)         AS avg_invoice_amount
FROM data_warehouse.service_posted_invoice_header h
WHERE 1=1
  {{ $json.time_period && $json.time_period.period === 'this_year' ? `
  AND YEAR(h.inv_date) = YEAR(CURDATE())
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'last_year' ? `
  AND YEAR(h.inv_date) = YEAR(CURDATE()) - 1
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'this_month' ? `
  AND YEAR(h.inv_date) = YEAR(CURDATE())
  AND MONTH(h.inv_date) = MONTH(CURDATE())
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'last_month' ? `
  AND YEAR(h.inv_date) = YEAR(CURDATE())
  AND MONTH(h.inv_date) = MONTH(CURDATE()) - 1
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'month' && $json.time_period.value ? `
  AND h.inv_date >= DATE_SUB(CURDATE(), INTERVAL {{ $json.time_period.value }} MONTH)
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'year' && $json.time_period.value ? `
  AND h.inv_date >= DATE_SUB(CURDATE(), INTERVAL {{ $json.time_period.value }} YEAR)
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'date' ? `
  AND YEAR(h.inv_date) = {{ $json.time_period.year }}
  AND MONTH(h.inv_date) = {{ $json.time_period.month }}
  ` : '' }}
GROUP BY 
  h.inv_department,
  h.inv_department_name
ORDER BY net_amount DESC
LIMIT 20
```

---

## 5. monthly_sales
**ใช้สำหรับ:** ดูยอด Invoice แต่ละเดือน

```sql
SELECT
  DATE_FORMAT(h.inv_date, '%Y-%m') AS month,
  YEAR(h.inv_date)                  AS year,
  MONTH(h.inv_date)                 AS month_num,
  COUNT(DISTINCT h.inv_no)          AS invoice_count,
  SUM(h.inv_total_amount)           AS total_amount,
  SUM(h.inv_total_vat)              AS total_vat,
  SUM(h.inv_net_amount)            AS net_amount,
  AVG(h.inv_net_amount)            AS avg_invoice_amount
FROM data_warehouse.service_posted_invoice_header h
WHERE 1=1
  {{ $json.time_period && $json.time_period.period === 'this_year' ? `
  AND YEAR(h.inv_date) = YEAR(CURDATE())
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'last_year' ? `
  AND YEAR(h.inv_date) = YEAR(CURDATE()) - 1
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'year' && $json.time_period.value ? `
  AND h.inv_date >= DATE_SUB(CURDATE(), INTERVAL {{ $json.time_period.value }} YEAR)
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'date' ? `
  AND YEAR(h.inv_date) = {{ $json.time_period.year }}
  ` : '' }}
  {{ !$json.time_period ? `
  AND h.inv_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
  ` : '' }}
GROUP BY 
  DATE_FORMAT(h.inv_date, '%Y-%m'),
  YEAR(h.inv_date),
  MONTH(h.inv_date)
ORDER BY 
  year DESC,
  month_num DESC
```

---

## 6. product_group_sales
**ใช้สำหรับ:** ดูยอดขายสินค้าแยกตามกลุ่ม/หมวดหมู่

```sql
SELECT
  CASE 
    WHEN l.inv_line_item_no LIKE '1%' THEN 'Group 1'
    WHEN l.inv_line_item_no LIKE '2%' THEN 'Group 2'
    WHEN l.inv_line_item_no LIKE '3%' THEN 'Group 3'
    WHEN l.inv_line_item_no LIKE '4%' THEN 'Group 4'
    WHEN l.inv_line_item_no LIKE '5%' THEN 'Group 5'
    ELSE 'Other'
  END AS product_group,
  SUBSTRING(l.inv_line_item_no, 1, 1) AS group_code,
  COUNT(DISTINCT l.inv_line_item_no) AS item_count,
  SUM(l.inv_line_amount) AS total_amount,
  SUM(l.inv_line_amount_vat) AS total_amount_vat,
  SUM(l.inv_line_quantity) AS total_quantity,
  COUNT(DISTINCT l.inv_line_inv_no) AS invoice_count
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
WHERE 1=1
  {{ $json.time_period && $json.time_period.period === 'this_year' ? `
  AND YEAR(h.inv_date) = YEAR(CURDATE())
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'last_year' ? `
  AND YEAR(h.inv_date) = YEAR(CURDATE()) - 1
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'this_month' ? `
  AND YEAR(h.inv_date) = YEAR(CURDATE())
  AND MONTH(h.inv_date) = MONTH(CURDATE())
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'month' && $json.time_period.value ? `
  AND h.inv_date >= DATE_SUB(CURDATE(), INTERVAL {{ $json.time_period.value }} MONTH)
  ` : '' }}
  {{ $json.time_period && $json.time_period.period === 'year' && $json.time_period.value ? `
  AND h.inv_date >= DATE_SUB(CURDATE(), INTERVAL {{ $json.time_period.value }} YEAR)
  ` : '' }}
GROUP BY 
  product_group,
  group_code
ORDER BY total_amount DESC
```

**หมายเหตุ:** ต้องปรับ product_group logic ตามโครงสร้างข้อมูลจริงของคุณ

---

## วิธีใช้งานใน n8n

### สำหรับแต่ละ SQL Query:

1. **เพิ่ม Execute SQL Query node** หลังจาก Switch node
2. **ตั้งค่า Query:**
   - ใช้ Expression mode (`{{ }}`)
   - Copy SQL query ที่เหมาะสม
   - แก้ไข WHERE clause ให้ใช้ n8n expression syntax

3. **ตัวอย่างการสร้าง Dynamic WHERE Clause:**

```javascript
// ใน Code node ก่อน SQL Query
let whereClause = 'WHERE 1=1';

if ($json.time_period) {
  const period = $json.time_period.period;
  const value = $json.time_period.value;
  
  if (period === 'this_year') {
    whereClause += " AND YEAR(h.inv_date) = YEAR(CURDATE())";
  } else if (period === 'last_year') {
    whereClause += " AND YEAR(h.inv_date) = YEAR(CURDATE()) - 1";
  } else if (period === 'this_month') {
    whereClause += " AND YEAR(h.inv_date) = YEAR(CURDATE()) AND MONTH(h.inv_date) = MONTH(CURDATE())";
  } else if (period === 'month' && value) {
    whereClause += ` AND h.inv_date >= DATE_SUB(CURDATE(), INTERVAL ${value} MONTH)`;
  } else if (period === 'year' && value) {
    whereClause += ` AND h.inv_date >= DATE_SUB(CURDATE(), INTERVAL ${value} YEAR)`;
  }
}

return [{
  ...$json,
  where_clause: whereClause
}];
```

4. **ใน SQL Query node:**
```sql
SELECT ...
FROM ...
{{ $json.where_clause }}
GROUP BY ...
ORDER BY ...
```

---

## หมายเหตุสำคัญ

- **SQL Template Syntax:** n8n ใช้ `{{ }}` สำหรับ expression
- **Dynamic WHERE:** ควรสร้าง WHERE clause แบบ dynamic ด้วย Code node
- **Date Functions:** ใช้ MySQL date functions (DATE_SUB, YEAR, MONTH, CURDATE)
- **Performance:** เพิ่ม INDEX ที่ inv_date, inv_customer_name, inv_line_item_no ถ้ายังไม่มี
- **Security:** ใช้ parameterized queries หรือ sanitize input
