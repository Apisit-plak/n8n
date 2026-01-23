# SQL Query สำหรับ Sales Performance (ยอดขายของเซลส์)

## คำอธิบาย

Query นี้ใช้สำหรับดูยอดขายของเซลส์แต่ละคน รองรับ:
- ค้นหาตามชื่อเซลส์ (เช่น "เซลส์ สมชาย")
- TOP 10 เซลส์ยอดเยอะสุด
- กรองตาม time period

---

## SQL Query (Copy ทั้งหมดไปวางใน n8n):

```sql
SELECT
    h.inv_sales_person AS sales_person_code,
    h.inv_sales_person_name AS sales_person_name,
    COUNT(DISTINCT h.inv_no) AS invoice_count,
    COUNT(DISTINCT h.inv_customer_no) AS customer_count,
    COUNT(DISTINCT l.inv_line_item_no) AS product_count,
    SUM(l.inv_line_amount) AS total_amount,
    SUM(l.inv_line_amount_vat) AS total_vat,
    SUM(l.inv_line_amount + l.inv_line_amount_vat) AS net_amount,
    SUM(l.inv_line_quantity) AS total_quantity,
    AVG(l.inv_line_amount + l.inv_line_amount_vat) AS avg_invoice_amount,
    MIN(h.inv_posting_date) AS first_invoice_date,
    MAX(h.inv_posting_date) AS last_invoice_date,
    GROUP_CONCAT(DISTINCT h.inv_customer_name ORDER BY h.inv_customer_name SEPARATOR ', ' LIMIT 5) AS top_customers,
    GROUP_CONCAT(DISTINCT h.inv_department_name ORDER BY h.inv_department_name SEPARATOR ', ') AS departments
FROM data_warehouse.service_posted_invoice_header h
LEFT JOIN data_warehouse.service_posted_invoice_line l
    ON h.inv_no = l.inv_line_inv_no
WHERE 1=1
{{ $json.sales_person_name ? `
    AND (h.inv_sales_person_name LIKE '%${$json.sales_person_name}%' 
         OR h.inv_sales_person LIKE '%${$json.sales_person_name}%')
` : '' }}
{{ $json.time_period && $json.time_period.period === 'this_year' ? `
    AND YEAR(h.inv_posting_date) = YEAR(CURDATE())
` : '' }}
{{ $json.time_period && $json.time_period.period === 'last_year' ? `
    AND YEAR(h.inv_posting_date) = YEAR(CURDATE()) - 1
` : '' }}
{{ $json.time_period && $json.time_period.period === 'this_month' ? `
    AND YEAR(h.inv_posting_date) = YEAR(CURDATE())
    AND MONTH(h.inv_posting_date) = MONTH(CURDATE())
` : '' }}
{{ $json.time_period && $json.time_period.period === 'last_month' ? `
    AND YEAR(h.inv_posting_date) = YEAR(CURDATE())
    AND MONTH(h.inv_posting_date) = MONTH(CURDATE()) - 1
` : '' }}
{{ $json.time_period && $json.time_period.period === 'month' && $json.time_period.value ? `
    AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL ${$json.time_period.value} MONTH)
` : '' }}
{{ $json.time_period && $json.time_period.period === 'year' && $json.time_period.value ? `
    AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL ${$json.time_period.value} YEAR)
` : '' }}
    AND h.inv_sales_person IS NOT NULL
    AND h.inv_sales_person != ''
GROUP BY
    h.inv_sales_person,
    h.inv_sales_person_name
HAVING COUNT(DISTINCT h.inv_no) > 0
ORDER BY net_amount DESC
LIMIT {{ $json.limit || 10 }}
```

---

## คำอธิบาย Query:

### 1. SELECT Columns:
- `sales_person_code`, `sales_person_name` - รหัสและชื่อเซลส์
- `invoice_count` - จำนวน Invoice
- `customer_count` - จำนวนลูกค้า
- `product_count` - จำนวนสินค้าที่ขาย
- `total_amount` - ยอดรวมก่อน VAT
- `total_vat` - VAT
- `net_amount` - ยอดรวมสุทธิ
- `total_quantity` - จำนวนสินค้ารวม
- `avg_invoice_amount` - ยอดเฉลี่ยต่อ Invoice
- `first_invoice_date`, `last_invoice_date` - ช่วงเวลา
- `top_customers` - ตัวอย่างลูกค้า (5 คนแรก)
- `departments` - ศูนย์/หน่วยงานที่เซลส์ดูแล

### 2. FROM Tables:
- `service_posted_invoice_header` (h) - ข้อมูล Invoice header (มีชื่อเซลส์)
- `service_posted_invoice_line` (l) - ข้อมูล line items (ยอดขาย)

### 3. WHERE Conditions:

**กรองตามชื่อเซลส์:**
```sql
AND (h.inv_sales_person_name LIKE '%[ชื่อ]%' 
     OR h.inv_sales_person LIKE '%[ชื่อ]%')
```

**กรองตาม Time Period:**
- Dynamic date conditions ตาม `time_period` parameter
- รองรับ: this_year, last_year, this_month, 6 เดือน, 1 ปี, etc.

**กรองข้อมูล NULL:**
```sql
AND h.inv_sales_person IS NOT NULL
AND h.inv_sales_person != ''
```

### 4. GROUP BY:
- Group by `inv_sales_person` และ `inv_sales_person_name`

### 5. HAVING:
- `COUNT(DISTINCT h.inv_no) > 0` - ต้องมี Invoice อย่างน้อย 1 ใบ

### 6. ORDER BY:
- `net_amount DESC` - เรียงตามยอดขายสุทธิ (มากไปน้อย)

### 7. LIMIT:
- `{{ $json.limit || 10 }}` - จำกัดแสดงตามที่ระบุ (default: 10)

---

## ตัวอย่างคำถาม:

### 1. ดูเซลส์ทั้งหมด (TOP 10):
```
TOP 10 เซลส์ยอดเยอะสุด
เซลส์ไหนขายดีที่สุด 6 เดือน
```
→ `sales_person_name: null`, `limit: 10`

### 2. ค้นหาเซลส์คนใดคนหนึ่ง:
```
เซลส์ สมชาย มี invoice เท่าไหร่
เซลส์ สมศักดิ์ ขายได้เท่าไหร่ปีนี้
```
→ `sales_person_name: "สมชาย"`, `limit: 10`

### 3. TOP N + Time Period:
```
TOP 5 เซลส์ปีนี้
TOP 10 เซลส์ 6 เดือน
```
→ `limit: 5 หรือ 10`, `time_period: { ... }`

### 4. ทั้งหมด:
```
เซลส์ทั้งหมดขายได้เท่าไหร่
```
→ `limit: 100`

---

## ผลลัพธ์ที่คาดหวัง:

```
1. สมชาย วัฒนา (S001)
   💰 ยอดรวม: 5,000,000.00 บาท
   📄 Invoice: 150 ใบ
   👥 ลูกค้า: 25 ราย
   📦 สินค้า: 80 รายการ
   📊 เฉลี่ย: 33,333.33 บาท/ใบ
   📅 ช่วงเวลา: 2025-01-01 ถึง 2026-01-20
   
2. สมศักดิ์ ใจดี (S002)
   💰 ยอดรวม: 4,500,000.00 บาท
   ...
```

---

## หมายเหตุสำคัญ:

1. **Sales Person from Header:**
   - ใช้ `h.inv_sales_person_name` และ `h.inv_sales_person`
   - ไม่ใช่ `l.inv_line_sales_person` (จาก line)

2. **Time Period Optional:**
   - ถ้าไม่ระบุจะแสดงข้อมูลทั้งหมด

3. **Limit Support:**
   - Default: 10 คน
   - รองรับ: `TOP 5`, `10 คน`, `ทั้งหมด`

4. **Name Filter:**
   - ใช้ LIKE '%...%' เพื่อค้นหาบางส่วน
   - กรองทั้ง `inv_sales_person_name` และ `inv_sales_person`

5. **No Data Handling:**
   - Formatter จะจัดการกรณีไม่มีข้อมูล

---

## Switch Node Configuration:

เพิ่ม route ใหม่ใน Switch node:

```
Route 8 (เพิ่มใหม่):
- Output: 8
- Expression: {{ $json.action === "sales_performance" }}
```

เชื่อมต่อ output 8 → SQL node → Formatter → Respond to Webhook

---

## การติดตั้งใน n8n:

### 1. อัพเดท Parser ✅ (เสร็จแล้ว)

### 2. เพิ่ม Route ใน Switch Node
- Output 8: `sales_performance`

### 3. เพิ่ม Execute SQL Node
1. เพิ่ม **MySQL** node (Execute SQL)
2. เชื่อม output 8 จาก Switch node
3. ตั้งค่า:
   - **Credential:** `Datawarehouse_test`
   - **Operation:** `Execute Query`
   - **Query:** คัดลอกจากด้านบน
4. ไปที่ **Settings** tab:
   - ✅ เปิด **Continue on Fail**
   - ✅ เปิด **Always Output Data**

### 4. เพิ่ม Formatter (Code Node)
- ใช้โค้ดจาก `FORMATTER_SALES_PERFORMANCE.js`

### 5. เชื่อมกับ Respond to Webhook

---

**ตอนนี้พร้อมใช้งานแล้ว!** 🎉
