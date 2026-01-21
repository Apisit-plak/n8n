# การ Mapping SQL Queries กับ Execute SQL Query Nodes

## สรุป: SQL queries ใช้ใน "Execute SQL Query" node

แต่ละ action type จะมี **Execute SQL Query** node ของตัวเอง และใช้ SQL query ที่แตกต่างกันจาก `SQL_QUERIES_N8N.md`

---

## 1. Action: `invoice_detail`

**Node:** `Execute SQL Query - Invoice Detail`

**SQL Query จาก SQL_QUERIES_N8N.md:**
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

**ตำแหน่งใน Workflow:**
```
Switch (invoice_detail)
  ↓
Execute SQL Query - Invoice Detail ← ใช้ SQL query นี้
  ↓
If (มีข้อมูล?)
  ↓
Code (Format) → Respond to Webhook
```

---

## 2. Action: `customer_invoices`

**Node:** `Execute SQL Query - Customer Invoices`

**SQL Query จาก SQL_QUERIES_N8N.md:**
```sql
SELECT DISTINCT
  h.inv_no                     AS invoice_no,
  h.inv_date,
  h.inv_customer_no            AS customer_no,
  h.inv_customer_name          AS customer_name,
  h.inv_total_amount,
  h.inv_total_vat,
  h.inv_net_amount,
  h.inv_department             AS department,
  h.inv_department_name         AS department_name,
  h.inv_sales_person            AS sales_person,
  h.inv_sales_person_name       AS sales_person_name
FROM data_warehouse.service_posted_invoice_header h
WHERE h.inv_customer_name LIKE '%{{ $json.customer_name }}%'
   OR h.inv_customer_no LIKE '%{{ $json.customer_name }}%'
ORDER BY h.inv_date DESC
```

**ตำแหน่งใน Workflow:**
```
Switch (customer_invoices)
  ↓
Execute SQL Query - Customer Invoices ← ใช้ SQL query นี้
  ↓
Code (Format) → Respond to Webhook
```

---

## 3. Action: `top_items`

**Node:** `Execute SQL Query - Top Items`

**SQL Query จาก SQL_QUERIES_N8N.md:**
```sql
SELECT
  l.inv_line_item_no           AS item_no,
  l.inv_line_description       AS item_description,
  SUM(l.inv_line_amount)      AS total_amount,
  SUM(l.inv_line_amount_vat)   AS total_amount_vat,
  SUM(l.inv_line_quantity)    AS total_quantity,
  COUNT(DISTINCT l.inv_line_inv_no) AS invoice_count,
  AVG(l.inv_line_amount)       AS avg_amount
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
{{ $json.where_clause }}
GROUP BY 
  l.inv_line_item_no,
  l.inv_line_description
ORDER BY total_amount DESC
LIMIT 20
```

**ตำแหน่งใน Workflow:**
```
Switch (top_items)
  ↓
Code (WHERE Builder) ← สร้าง where_clause
  ↓
Execute SQL Query - Top Items ← ใช้ SQL query นี้ (ใช้ {{ $json.where_clause }})
  ↓
Code (Format) → Respond to Webhook
```

**สำคัญ:** ต้องมี WHERE Builder node ก่อน เพื่อสร้าง `where_clause`

---

## 4. Action: `top_center`

**Node:** `Execute SQL Query - Top Center`

**SQL Query จาก SQL_QUERIES_N8N.md:**
```sql
SELECT
  h.inv_department             AS department,
  h.inv_department_name        AS department_name,
  COUNT(DISTINCT h.inv_no)     AS invoice_count,
  SUM(h.inv_total_amount)     AS total_amount,
  SUM(h.inv_total_vat)        AS total_vat,
  SUM(h.inv_net_amount)       AS net_amount,
  AVG(h.inv_net_amount)       AS avg_invoice_amount,
  MIN(h.inv_date)             AS first_invoice_date,
  MAX(h.inv_date)             AS last_invoice_date
FROM data_warehouse.service_posted_invoice_header h
{{ $json.where_clause }}
GROUP BY 
  h.inv_department,
  h.inv_department_name
ORDER BY net_amount DESC
LIMIT 20
```

**ตำแหน่งใน Workflow:**
```
Switch (top_center)
  ↓
Code (WHERE Builder) ← สร้าง where_clause
  ↓
Execute SQL Query - Top Center ← ใช้ SQL query นี้ (ใช้ {{ $json.where_clause }})
  ↓
Code (Format) → Respond to Webhook
```

**สำคัญ:** ต้องมี WHERE Builder node ก่อน เพื่อสร้าง `where_clause`

---

## 5. Action: `monthly_sales`

**Node:** `Execute SQL Query - Monthly Sales`

**SQL Query จาก SQL_QUERIES_N8N.md:**
```sql
SELECT
  DATE_FORMAT(h.inv_date, '%Y-%m') AS month,
  DATE_FORMAT(h.inv_date, '%Y')    AS year,
  DATE_FORMAT(h.inv_date, '%m')    AS month_num,
  DATE_FORMAT(h.inv_date, '%M %Y') AS month_name,
  COUNT(DISTINCT h.inv_no)         AS invoice_count,
  SUM(h.inv_total_amount)         AS total_amount,
  SUM(h.inv_total_vat)            AS total_vat,
  SUM(h.inv_net_amount)           AS net_amount,
  AVG(h.inv_net_amount)           AS avg_invoice_amount,
  MIN(h.inv_net_amount)           AS min_invoice_amount,
  MAX(h.inv_net_amount)           AS max_invoice_amount
FROM data_warehouse.service_posted_invoice_header h
{{ $json.where_clause }}
GROUP BY 
  DATE_FORMAT(h.inv_date, '%Y-%m'),
  DATE_FORMAT(h.inv_date, '%Y'),
  DATE_FORMAT(h.inv_date, '%m'),
  DATE_FORMAT(h.inv_date, '%M %Y')
ORDER BY 
  year DESC,
  month_num DESC
```

**ตำแหน่งใน Workflow:**
```
Switch (monthly_sales)
  ↓
Code (WHERE Builder) ← สร้าง where_clause
  ↓
Execute SQL Query - Monthly Sales ← ใช้ SQL query นี้ (ใช้ {{ $json.where_clause }})
  ↓
Code (Format) → Respond to Webhook
```

**สำคัญ:** ต้องมี WHERE Builder node ก่อน เพื่อสร้าง `where_clause`

---

## 6. Action: `product_group_sales`

**Node:** `Execute SQL Query - Product Group Sales`

**SQL Query จาก SQL_QUERIES_N8N.md:**
```sql
SELECT
  CASE 
    WHEN l.inv_line_item_no LIKE '1%' THEN 'Group 1'
    WHEN l.inv_line_item_no LIKE '2%' THEN 'Group 2'
    WHEN l.inv_line_item_no LIKE '3%' THEN 'Group 3'
    WHEN l.inv_line_item_no LIKE '4%' THEN 'Group 4'
    WHEN l.inv_line_item_no LIKE '5%' THEN 'Group 5'
    WHEN l.inv_line_item_no LIKE '6%' THEN 'Group 6'
    WHEN l.inv_line_item_no LIKE '7%' THEN 'Group 7'
    WHEN l.inv_line_item_no LIKE '8%' THEN 'Group 8'
    WHEN l.inv_line_item_no LIKE '9%' THEN 'Group 9'
    ELSE 'Other'
  END AS product_group,
  SUBSTRING(l.inv_line_item_no, 1, 1) AS group_code,
  COUNT(DISTINCT l.inv_line_item_no) AS item_count,
  COUNT(DISTINCT l.inv_line_inv_no) AS invoice_count,
  SUM(l.inv_line_amount) AS total_amount,
  SUM(l.inv_line_amount_vat) AS total_amount_vat,
  SUM(l.inv_line_quantity) AS total_quantity,
  AVG(l.inv_line_amount) AS avg_item_amount
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
{{ $json.where_clause }}
GROUP BY 
  product_group,
  group_code
ORDER BY total_amount DESC
```

**ตำแหน่งใน Workflow:**
```
Switch (product_group_sales)
  ↓
Code (WHERE Builder) ← สร้าง where_clause
  ↓
Execute SQL Query - Product Group Sales ← ใช้ SQL query นี้ (ใช้ {{ $json.where_clause }})
  ↓
Code (Format) → Respond to Webhook
```

**สำคัญ:** ต้องมี WHERE Builder node ก่อน เพื่อสร้าง `where_clause`

---

## สรุปตาราง Mapping

| Action | Execute SQL Query Node | SQL Query จาก SQL_QUERIES_N8N.md | ต้องใช้ WHERE Builder? |
|--------|------------------------|----------------------------------|------------------------|
| `invoice_detail` | Execute SQL Query - Invoice Detail | Section 1 | ❌ |
| `customer_invoices` | Execute SQL Query - Customer Invoices | Section 2 | ❌ |
| `top_items` | Execute SQL Query - Top Items | Section 3 | ✅ |
| `top_center` | Execute SQL Query - Top Center | Section 4 | ✅ |
| `monthly_sales` | Execute SQL Query - Monthly Sales | Section 5 | ✅ |
| `product_group_sales` | Execute SQL Query - Product Group Sales | Section 6 | ✅ |

---

## วิธีใช้งานใน n8n

### ขั้นตอนการตั้งค่า Execute SQL Query Node:

1. **เพิ่ม Execute SQL Query node** หลังจาก Switch node (หรือ WHERE Builder node)

2. **ตั้งค่า Query:**
   - เปิด Expression mode (คลิกไอคอน `{{ }}`)
   - Copy SQL query จาก `SQL_QUERIES_N8N.md` ที่เหมาะสม
   - วางใน Query field

3. **สำหรับ SQL ที่ใช้ `{{ $json.where_clause }}`:**
   - ต้องมี WHERE Builder node ก่อน
   - WHERE Builder จะสร้าง `where_clause` field
   - ใช้ `{{ $json.where_clause }}` ใน SQL query

4. **สำหรับ SQL ที่ใช้ `{{ $json.invoice_no }}` หรือ `{{ $json.customer_name }}`:**
   - ใช้โดยตรงจาก parser output
   - ไม่ต้องมี WHERE Builder

---

## ตัวอย่างการตั้งค่า

### ตัวอย่าง 1: invoice_detail (ไม่ใช้ WHERE Builder)

**Execute SQL Query - Invoice Detail:**
```
Query (Expression mode):
SELECT ...
FROM ...
WHERE l.inv_line_inv_no = '{{ $json.invoice_no }}'
ORDER BY ...
```

### ตัวอย่าง 2: top_items (ใช้ WHERE Builder)

**Code (WHERE Builder):**
- ใช้โค้ดจาก `SQL_WHERE_BUILDER.js`
- Output: `{ action: 'top_items', where_clause: 'WHERE 1=1 AND ...', ... }`

**Execute SQL Query - Top Items:**
```
Query (Expression mode):
SELECT ...
FROM ...
{{ $json.where_clause }}
GROUP BY ...
ORDER BY ...
```

---

## หมายเหตุสำคัญ

1. **Expression Mode:** ต้องเปิด Expression mode (`{{ }}`) เพื่อใช้ dynamic values
2. **WHERE Clause:** สำหรับ action ที่มี `time_period` ต้องใช้ `{{ $json.where_clause }}`
3. **Static Values:** สำหรับ `invoice_no` และ `customer_name` ใช้ `{{ $json.invoice_no }}` และ `{{ $json.customer_name }}` โดยตรง
4. **Testing:** ทดสอบ SQL query ใน database ก่อนนำมาใช้ใน n8n
