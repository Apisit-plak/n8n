# แก้ไขปัญหา: มีข้อมูลใน Database แต่ n8n ไม่มีข้อมูลออกมา

## 🔍 ปัญหา

- ✅ มีข้อมูลใน database (566 records, 339 unique items, 243 unique invoices)
- ❌ n8n ไม่มีข้อมูลออกมา ("No output data returned")

---

## ✅ วิธีแก้ไข

### 1. ตรวจสอบว่า SQL Query สมบูรณ์หรือไม่

**SQL Query ต้องมีส่วนต่อไปนี้ครบถ้วน:**

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

**สำคัญ:** ต้องมี **GROUP BY**, **HAVING**, **ORDER BY**, **LIMIT** ครบถ้วน

---

### 2. ตรวจสอบว่า Expression ถูก evaluate หรือไม่

#### วิธีที่ 1: ตรวจสอบ OUTPUT ของ WHERE Builder

1. เปิด WHERE Builder node
2. ดู OUTPUT ว่ามี `where_clause` หรือไม่
3. ตรวจสอบว่า `where_clause` มีค่า: `WHERE 1=1 AND YEAR(h.inv_posting_date) = YEAR(CURDATE()) AND MONTH(h.inv_posting_date) = MONTH(CURDATE())`

#### วิธีที่ 2: ทดสอบด้วย Query แบบ Static

แทนที่ `{{ $json.where_clause }}` ด้วย:

```sql
WHERE 1=1
AND YEAR(h.inv_posting_date) = YEAR(CURDATE())
AND MONTH(h.inv_posting_date) = MONTH(CURDATE())
```

**ถ้า query นี้มีข้อมูล:** แสดงว่า Expression `{{ $json.where_clause }}` ไม่ถูก evaluate

---

### 3. ตรวจสอบว่าเปิด Expression Mode หรือไม่

1. เปิด Execute SQL Query node
2. ไปที่ Query field
3. ตรวจสอบว่าเปิด Expression mode (`{{ }}`) หรือไม่
4. ถ้าไม่เปิด → เปิด Expression mode

**วิธีเปิด Expression Mode:**
- คลิกที่ไอคอน `{{ }}` ด้านขวาของ Query field
- หรือกด `Ctrl + Space` ใน Query field

---

### 4. ตรวจสอบว่า SQL Query มี GROUP BY, HAVING, ORDER BY, LIMIT หรือไม่

**จากภาพที่เห็น SQL query อาจขาดส่วนท้าย:**

ตรวจสอบว่า SQL query มีส่วนต่อไปนี้:

```sql
GROUP BY 
  l.inv_line_item_no,
  l.inv_line_description
HAVING COUNT(DISTINCT l.inv_line_inv_no) > 0
ORDER BY total_amount DESC
LIMIT {{ $json.limit ? $json.limit : 10 }}
```

**ถ้าไม่มี:** Copy ส่วนนี้ไปเพิ่มต่อท้าย SQL query

---

### 5. ทดสอบด้วย Query แบบ Static (ไม่ใช้ Expression)

แทนที่ SQL query ทั้งหมดด้วย:

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

**ถ้า query นี้มีข้อมูล:** แสดงว่า Expression มีปัญหา

---

## ✅ Checklist สำหรับแก้ไข

- [ ] SQL query มี GROUP BY, HAVING, ORDER BY, LIMIT ครบถ้วน
- [ ] เปิด Expression mode (`{{ }}`) ใน SQL Query node
- [ ] ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่
- [ ] ทดสอบด้วย Query แบบ static (ไม่ใช้ Expression)
- [ ] ตรวจสอบ OUTPUT ของ WHERE Builder node
- [ ] ตรวจสอบว่า SQL query สมบูรณ์ (scroll ลงไปดูส่วนท้าย)

---

## 🔍 Debug Steps

### Step 1: ตรวจสอบ SQL Query ให้สมบูรณ์

1. เปิด Execute SQL Query node
2. Scroll ลงไปดูส่วนท้ายของ SQL query
3. ตรวจสอบว่ามี GROUP BY, HAVING, ORDER BY, LIMIT หรือไม่
4. ถ้าไม่มี → Copy จาก `SQL_QUERIES_N8N.md` Query 3 ไปวาง

### Step 2: ตรวจสอบ Expression Mode

1. เปิด Execute SQL Query node
2. ดูที่ Query field
3. ตรวจสอบว่าเปิด Expression mode (`{{ }}`) หรือไม่
4. ถ้าไม่เปิด → เปิด Expression mode

### Step 3: ทดสอบด้วย Query แบบ Static

1. Copy Query แบบ static (จากวิธีแก้ไขข้อ 5) ไปวางใน SQL Query node
2. Execute workflow
3. ถ้ามีข้อมูล → แสดงว่า Expression มีปัญหา
4. ถ้าไม่มีข้อมูล → แสดงว่ามีปัญหาอื่น

---

## 📝 หมายเหตุ

- **Expression Mode:** ต้องเปิด Expression mode (`{{ }}`) เพื่อใช้ `{{ $json.where_clause }}`
- **SQL Query:** ต้องมี GROUP BY, HAVING, ORDER BY, LIMIT ครบถ้วน
- **WHERE Clause:** ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่
