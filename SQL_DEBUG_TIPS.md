# วิธี Debug SQL Query ที่ไม่มีข้อมูลออกมา

## ปัญหาที่พบบ่อย

### 1. WHERE clause ไม่ได้ถูก evaluate

**ตรวจสอบ:**
- เปิด Expression mode (`{{ }}`) ใน SQL Query node
- ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่
- ดู OUTPUT ของ WHERE Builder node ว่ามี `where_clause` field หรือไม่

**วิธีแก้ไข:**
- ใช้ WHERE clause แบบ static ก่อนเพื่อทดสอบ:
```sql
WHERE h.inv_posting_date IS NOT NULL
AND YEAR(h.inv_posting_date) = YEAR(CURDATE())
```

### 2. ไม่มีข้อมูลในปีนี้

**ตรวจสอบ:**
- ลอง query โดยไม่มี WHERE clause:
```sql
SELECT COUNT(*) as total
FROM data_warehouse.service_posted_invoice_header h
WHERE h.inv_posting_date IS NOT NULL
```

- ลอง query ปีที่แล้ว:
```sql
WHERE YEAR(h.inv_posting_date) = YEAR(CURDATE()) - 1
```

### 3. inv_posting_date เป็น NULL

**ตรวจสอบ:**
- ลอง query โดยไม่กรองวันที่:
```sql
SELECT COUNT(*) as total_with_date
FROM data_warehouse.service_posted_invoice_header h
WHERE h.inv_posting_date IS NOT NULL
```

### 4. JOIN ไม่ถูกต้อง

**ตรวจสอบ:**
- ลองใช้ INNER JOIN แทน LEFT JOIN:
```sql
FROM data_warehouse.service_posted_invoice_header h
INNER JOIN data_warehouse.service_posted_invoice_line l
  ON l.inv_line_inv_no = h.inv_no
```

---

## SQL Query สำหรับทดสอบ (Monthly Sales)

### Query 1: ทดสอบว่ามีข้อมูลหรือไม่

```sql
SELECT COUNT(*) as total_invoices
FROM data_warehouse.service_posted_invoice_header h
WHERE h.inv_posting_date IS NOT NULL
```

### Query 2: ทดสอบข้อมูลปีนี้

```sql
SELECT COUNT(*) as this_year_count
FROM data_warehouse.service_posted_invoice_header h
WHERE h.inv_posting_date IS NOT NULL
AND YEAR(h.inv_posting_date) = YEAR(CURDATE())
```

### Query 3: ทดสอบข้อมูลปีที่แล้ว

```sql
SELECT COUNT(*) as last_year_count
FROM data_warehouse.service_posted_invoice_header h
WHERE h.inv_posting_date IS NOT NULL
AND YEAR(h.inv_posting_date) = YEAR(CURDATE()) - 1
```

### Query 4: ทดสอบข้อมูลทั้งหมด (ไม่กรองปี)

```sql
SELECT
  DATE_FORMAT(h.inv_posting_date, '%Y-%m') AS month,
  COUNT(DISTINCT h.inv_no) AS invoice_count
FROM data_warehouse.service_posted_invoice_header h
WHERE h.inv_posting_date IS NOT NULL
GROUP BY DATE_FORMAT(h.inv_posting_date, '%Y-%m')
ORDER BY month DESC
LIMIT 12
```

### Query 5: ทดสอบข้อมูลพร้อม JOIN

```sql
SELECT
  DATE_FORMAT(h.inv_posting_date, '%Y-%m') AS month,
  COUNT(DISTINCT h.inv_no) AS invoice_count,
  COUNT(l.inv_line_inv_no) AS line_count
FROM data_warehouse.service_posted_invoice_header h
LEFT JOIN data_warehouse.service_posted_invoice_line l
  ON l.inv_line_inv_no = h.inv_no
WHERE h.inv_posting_date IS NOT NULL
GROUP BY DATE_FORMAT(h.inv_posting_date, '%Y-%m')
ORDER BY month DESC
LIMIT 12
```

---

## SQL Query ที่แก้ไขแล้ว (Monthly Sales)

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

## วิธีแก้ไข WHERE clause ใน n8n

### วิธีที่ 1: ใช้ Expression mode

1. เปิด SQL Query node
2. เปิด Expression mode (`{{ }}`)
3. ใช้ `{{ $json.where_clause }}` ใน WHERE clause

### วิธีที่ 2: ใช้ Query Parameters (แนะนำ)

1. เปิด SQL Query node
2. ไปที่ Options tab
3. เพิ่ม Query Parameters:
   - Parameter: `where_clause`
   - Value: `{{ $json.where_clause }}`
4. ใช้ใน SQL query:
```sql
WHERE 1=1
{{ $json.where_clause }}
```

### วิธีที่ 3: ใช้ Code node เพื่อสร้าง SQL query ทั้งหมด

```javascript
const whereClause = $json.where_clause || 'WHERE 1=1';
const sqlQuery = `
SELECT
  DATE_FORMAT(h.inv_posting_date, '%Y-%m') AS month,
  COUNT(DISTINCT h.inv_no) AS invoice_count,
  SUM(l.inv_line_amount) AS total_amount
FROM data_warehouse.service_posted_invoice_header h
LEFT JOIN data_warehouse.service_posted_invoice_line l
  ON l.inv_line_inv_no = h.inv_no
${whereClause}
AND h.inv_posting_date IS NOT NULL
GROUP BY DATE_FORMAT(h.inv_posting_date, '%Y-%m')
ORDER BY month DESC
`;

return [{
  ...$json,
  sql_query: sqlQuery
}];
```

แล้วใช้ `{{ $json.sql_query }}` ใน Execute SQL Query node

---

## Checklist สำหรับ Debug

- [ ] ตรวจสอบว่า WHERE Builder ส่ง `where_clause` มา
- [ ] ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่
- [ ] ทดสอบ SQL query โดยไม่มี WHERE clause
- [ ] ทดสอบ SQL query โดยใช้ WHERE clause แบบ static
- [ ] ตรวจสอบว่ามีข้อมูลใน database หรือไม่
- [ ] ตรวจสอบว่า `inv_posting_date` ไม่เป็น NULL
- [ ] ตรวจสอบว่า JOIN ถูกต้องหรือไม่
