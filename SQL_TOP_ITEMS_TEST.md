# SQL Query สำหรับทดสอบ Top Items

## ปัญหา: "No output data returned"

### วิธีแก้ไข 1: ใช้ LIMIT แบบ static ก่อน (สำหรับทดสอบ)

แทนที่ `LIMIT {{ $json.limit || 20 }}` ด้วย:

```sql
LIMIT 10
```

### วิธีแก้ไข 2: ใช้ Expression แบบอื่น

แทนที่ `LIMIT {{ $json.limit || 20 }}` ด้วย:

```sql
LIMIT {{ $json.limit ?? 20 }}
```

หรือ

```sql
LIMIT {{ $json.limit ? $json.limit : 20 }}
```

---

## Query สำหรับทดสอบ (ไม่มี WHERE clause)

### Query 1: ทดสอบว่ามีข้อมูลหรือไม่

```sql
SELECT
  l.inv_line_item_no           AS item_no,
  l.inv_line_description       AS item_description,
  SUM(l.inv_line_amount)      AS total_amount,
  SUM(l.inv_line_amount_vat)  AS total_amount_vat,
  SUM(l.inv_line_quantity)    AS total_quantity,
  COUNT(DISTINCT l.inv_line_inv_no) AS invoice_count,
  AVG(l.inv_line_amount)       AS avg_amount
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
WHERE l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
GROUP BY 
  l.inv_line_item_no,
  l.inv_line_description
ORDER BY total_amount DESC
LIMIT 10
```

### Query 2: ทดสอบข้อมูล 2 เดือนล่าสุด (WHERE clause แบบ static)

```sql
SELECT
  l.inv_line_item_no           AS item_no,
  l.inv_line_description       AS item_description,
  SUM(l.inv_line_amount)      AS total_amount,
  SUM(l.inv_line_amount_vat)  AS total_amount_vat,
  SUM(l.inv_line_quantity)    AS total_quantity,
  COUNT(DISTINCT l.inv_line_inv_no) AS invoice_count,
  AVG(l.inv_line_amount)       AS avg_amount
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
WHERE h.inv_posting_date IS NOT NULL
AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
AND l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
GROUP BY 
  l.inv_line_item_no,
  l.inv_line_description
ORDER BY total_amount DESC
LIMIT 10
```

### Query 3: ทดสอบข้อมูลทั้งหมด (ไม่กรองเวลา)

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

## SQL Query ที่แก้ไขแล้ว (Top Items)

### วิธีที่ 1: ใช้ LIMIT แบบ static (แนะนำสำหรับทดสอบ)

```sql
SELECT
  l.inv_line_item_no           AS item_no,
  l.inv_line_description       AS item_description,
  SUM(l.inv_line_amount)      AS total_amount,
  SUM(l.inv_line_amount_vat)  AS total_amount_vat,
  SUM(l.inv_line_quantity)    AS total_quantity,
  COUNT(DISTINCT l.inv_line_inv_no) AS invoice_count,
  AVG(l.inv_line_amount)       AS avg_amount
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
{{ $json.where_clause }}
AND l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
GROUP BY 
  l.inv_line_item_no,
  l.inv_line_description
ORDER BY total_amount DESC
LIMIT 10
```

### วิธีที่ 2: ใช้ Expression แบบ conditional

```sql
SELECT
  l.inv_line_item_no           AS item_no,
  l.inv_line_description       AS item_description,
  SUM(l.inv_line_amount)      AS total_amount,
  SUM(l.inv_line_amount_vat)  AS total_amount_vat,
  SUM(l.inv_line_quantity)    AS total_quantity,
  COUNT(DISTINCT l.inv_line_inv_no) AS invoice_count,
  AVG(l.inv_line_amount)       AS avg_amount
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
{{ $json.where_clause }}
AND l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
GROUP BY 
  l.inv_line_item_no,
  l.inv_line_description
ORDER BY total_amount DESC
LIMIT {{ $json.limit ? $json.limit : 10 }}
```

---

## Checklist สำหรับ Debug

- [ ] ทดสอบ SQL query โดยไม่มี WHERE clause (Query 1)
- [ ] ทดสอบ SQL query โดยใช้ WHERE clause แบบ static (Query 2)
- [ ] ตรวจสอบว่ามีข้อมูลใน database หรือไม่
- [ ] ตรวจสอบว่า `inv_line_item_no` ไม่เป็น NULL
- [ ] ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่
- [ ] ตรวจสอบว่า `{{ $json.limit }}` ถูก evaluate หรือไม่
- [ ] ใช้ LIMIT แบบ static ก่อน (LIMIT 10)
- [ ] ตรวจสอบว่า Expression mode (`{{ }}`) เปิดอยู่หรือไม่

---

## หมายเหตุ

- **Expression Mode:** ต้องเปิด Expression mode (`{{ }}`) ใน SQL Query node
- **LIMIT Expression:** n8n อาจไม่รองรับ `||` operator ใน LIMIT clause ให้ใช้ `? :` แทน
- **WHERE Clause:** ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่
