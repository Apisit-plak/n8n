# SQL Top Items - Debug Guide

## ปัญหา: "No output data returned"

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

**สำคัญ:** ต้องมี GROUP BY, HAVING, ORDER BY, LIMIT ครบถ้วน

---

### วิธีแก้ไข 2: ทดสอบด้วย Query แบบ Static ก่อน

แทนที่ `{{ $json.where_clause }}` ด้วย WHERE clause แบบ static:

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

---

### วิธีแก้ไข 4: ตรวจสอบว่ามีข้อมูลในเดือนนี้หรือไม่

```sql
SELECT
  COUNT(*) AS total_records,
  COUNT(DISTINCT l.inv_line_item_no) AS unique_items,
  COUNT(DISTINCT l.inv_line_inv_no) AS unique_invoices,
  MIN(h.inv_posting_date) AS earliest_date,
  MAX(h.inv_posting_date) AS latest_date
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
WHERE YEAR(h.inv_posting_date) = YEAR(CURDATE())
AND MONTH(h.inv_posting_date) = MONTH(CURDATE())
AND l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
```

---

### วิธีแก้ไข 5: ตรวจสอบ Expression

1. ตรวจสอบว่าเปิด Expression mode (`{{ }}`) ใน SQL Query node
2. ตรวจสอบ OUTPUT ของ WHERE Builder node ว่ามี `where_clause` หรือไม่
3. ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่

**ทดสอบ:** เปลี่ยน `{{ $json.where_clause }}` เป็น `WHERE 1=1` ชั่วคราว แล้วดูว่ามีข้อมูลออกมาหรือไม่

---

## Checklist สำหรับ Debug

- [ ] SQL query มี GROUP BY, HAVING, ORDER BY, LIMIT ครบถ้วน
- [ ] ทดสอบ SQL query โดยไม่มี WHERE clause (Query 3)
- [ ] ทดสอบ SQL query โดยใช้ WHERE clause แบบ static (Query 2)
- [ ] ตรวจสอบว่ามีข้อมูลใน database หรือไม่ (Query 4)
- [ ] ตรวจสอบว่า `inv_line_item_no` ไม่เป็น NULL
- [ ] ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่
- [ ] ตรวจสอบว่า Expression mode (`{{ }}`) เปิดอยู่หรือไม่
- [ ] ตรวจสอบว่า `inv_posting_date` ไม่เป็น NULL

---

## หมายเหตุ

- **Expression Mode:** ต้องเปิด Expression mode (`{{ }}`) ใน SQL Query node
- **WHERE Clause:** ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่
- **Data Availability:** ถ้า Query แบบ static ไม่มีข้อมูล แสดงว่าไม่มีข้อมูลใน database ตามเงื่อนไข
