# SQL Query สำหรับ Item Centers (สินค้า XXX ขายได้ศูนย์ไหนบ้าง)

## คำอธิบาย

Query นี้ใช้สำหรับค้นหา**ศูนย์/หน่วยงานที่ขายสินค้าตัวใดตัวหนึ่ง** (เช่น "สินค้า MC-1002 ขายได้ศูนย์ไหนบ้าง")

---

## SQL Query ที่ใช้ใน n8n

### วิธีใช้ใน n8n Execute SQL Node:

1. เพิ่ม **Execute SQL Query** node หลัง Switch node (route: **item_centers**)
2. เลือก **Datawarehouse_test** credential
3. เลือก Operation: **Execute SQL**
4. วางโค้ด SQL ด้านล่างในช่อง Query
5. **สำคัญ:** ใช้ `{{ $json.item_no }}` เพื่อดึง item number จาก parser

---

## SQL Query (Copy ทั้งหมดไปวางใน n8n):

```sql
SELECT
    h.inv_department AS department,
    h.inv_department_name AS department_name,
    COUNT(DISTINCT h.inv_no) AS invoice_count,
    SUM(l.inv_line_quantity) AS total_quantity,
    SUM(l.inv_line_amount) AS total_amount,
    SUM(l.inv_line_amount_vat) AS total_vat,
    SUM(l.inv_line_amount + l.inv_line_amount_vat) AS net_amount,
    AVG(l.inv_line_amount + l.inv_line_amount_vat) AS avg_amount,
    MIN(h.inv_posting_date) AS first_invoice_date,
    MAX(h.inv_posting_date) AS last_invoice_date,
    l.inv_line_description AS item_description,
    l.inv_line_item_no AS item_no,
    GROUP_CONCAT(DISTINCT h.inv_no ORDER BY h.inv_posting_date DESC SEPARATOR ', ' LIMIT 5) AS sample_invoices
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
    ON h.inv_no = l.inv_line_inv_no
WHERE 1=1
{{ $json.item_no ? `
    AND l.inv_line_item_no = '${$json.item_no}'
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
    AND h.inv_department IS NOT NULL
    AND l.inv_line_item_no IS NOT NULL
GROUP BY
    h.inv_department,
    h.inv_department_name,
    l.inv_line_item_no,
    l.inv_line_description
ORDER BY total_amount DESC
LIMIT {{ $json.limit || 10 }}
```

---

## คำอธิบาย Query:

### 1. SELECT Columns:
- `department`, `department_name` - ศูนย์/หน่วยงาน
- `invoice_count` - จำนวน Invoice
- `total_quantity` - จำนวนสินค้าที่ขาย
- `total_amount` - ยอดรวมก่อน VAT
- `total_vat` - VAT
- `net_amount` - ยอดรวมสุทธิ
- `avg_amount` - ยอดเฉลี่ย
- `first_invoice_date`, `last_invoice_date` - วันที่ Invoice แรกและล่าสุด
- `item_description`, `item_no` - รายละเอียดสินค้า
- `sample_invoices` - ตัวอย่าง Invoice numbers

### 2. FROM Tables:
- `service_posted_invoice_line` (l) - ข้อมูลสินค้าในแต่ละ Invoice
- `service_posted_invoice_header` (h) - ข้อมูล Invoice header (join เพื่อดูศูนย์/หน่วยงาน)

### 3. WHERE Conditions:
- `l.inv_line_item_no = '{{ $json.item_no }}'` - กรองตาม item number ที่ระบุ
- Dynamic date conditions ตาม `time_period` จาก parser
- `h.inv_department IS NOT NULL` - ต้องมีข้อมูลศูนย์/หน่วยงาน

### 4. GROUP BY:
- Group by `department`, `department_name`, `item_no`, `item_description`
- เพื่อแสดงยอดขายของสินค้านี้ในแต่ละศูนย์

### 5. ORDER BY:
- `total_amount DESC` - เรียงตามยอดขายมากไปน้อย

### 6. LIMIT:
- `LIMIT {{ $json.limit || 10 }}` - จำกัดแสดงตามที่ผู้ใช้ระบุ (default: 10 ศูนย์)

---

## ตัวอย่างผลลัพธ์:

```
department | department_name      | invoice_count | total_quantity | total_amount | net_amount   | avg_amount | first_invoice_date | last_invoice_date | item_no    | item_description
-----------|---------------------|---------------|----------------|--------------|--------------|------------|-------------------|-------------------|------------|------------------
100        | ศูนย์กรุงเทพ         | 25            | 150            | 500,000      | 535,000      | 21,400     | 2025-01-01        | 2026-01-20        | MC-1002    | สินค้า ABC
200        | ศูนย์เชียงใหม่       | 15            | 80             | 300,000      | 321,000      | 21,400     | 2025-02-15        | 2026-01-15        | MC-1002    | สินค้า ABC
300        | ศูนย์ภูเก็ต          | 10            | 50             | 200,000      | 214,000      | 21,400     | 2025-03-01        | 2026-01-10        | MC-1002    | สินค้า ABC
```

---

## หมายเหตุ:

1. **Item Number Required**: ต้องมี `item_no` จาก parser ไม่งั้น query จะ return ข้อมูลทุกสินค้า
2. **Time Period Optional**: ถ้าไม่ระบุ time_period จะแสดงข้อมูลทั้งหมด
3. **Department from Header**: ใช้ `h.inv_department` (จาก header) แทน `l.inv_line_department` (จาก line)
   - เพราะต้องการดูว่า**ศูนย์/หน่วยงานไหนขายสินค้านี้** (ไม่ใช่ศูนย์ที่เก็บสินค้า)
4. **No Data Handling**: ถ้าไม่มีข้อมูลจะ return empty array (0 rows) - ต้องจัดการใน formatter

---

## การทดสอบ:

### ตัวอย่างคำถาม:
1. `สินค้า MC-1002 ขายได้ศูนย์ไหนบ้าง`
2. `MC-AP-1001 ขายได้หน่วยไหน`
3. `product MC-1002 มีศูนย์ไหนขายบ้าง 6 เดือน`
4. `สินค้า XX-YY-123 ขายได้ SBU ไหนปีนี้`

### ผลลัพธ์ที่คาดหวัง:
- แสดงรายการศูนย์/หน่วยงานที่ขายสินค้านี้
- เรียงตามยอดขาย (มากไปน้อย)
- แสดงจำนวน Invoice, จำนวนสินค้า, ยอดรวม
- แสดงวันที่ Invoice แรกและล่าสุด
- แสดงตัวอย่าง Invoice numbers

---

## Switch Node Configuration:

เพิ่ม route ใหม่ใน Switch node:

```
Route 7 (เพิ่มใหม่):
- Output: 7
- Expression: {{ $json.action === "item_centers" }}
```

เชื่อมต่อ output 7 กับ Execute SQL node ที่ใช้ query นี้
