# SQL Query สำหรับทดสอบ Product Group Sales

## Query สำหรับทดสอบ

### Query 1: ทดสอบว่ามีข้อมูลหรือไม่ (ไม่มี WHERE clause)

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
  SUM(l.inv_line_quantity) AS total_quantity
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
WHERE l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
GROUP BY 
  product_group,
  group_code
ORDER BY total_amount DESC
LIMIT 20
```

### Query 2: ทดสอบข้อมูลปีนี้ (WHERE clause แบบ static)

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
WHERE h.inv_posting_date IS NOT NULL
AND YEAR(h.inv_posting_date) = YEAR(CURDATE())
AND l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
GROUP BY 
  product_group,
  group_code
HAVING COUNT(DISTINCT l.inv_line_item_no) > 0
ORDER BY total_amount DESC
```

### Query 3: ทดสอบข้อมูลทั้งหมด (ไม่กรองปี)

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
  COUNT(DISTINCT l.inv_line_item_no) AS item_count,
  COUNT(DISTINCT l.inv_line_inv_no) AS invoice_count,
  SUM(l.inv_line_amount) AS total_amount
FROM data_warehouse.service_posted_invoice_line l
WHERE l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
GROUP BY product_group
ORDER BY total_amount DESC
LIMIT 20
```

---

## SQL Query ที่แก้ไขแล้ว (Product Group Sales)

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

**หมายเหตุ:** 
- ใช้ `{{ $json.where_clause }}` เพื่อใช้ condition จาก WHERE Builder
- เพิ่มเงื่อนไข `l.inv_line_item_no IS NOT NULL` เพื่อกรองข้อมูลที่ไม่มี item_no
- เพิ่ม `HAVING` clause เพื่อกรอง group ที่ไม่มีข้อมูล

---

## Checklist สำหรับ Debug

- [ ] ทดสอบ SQL query โดยไม่มี WHERE clause
- [ ] ทดสอบ SQL query โดยใช้ WHERE clause แบบ static
- [ ] ตรวจสอบว่ามีข้อมูลใน database หรือไม่
- [ ] ตรวจสอบว่า `inv_line_item_no` ไม่เป็น NULL
- [ ] ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่
- [ ] ตรวจสอบว่า WHERE Builder ส่ง `where_clause` มา
