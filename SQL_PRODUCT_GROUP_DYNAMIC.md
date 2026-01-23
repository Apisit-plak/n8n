# SQL Query สำหรับ Product Group Sales (Dynamic Grouping)

## คำอธิบาย

Query นี้รองรับการจัดกลุ่มสินค้าได้หลายแบบตาม `group_by` parameter:
- `number` - Group 1-9 (ตามตัวเลขหน้า)
- `brand` - ตามยี่ห้อ
- `ir_code` - ตาม IR Code (หมวดหมู่)
- `prefix` - ตาม Prefix (MC-, AP-, SP-)
- `item_type` - ตามประเภทสินค้า
- `department` - ตามศูนย์/หน่วยงาน

---

## SQL Query (Copy ทั้งหมดไปวางใน n8n):

```sql
SELECT
  {{ $json.group_by === 'brand' ? `
    l.inv_line_item_brand_name AS product_group,
    l.inv_line_item_brand_no AS group_code
  ` : '' }}
  
  {{ $json.group_by === 'ir_code' ? `
    l.inv_line_ir_code_name AS product_group,
    l.inv_line_ir_code AS group_code
  ` : '' }}
  
  {{ $json.group_by === 'prefix' ? `
    CASE 
      WHEN l.inv_line_item_no LIKE 'MC-%' THEN 'MC Series'
      WHEN l.inv_line_item_no LIKE 'AP-%' THEN 'AP Series'
      WHEN l.inv_line_item_no LIKE 'SP-%' THEN 'SP Series'
      WHEN l.inv_line_item_no LIKE 'LP-%' THEN 'LP Series'
      WHEN l.inv_line_item_no LIKE 'HP-%' THEN 'HP Series'
      ELSE 'Other Series'
    END AS product_group,
    SUBSTRING_INDEX(l.inv_line_item_no, '-', 1) AS group_code
  ` : '' }}
  
  {{ $json.group_by === 'item_type' ? `
    CASE
      WHEN l.inv_line_item_type = 1 THEN 'Product (สินค้า)'
      WHEN l.inv_line_item_type = 2 THEN 'Service (บริการ)'
      ELSE 'Other (อื่นๆ)'
    END AS product_group,
    l.inv_line_item_type AS group_code
  ` : '' }}
  
  {{ $json.group_by === 'department' ? `
    h.inv_department_name AS product_group,
    h.inv_department AS group_code
  ` : '' }}
  
  {{ !$json.group_by || $json.group_by === 'number' ? `
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
    SUBSTRING(l.inv_line_item_no, 1, 1) AS group_code
  ` : '' }}
  ,
  COUNT(DISTINCT l.inv_line_item_no) AS item_count,
  COUNT(DISTINCT l.inv_line_inv_no) AS invoice_count,
  SUM(l.inv_line_amount) AS total_amount,
  SUM(l.inv_line_amount_vat) AS total_amount_vat,
  SUM(l.inv_line_amount + l.inv_line_amount_vat) AS net_amount,
  SUM(l.inv_line_quantity) AS total_quantity,
  AVG(l.inv_line_amount) AS avg_item_amount,
  MIN(h.inv_posting_date) AS first_invoice_date,
  MAX(h.inv_posting_date) AS last_invoice_date
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
WHERE 1=1
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
  AND l.inv_line_item_no IS NOT NULL
  AND l.inv_line_item_no != ''
GROUP BY 
  product_group,
  group_code
HAVING COUNT(DISTINCT l.inv_line_item_no) > 0
ORDER BY total_amount DESC
LIMIT {{ $json.limit || 50 }}
```

---

## คำอธิบาย Query:

### 1. Dynamic SELECT based on group_by:

**Brand (ยี่ห้อ):**
```sql
l.inv_line_item_brand_name AS product_group,
l.inv_line_item_brand_no AS group_code
```

**IR Code (หมวดหมู่):**
```sql
l.inv_line_ir_code_name AS product_group,
l.inv_line_ir_code AS group_code
```

**Prefix (Series):**
```sql
CASE 
  WHEN l.inv_line_item_no LIKE 'MC-%' THEN 'MC Series'
  WHEN l.inv_line_item_no LIKE 'AP-%' THEN 'AP Series'
  ...
END AS product_group
```

**Item Type (ประเภท):**
```sql
CASE
  WHEN l.inv_line_item_type = 1 THEN 'Product (สินค้า)'
  WHEN l.inv_line_item_type = 2 THEN 'Service (บริการ)'
  ...
END AS product_group
```

**Department (ศูนย์):**
```sql
h.inv_department_name AS product_group,
h.inv_department AS group_code
```

**Number (Group 1-9) - Default:**
```sql
CASE 
  WHEN l.inv_line_item_no LIKE '1%' THEN 'Group 1'
  WHEN l.inv_line_item_no LIKE '2%' THEN 'Group 2'
  ...
END AS product_group
```

### 2. Aggregate Functions:
- `item_count` - จำนวนสินค้า
- `invoice_count` - จำนวน Invoice
- `total_amount` - ยอดรวมก่อน VAT
- `total_amount_vat` - VAT
- `net_amount` - ยอดรวมสุทธิ
- `total_quantity` - จำนวนรวม
- `avg_item_amount` - ยอดเฉลี่ย
- `first_invoice_date`, `last_invoice_date` - ช่วงเวลา

### 3. Time Period Conditions:
- Dynamic date filtering ตาม `time_period` parameter

### 4. GROUP BY:
- Group by `product_group` และ `group_code`

### 5. ORDER BY:
- เรียงตามยอดขาย (มากไปน้อย)

### 6. LIMIT:
- `LIMIT {{ $json.limit || 50 }}` - จำกัดแสดงตามที่ผู้ใช้ระบุ (default: 50)

**รูปแบบที่รองรับ:**
- `TOP 5` → limit: 5
- `10 brand` → limit: 10
- `brand 15` → limit: 15
- `แสดง 20` → limit: 20
- `ทั้งหมด` → limit: 100
- *(ไม่ระบุ)* → limit: 50 (default)

---

## ตัวอย่างคำถาม:

### 1. Group by Number (default):
```
product แยกตามกลุ่ม
TOP 5 กลุ่มปีนี้
```
→ `group_by: 'number'`, `limit: 50 (หรือตามที่ระบุ)`

### 2. Group by Brand:
```
product แยกตาม brand
TOP 10 brand 6 เดือน
ยอดขายแต่ละยี่ห้อ 15 ยี่ห้อ
```
→ `group_by: 'brand'`, `limit: 10 หรือ 15`

### 3. Group by IR Code:
```
product แยกตาม category
TOP 10 category ปีนี้
หมวดหมู่ไหนขายดีที่สุด 20 หมวด
```
→ `group_by: 'ir_code'`, `limit: 10 หรือ 20`

### 4. Group by Prefix:
```
product แยกตาม prefix
TOP 5 series
ยอดขาย series ต่างๆ 10 series
```
→ `group_by: 'prefix'`, `limit: 5 หรือ 10`

### 5. Group by Item Type:
```
product แยกตามประเภท
สินค้ากับบริการขายได้เท่าไหร่
```
→ `group_by: 'item_type'`, `limit: 50 (default)`

### 6. Group by Department:
```
product แยกตามศูนย์
TOP 10 ศูนย์ขายสินค้าอะไรบ้าง
```
→ `group_by: 'department'`, `limit: 10`

---

## ผลลัพธ์ที่คาดหวัง:

### Brand Example:
```
1. Sony - 50 สินค้า - 2,000,000 บาท (30%)
2. Samsung - 40 สินค้า - 1,500,000 บาท (22%)
3. Panasonic - 30 สินค้า - 1,200,000 บาท (18%)
...
```

### IR Code Example:
```
1. Electronics - 100 สินค้า - 5,000,000 บาท (40%)
2. Furniture - 80 สินค้า - 3,000,000 บาท (24%)
3. Accessories - 60 สินค้า - 2,000,000 บาท (16%)
...
```

### Prefix Example:
```
1. MC Series - 150 สินค้า - 8,000,000 บาท (50%)
2. AP Series - 100 สินค้า - 4,000,000 บาท (25%)
3. SP Series - 80 สินค้า - 3,000,000 บาท (19%)
...
```

---

## หมายเหตุ:

1. **Default Group By:** ถ้าไม่ระบุจะใช้ `number` (Group 1-9)
2. **Time Period:** รองรับทุก time period เหมือนเดิม
3. **No Data Handling:** Formatter จะจัดการกรณีไม่มีข้อมูล
4. **Limit:** 
   - **Default:** 50 กลุ่ม
   - **รองรับ:** `TOP 5`, `10 brand`, `แสดง 20`, `5 กลุ่ม`, `ทั้งหมด`
   - **Dynamic:** `LIMIT {{ $json.limit || 50 }}`
5. **HAVING Clause:** กรองเฉพาะกลุ่มที่มีสินค้า > 0

---

## การติดตั้งใน n8n:

1. เปิด **Execute SQL Query - Product Group Sales** node
2. คัดลอก SQL ด้านบนทั้งหมด
3. วางใน Query field
4. Save

---

**ตอนนี้รองรับการจัดกลุ่มได้ 6 แบบ!** 🎉
