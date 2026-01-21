# SQL Queries สำหรับทดสอบ

## Query สำหรับทดสอบ Monthly Sales

### Query 1: ทดสอบว่ามีข้อมูลหรือไม่ (ไม่มี WHERE clause)

```sql
SELECT
  DATE_FORMAT(h.inv_posting_date, '%Y-%m') AS month,
  COUNT(DISTINCT h.inv_no) AS invoice_count,
  COALESCE(SUM(l.inv_line_amount), 0) AS total_amount
FROM data_warehouse.service_posted_invoice_header h
LEFT JOIN data_warehouse.service_posted_invoice_line l
  ON l.inv_line_inv_no = h.inv_no
WHERE h.inv_posting_date IS NOT NULL
GROUP BY DATE_FORMAT(h.inv_posting_date, '%Y-%m')
ORDER BY month DESC
LIMIT 12
```

### Query 2: ทดสอบข้อมูลปีนี้ (WHERE clause แบบ static)

```sql
SELECT
  DATE_FORMAT(h.inv_posting_date, '%Y-%m') AS month,
  DATE_FORMAT(h.inv_posting_date, '%Y') AS year,
  DATE_FORMAT(h.inv_posting_date, '%m') AS month_num,
  DATE_FORMAT(h.inv_posting_date, '%M %Y') AS month_name,
  COUNT(DISTINCT h.inv_no) AS invoice_count,
  COALESCE(SUM(l.inv_line_amount), 0) AS total_amount,
  COALESCE(SUM(l.inv_line_amount_vat), 0) AS total_vat,
  COALESCE(SUM(l.inv_line_amount), 0) + COALESCE(SUM(l.inv_line_amount_vat), 0) AS net_amount
FROM data_warehouse.service_posted_invoice_header h
LEFT JOIN data_warehouse.service_posted_invoice_line l
  ON l.inv_line_inv_no = h.inv_no
WHERE h.inv_posting_date IS NOT NULL
AND YEAR(h.inv_posting_date) = YEAR(CURDATE())
GROUP BY 
  DATE_FORMAT(h.inv_posting_date, '%Y-%m'),
  DATE_FORMAT(h.inv_posting_date, '%Y'),
  DATE_FORMAT(h.inv_posting_date, '%m'),
  DATE_FORMAT(h.inv_posting_date, '%M %Y')
ORDER BY year DESC, month_num DESC
```

### Query 3: ทดสอบข้อมูลปีที่แล้ว

```sql
SELECT
  DATE_FORMAT(h.inv_posting_date, '%Y-%m') AS month,
  COUNT(DISTINCT h.inv_no) AS invoice_count,
  COALESCE(SUM(l.inv_line_amount), 0) AS total_amount
FROM data_warehouse.service_posted_invoice_header h
LEFT JOIN data_warehouse.service_posted_invoice_line l
  ON l.inv_line_inv_no = h.inv_no
WHERE h.inv_posting_date IS NOT NULL
AND YEAR(h.inv_posting_date) = YEAR(CURDATE()) - 1
GROUP BY DATE_FORMAT(h.inv_posting_date, '%Y-%m')
ORDER BY month DESC
LIMIT 12
```

### Query 4: ทดสอบข้อมูลทั้งหมด (ไม่กรองปี)

```sql
SELECT
  DATE_FORMAT(h.inv_posting_date, '%Y-%m') AS month,
  COUNT(DISTINCT h.inv_no) AS invoice_count,
  COALESCE(SUM(l.inv_line_amount), 0) AS total_amount
FROM data_warehouse.service_posted_invoice_header h
LEFT JOIN data_warehouse.service_posted_invoice_line l
  ON l.inv_line_inv_no = h.inv_no
WHERE h.inv_posting_date IS NOT NULL
GROUP BY DATE_FORMAT(h.inv_posting_date, '%Y-%m')
ORDER BY month DESC
LIMIT 24
```

---

## วิธีแก้ไข SQL Query ใน n8n

### วิธีที่ 1: ใช้ WHERE clause แบบ static ก่อน (สำหรับทดสอบ)

แทนที่ `{{ $json.where_clause }}` ด้วย:

```sql
WHERE h.inv_posting_date IS NOT NULL
AND YEAR(h.inv_posting_date) = YEAR(CURDATE())
```

### วิธีที่ 2: ตรวจสอบว่า Expression ถูก evaluate หรือไม่

1. ดู OUTPUT ของ WHERE Builder node
2. ตรวจสอบว่ามี `where_clause` field หรือไม่
3. ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่

### วิธีที่ 3: ใช้ Query Parameters

1. เปิด SQL Query node
2. ไปที่ Options tab
3. เพิ่ม Query Parameters:
   - Parameter: `where_clause`
   - Value: `{{ $json.where_clause }}`
4. ใช้ใน SQL query:
```sql
{{ $json.where_clause }}
```

---

## SQL Query ที่แก้ไขแล้ว (Monthly Sales)

```sql
SELECT
  DATE_FORMAT(h.inv_posting_date, '%Y-%m') AS month,
  DATE_FORMAT(h.inv_posting_date, '%Y') AS year,
  DATE_FORMAT(h.inv_posting_date, '%m') AS month_num,
  DATE_FORMAT(h.inv_posting_date, '%M %Y') AS month_name,
  COUNT(DISTINCT h.inv_no) AS invoice_count,
  COALESCE(SUM(l.inv_line_amount), 0) AS total_amount,
  COALESCE(SUM(l.inv_line_amount_vat), 0) AS total_vat,
  COALESCE(SUM(l.inv_line_amount), 0) + COALESCE(SUM(l.inv_line_amount_vat), 0) AS net_amount,
  COALESCE(AVG(l.inv_line_amount + l.inv_line_amount_vat), 0) AS avg_invoice_amount,
  COALESCE(MIN(l.inv_line_amount + l.inv_line_amount_vat), 0) AS min_invoice_amount,
  COALESCE(MAX(l.inv_line_amount + l.inv_line_amount_vat), 0) AS max_invoice_amount
FROM data_warehouse.service_posted_invoice_header h
LEFT JOIN data_warehouse.service_posted_invoice_line l
  ON l.inv_line_inv_no = h.inv_no
WHERE h.inv_posting_date IS NOT NULL
AND YEAR(h.inv_posting_date) = YEAR(CURDATE())
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

**หมายเหตุ:** Query นี้ใช้ WHERE clause แบบ static สำหรับทดสอบ ถ้าทำงานได้แล้วค่อยเปลี่ยนกลับไปใช้ `{{ $json.where_clause }}`

---

## Checklist สำหรับ Debug

- [ ] ทดสอบ SQL query โดยไม่มี WHERE clause
- [ ] ทดสอบ SQL query โดยใช้ WHERE clause แบบ static
- [ ] ตรวจสอบว่ามีข้อมูลใน database หรือไม่
- [ ] ตรวจสอบว่า `inv_posting_date` ไม่เป็น NULL
- [ ] ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่
- [ ] ตรวจสอบว่า WHERE Builder ส่ง `where_clause` มา
