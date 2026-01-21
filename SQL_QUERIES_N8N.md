# SQL Queries สำหรับ n8n (พร้อม Expression Syntax)

## ⚠️ สิ่งสำคัญ: ต้องเลือกใช้ตาม Action

**SQL queries แบ่งเป็น 2 ประเภท:**

### 1. **SQL Queries สำหรับใช้งานจริง** (ใช้ใน Workflow)
- ใช้ตาม action ที่ parser ส่งมา
- แต่ละ action ใช้ query ที่แตกต่างกัน
- **ต้องเลือกใช้ตาม action เท่านั้น**

### 2. **SQL Queries สำหรับทดสอบและ Debug** (ใช้สำหรับทดสอบเท่านั้น)
- ใช้สำหรับทดสอบและ debug เท่านั้น
- ไม่ใช้ใน workflow จริง
- ใช้เมื่อต้องการตรวจสอบปัญหา

---

## วิธีใช้งาน

### สำหรับ Workflow:

1. **Parser** จะส่ง `action` มา (เช่น `top_items`, `top_center`, `monthly_sales`)
2. **Switch Node** จะ route ไปยัง action ที่ถูกต้อง
3. **WHERE Builder** (ถ้ามี `time_period`) จะสร้าง `where_clause`
4. **Execute SQL Query** ใช้ query ที่ตรงกับ action

### Mapping Action → SQL Query:

| Action | SQL Query | ต้องใช้ WHERE Builder? |
|--------|-----------|----------------------|
| `invoice_detail` | Query 1 | ❌ ไม่ต้อง |
| `customer_invoices` | Query 2 | ❌ ไม่ต้อง |
| `top_items` | Query 3 | ✅ ต้องใช้ |
| `top_center` | Query 4 | ✅ ต้องใช้ |
| `monthly_sales` | Query 5 | ✅ ต้องใช้ |
| `product_group_sales` | Query 6 | ✅ ต้องใช้ |

---

## ⚠️ หมายเหตุสำคัญ

- **ไม่ใช้ทุก query พร้อมกัน** - แต่ละ action ใช้ query ที่แตกต่างกัน
- **Switch Node** จะเลือก query ให้อัตโนมัติตาม `action`
- **Queries สำหรับทดสอบ** ใช้สำหรับ debug เท่านั้น ไม่ใช้ใน workflow

---

## 1. invoice_detail

**ไม่ต้องใช้ WHERE Builder** (ไม่มี time_period)

**แสดงรายละเอียด Invoice พร้อมข้อมูลศูนย์/หน่วยงานที่เก็บสินค้า**

```sql
SELECT
  l.inv_line_inv_no            AS invoice_no,
  h.inv_posting_date           AS inv_date,
  l.inv_line_customer_no       AS customer_no,
  l.inv_line_customer_name     AS customer_name,
  -- ข้อมูลศูนย์/หน่วยงาน (จาก header - ศูนย์ใหญ่)
  h.inv_department             AS department,
  h.inv_department_name         AS department_name,
  -- ข้อมูลศูนย์/หน่วยงาน (จาก line - ศูนย์ที่เก็บสินค้านี้)
  l.inv_line_department         AS line_department,
  l.inv_line_department_name    AS line_department_name,
  l.inv_line_sales_person       AS sales_person,
  l.inv_line_sales_person_name  AS sales_person_name,
  -- รายละเอียดสินค้า
  l.inv_line_no,
  l.inv_line_item_no,
  l.inv_line_description,
  l.inv_line_quantity,
  l.inv_line_unit,
  l.inv_unit_price,
  l.inv_line_amount,
  l.inv_line_amount_vat,
  l.inv_line_amount + l.inv_line_amount_vat AS line_net_amount,
  -- ข้อมูลเพิ่มเติม
  h.inv_order_date,
  h.inv_shipment_date,
  h.inv_duedate,
  h.inv_payment,
  h.inv_posting_description
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
WHERE l.inv_line_inv_no = '{{ $json.invoice_no }}'
ORDER BY l.inv_line_no
```

---

## 2. customer_invoices

**ไม่ต้องใช้ WHERE Builder** (ไม่มี time_period)

```sql
SELECT DISTINCT
  h.inv_no                     AS invoice_no,
  h.inv_posting_date           AS inv_date,
  h.inv_customer_no            AS customer_no,
  h.inv_customer_name          AS customer_name,
  SUM(l.inv_line_amount)      AS inv_total_amount,
  SUM(l.inv_line_amount_vat)  AS inv_total_vat,
  SUM(l.inv_line_amount) + SUM(l.inv_line_amount_vat) AS inv_net_amount,
  h.inv_department             AS department,
  h.inv_department_name        AS department_name,
  h.inv_sales_person           AS sales_person,
  h.inv_sales_person_name      AS sales_person_name
FROM data_warehouse.service_posted_invoice_header h
LEFT JOIN data_warehouse.service_posted_invoice_line l
  ON l.inv_line_inv_no = h.inv_no
WHERE h.inv_customer_name LIKE '%{{ $json.customer_name }}%'
   OR h.inv_customer_no LIKE '%{{ $json.customer_name }}%'
GROUP BY 
  h.inv_no,
  h.inv_posting_date,
  h.inv_customer_no,
  h.inv_customer_name,
  h.inv_department,
  h.inv_department_name,
  h.inv_sales_person,
  h.inv_sales_person_name
ORDER BY h.inv_posting_date DESC
```

---

## 3. top_items

**ต้องใช้ WHERE Builder ก่อน** (มี time_period)

**แสดงรายการสินค้าที่ขายดีที่สุด พร้อมข้อมูลศูนย์/หน่วยงาน**

```sql
SELECT
  l.inv_line_item_no           AS item_no,
  l.inv_line_description       AS item_description,
  SUM(l.inv_line_amount)      AS total_amount,
  SUM(l.inv_line_amount_vat)  AS total_amount_vat,
  SUM(l.inv_line_amount) + SUM(l.inv_line_amount_vat) AS net_amount,
  SUM(l.inv_line_quantity)    AS total_quantity,
  COUNT(DISTINCT l.inv_line_inv_no) AS invoice_count,
  COUNT(DISTINCT h.inv_department) AS department_count,
  AVG(l.inv_line_amount)       AS avg_amount,
  -- ข้อมูลศูนย์/หน่วยงานที่ขายสินค้านี้ (เรียงตามชื่อ)
  GROUP_CONCAT(DISTINCT h.inv_department_name ORDER BY h.inv_department_name SEPARATOR ', ') AS top_departments
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
{{ $json.where_clause }}
AND l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
AND l.inv_line_inv_no IS NOT NULL
GROUP BY 
  l.inv_line_item_no,
  l.inv_line_description
HAVING COUNT(DISTINCT l.inv_line_inv_no) > 0
ORDER BY total_amount DESC
LIMIT {{ $json.limit ? $json.limit : 10 }}
```

---

## 4. top_center

**ต้องใช้ WHERE Builder ก่อน** (มี time_period)

**แสดงศูนย์/หน่วยงานที่มียอดขายเยอะสุด (header บอกว่าศูนย์อะไร, line บอกว่ามี invoice อะไรบ้าง)**

```sql
SELECT
  h.inv_department             AS department,
  h.inv_department_name        AS department_name,
  COUNT(DISTINCT h.inv_no)     AS invoice_count,
  COUNT(DISTINCT l.inv_line_item_no) AS item_count,
  SUM(l.inv_line_amount)      AS total_amount,
  SUM(l.inv_line_amount_vat)   AS total_vat,
  SUM(l.inv_line_amount) + SUM(l.inv_line_amount_vat) AS net_amount,
  AVG(l.inv_line_amount + l.inv_line_amount_vat) AS avg_invoice_amount,
  MIN(h.inv_posting_date)     AS first_invoice_date,
  MAX(h.inv_posting_date)     AS last_invoice_date,
  -- ตัวอย่าง invoice numbers ที่ศูนย์นี้มี
  GROUP_CONCAT(DISTINCT h.inv_no ORDER BY h.inv_posting_date DESC SEPARATOR ', ' LIMIT 5) AS sample_invoices
FROM data_warehouse.service_posted_invoice_header h
LEFT JOIN data_warehouse.service_posted_invoice_line l
  ON l.inv_line_inv_no = h.inv_no
{{ $json.where_clause }}
AND h.inv_department IS NOT NULL
AND h.inv_department != ''
GROUP BY 
  h.inv_department,
  h.inv_department_name
HAVING COUNT(DISTINCT h.inv_no) > 0
ORDER BY net_amount DESC
LIMIT {{ $json.limit ? $json.limit : 20 }}
```

---

## 5. monthly_sales

**ต้องใช้ WHERE Builder ก่อน** (มี time_period)

```sql
SELECT
  DATE_FORMAT(h.inv_posting_date, '%Y-%m') AS month,
  DATE_FORMAT(h.inv_posting_date, '%Y')    AS year,
  DATE_FORMAT(h.inv_posting_date, '%m')    AS month_num,
  DATE_FORMAT(h.inv_posting_date, '%M %Y') AS month_name,
  COUNT(DISTINCT h.inv_no)         AS invoice_count,
  COALESCE(SUM(l.inv_line_amount), 0)          AS total_amount,
  COALESCE(SUM(l.inv_line_amount_vat), 0)      AS total_vat,
  COALESCE(SUM(l.inv_line_amount), 0) + COALESCE(SUM(l.inv_line_amount_vat), 0) AS net_amount,
  COALESCE(AVG(l.inv_line_amount + l.inv_line_amount_vat), 0) AS avg_invoice_amount,
  COALESCE(MIN(l.inv_line_amount + l.inv_line_amount_vat), 0) AS min_invoice_amount,
  COALESCE(MAX(l.inv_line_amount + l.inv_line_amount_vat), 0) AS max_invoice_amount
FROM data_warehouse.service_posted_invoice_header h
LEFT JOIN data_warehouse.service_posted_invoice_line l
  ON l.inv_line_inv_no = h.inv_no
{{ $json.where_clause }}
AND h.inv_posting_date IS NOT NULL
GROUP BY 
  DATE_FORMAT(h.inv_posting_date, '%Y-%m'),
  DATE_FORMAT(h.inv_posting_date, '%Y'),
  DATE_FORMAT(h.inv_posting_date, '%m'),
  DATE_FORMAT(h.inv_posting_date, '%M %Y')
HAVING COUNT(DISTINCT h.inv_no) > 0
ORDER BY 
  year DESC,
  month_num DESC
```
```

---

## 6. product_group_sales

**ต้องใช้ WHERE Builder ก่อน** (มี time_period)

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
AND l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
GROUP BY 
  product_group,
  group_code
HAVING COUNT(DISTINCT l.inv_line_item_no) > 0
ORDER BY total_amount DESC
```

**หมายเหตุ:** ปรับ product_group logic ตามโครงสร้างข้อมูลจริงของคุณ

---

## ตัวอย่าง Workflow สำหรับ top_items

```
Switch (top_items)
  ↓
Code (WHERE Builder) - SQL_WHERE_BUILDER.js
  Input: { action: 'top_items', time_period: { period: 'month', value: 3 } }
  Output: { action: 'top_items', time_period: {...}, where_clause: 'WHERE 1=1 AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)' }
  ↓
Execute SQL Query - Top Items
  Query: ใช้ SQL query ด้านบน
  {{ $json.where_clause }} จะถูกแทนที่ด้วย: WHERE 1=1 AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
  ↓
Code (Format Response)
  Format ข้อมูลให้อ่านง่าย
  ↓
Respond to Webhook
  Response Body: { "reply": "{{ $json.formatted_reply }}" }
```

---

## Tips

1. **Expression Mode:** ใช้ `{{ }}` สำหรับ dynamic values
2. **WHERE Clause:** ใช้ `{{ $json.where_clause }}` ใน SQL query
3. **Testing:** ทดสอบแต่ละ SQL query ใน database ก่อนนำมาใช้
4. **Performance:** เพิ่ม INDEX ที่:
   - `inv_date`
   - `inv_customer_name`
   - `inv_line_item_no`
   - `inv_line_inv_no`
5. **Error Handling:** เพิ่ม If node เพื่อตรวจสอบว่ามีข้อมูลหรือไม่

---

## การ Debug

ถ้า SQL query ไม่ทำงาน:

1. ตรวจสอบว่า WHERE Builder ส่ง `where_clause` มา
2. ดู OUTPUT ของ WHERE Builder node
3. ตรวจสอบว่า expression `{{ $json.where_clause }}` ถูก evaluate หรือไม่
4. ทดสอบ SQL query โดยตรงใน database
5. ตรวจสอบ log ใน n8n execution history

---

## SQL Queries สำหรับทดสอบและ Debug

### 1. ทดสอบ Top Items เดือนนี้ (Query แบบ Static)

**ใช้สำหรับทดสอบว่ามีข้อมูลในเดือนนี้หรือไม่**

```sql
SELECT
  l.inv_line_item_no           AS item_no,
  l.inv_line_description       AS item_description,
  SUM(l.inv_line_amount)      AS total_amount,
  SUM(l.inv_line_amount_vat)  AS total_amount_vat,
  SUM(l.inv_line_amount) + SUM(l.inv_line_amount_vat) AS net_amount,
  SUM(l.inv_line_quantity)    AS total_quantity,
  COUNT(DISTINCT l.inv_line_inv_no) AS invoice_count,
  COUNT(DISTINCT h.inv_department) AS department_count,
  AVG(l.inv_line_amount)       AS avg_amount,
  GROUP_CONCAT(DISTINCT h.inv_department_name ORDER BY h.inv_department_name SEPARATOR ', ') AS top_departments
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
WHERE 1=1
AND YEAR(h.inv_posting_date) = YEAR(CURDATE())
AND MONTH(h.inv_posting_date) = MONTH(CURDATE())
AND l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
AND l.inv_line_inv_no IS NOT NULL
GROUP BY 
  l.inv_line_item_no,
  l.inv_line_description
HAVING COUNT(DISTINCT l.inv_line_inv_no) > 0
ORDER BY total_amount DESC
LIMIT 10
```

**สำคัญ:** ต้องมี GROUP BY, HAVING, ORDER BY, LIMIT ครบถ้วน

---

### 2. ตรวจสอบว่ามีข้อมูลในเดือนนี้หรือไม่

**ใช้สำหรับตรวจสอบว่ามีข้อมูลใน database ตามเงื่อนไขเดือนนี้**

```sql
SELECT
  COUNT(*) AS total_records,
  COUNT(DISTINCT l.inv_line_item_no) AS unique_items,
  COUNT(DISTINCT l.inv_line_inv_no) AS unique_invoices,
  COUNT(DISTINCT h.inv_department) AS unique_departments,
  MIN(h.inv_posting_date) AS earliest_date,
  MAX(h.inv_posting_date) AS latest_date,
  YEAR(CURDATE()) AS current_year,
  MONTH(CURDATE()) AS current_month
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
WHERE YEAR(h.inv_posting_date) = YEAR(CURDATE())
AND MONTH(h.inv_posting_date) = MONTH(CURDATE())
AND l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
```

**ถ้า query นี้ไม่มีข้อมูล:** แสดงว่าไม่มีข้อมูลในเดือนนี้

---

### 3. ทดสอบข้อมูลทั้งหมด (ไม่กรองเวลา)

**ใช้สำหรับทดสอบว่า WHERE clause มีปัญหาหรือไม่**

```sql
SELECT
  l.inv_line_item_no           AS item_no,
  l.inv_line_description       AS item_description,
  SUM(l.inv_line_amount)      AS total_amount,
  COUNT(DISTINCT l.inv_line_inv_no) AS invoice_count
FROM data_warehouse.service_posted_invoice_line l
WHERE l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
GROUP BY 
  l.inv_line_item_no,
  l.inv_line_description
ORDER BY total_amount DESC
LIMIT 10
```

**ถ้า query นี้มีข้อมูล:** แสดงว่า WHERE clause มีปัญหา

---

### 4. ทดสอบข้อมูล 12 เดือนล่าสุด

**ใช้สำหรับทดสอบข้อมูลในช่วง 12 เดือนล่าสุด**

```sql
SELECT
  l.inv_line_item_no           AS item_no,
  l.inv_line_description       AS item_description,
  SUM(l.inv_line_amount)      AS total_amount,
  COUNT(DISTINCT l.inv_line_inv_no) AS invoice_count
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
WHERE h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
AND l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
GROUP BY 
  l.inv_line_item_no,
  l.inv_line_description
ORDER BY total_amount DESC
LIMIT 10
```

---

### 5. ตรวจสอบวันที่ล่าสุดใน database

**ใช้สำหรับดูว่ามีข้อมูลเดือนไหนบ้าง**

```sql
SELECT
  DATE_FORMAT(h.inv_posting_date, '%Y-%m') AS month,
  COUNT(DISTINCT h.inv_no) AS invoice_count,
  COUNT(DISTINCT l.inv_line_item_no) AS item_count,
  MIN(h.inv_posting_date) AS earliest_date,
  MAX(h.inv_posting_date) AS latest_date
FROM data_warehouse.service_posted_invoice_header h
LEFT JOIN data_warehouse.service_posted_invoice_line l
  ON l.inv_line_inv_no = h.inv_no
WHERE h.inv_posting_date IS NOT NULL
GROUP BY DATE_FORMAT(h.inv_posting_date, '%Y-%m')
ORDER BY month DESC
LIMIT 12
```

**ใช้ query นี้เพื่อดูว่ามีข้อมูลเดือนไหนบ้าง**

---

## Checklist สำหรับ Debug

- [ ] SQL query มี GROUP BY, HAVING, ORDER BY, LIMIT ครบถ้วน
- [ ] ทดสอบ SQL query โดยไม่มี WHERE clause (Query 3)
- [ ] ทดสอบ SQL query โดยใช้ WHERE clause แบบ static (Query 1)
- [ ] ตรวจสอบว่ามีข้อมูลใน database หรือไม่ (Query 2)
- [ ] ตรวจสอบวันที่ล่าสุดใน database (Query 5)
- [ ] ตรวจสอบว่า `inv_line_item_no` ไม่เป็น NULL
- [ ] ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่
- [ ] ตรวจสอบว่า Expression mode (`{{ }}`) เปิดอยู่หรือไม่
- [ ] ตรวจสอบว่า `inv_posting_date` ไม่เป็น NULL

---

## หมายเหตุสำหรับ Debug

- **Expression Mode:** ต้องเปิด Expression mode (`{{ }}`) ใน SQL Query node
- **WHERE Clause:** ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่
- **Data Availability:** ถ้า Query แบบ static (Query 1) ไม่มีข้อมูล แสดงว่าไม่มีข้อมูลใน database ตามเงื่อนไข
- **Date Range:** ถ้าไม่มีข้อมูลเดือนนี้ ลองใช้ 12 เดือนล่าสุดแทน (Query 4)
