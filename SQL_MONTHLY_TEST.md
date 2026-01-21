# SQL Query สำหรับทดสอบ Top Items เดือนนี้

## ปัญหา: "No output data returned" สำหรับเดือนนี้

### วิธีแก้ไข 1: ตรวจสอบ SQL Query ให้สมบูรณ์

SQL query ต้องมีส่วนต่อไปนี้ครบถ้วน:

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

### วิธีแก้ไข 2: ตรวจสอบว่ามีข้อมูลในเดือนนี้หรือไม่

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

### วิธีแก้ไข 3: ทดสอบข้อมูลทั้งหมด (ไม่กรองเวลา)

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

### วิธีแก้ไข 4: ทดสอบข้อมูล 12 เดือนล่าสุด

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

### วิธีแก้ไข 5: ตรวจสอบวันที่ล่าสุดใน database

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

## หมายเหตุ

- **Expression Mode:** ต้องเปิด Expression mode (`{{ }}`) ใน SQL Query node
- **WHERE Clause:** ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่
- **Data Availability:** ถ้า Query แบบ static ไม่มีข้อมูล แสดงว่าไม่มีข้อมูลใน database ตามเงื่อนไข
- **Date Range:** ถ้าไม่มีข้อมูลเดือนนี้ ลองใช้ 12 เดือนล่าสุดแทน
