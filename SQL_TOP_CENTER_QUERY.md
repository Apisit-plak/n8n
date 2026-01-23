# SQL Query สำหรับ Top Center (ศูนย์/หน่วยงานยอดขายเยอะสุด)

## SQL Query ที่ใช้ใน n8n

### วิธีใช้ใน n8n Execute SQL Node:

1. เพิ่ม **Execute SQL Query** node หลัง Switch node (route: top_center)
2. เลือก **Datawarehouse_test** credential
3. เลือก Operation: **Execute SQL**
4. วางโค้ด SQL ด้านล่างในช่อง Query
5. **สำคัญ:** ตรวจสอบให้แน่ใจว่าไม่มี `{{ $json.where_clause }}` เพราะจะทำให้ WHERE clause ซ้ำซ้อน

---

## SQL Query (Copy ทั้งหมดไปวางใน n8n):

```sql
SELECT
    h.inv_department AS department,
    h.inv_department_name AS department_name,
    COUNT(DISTINCT h.inv_no) AS invoice_count,
    COUNT(DISTINCT l.inv_line_item_no) AS item_count,
    SUM(l.inv_line_amount) AS total_amount,
    SUM(l.inv_line_amount_vat) AS total_vat,
    SUM(l.inv_line_amount) + SUM(l.inv_line_amount_vat) AS net_amount,
    AVG(l.inv_line_amount + l.inv_line_amount_vat) AS avg_invoice_amount,
    MIN(h.inv_posting_date) AS first_invoice_date,
    MAX(h.inv_posting_date) AS last_invoice_date,
    GROUP_CONCAT(DISTINCT h.inv_no ORDER BY h.inv_posting_date DESC SEPARATOR ', ' LIMIT 5) AS sample_invoices
FROM data_warehouse.service_posted_invoice_header h
LEFT JOIN data_warehouse.service_posted_invoice_line l
    ON l.inv_line_inv_no = h.inv_no
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
{{ $json.time_period && $json.time_period.period === 'week' && $json.time_period.value ? `
    AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL ${$json.time_period.value} WEEK)
` : '' }}
{{ $json.time_period && $json.time_period.period === 'day' && $json.time_period.value ? `
    AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL ${$json.time_period.value} DAY)
` : '' }}
{{ $json.time_period && $json.time_period.period === 'today' ? `
    AND DATE(h.inv_posting_date) = CURDATE()
` : '' }}
{{ $json.time_period && $json.time_period.period === 'yesterday' ? `
    AND DATE(h.inv_posting_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
` : '' }}
{{ $json.time_period && $json.time_period.period === 'date' && $json.time_period.year && $json.time_period.month ? `
    AND YEAR(h.inv_posting_date) = ${$json.time_period.year}
    AND MONTH(h.inv_posting_date) = ${$json.time_period.month}
` : '' }}
{{ $json.time_period && $json.time_period.period === 'date' && $json.time_period.year && !$json.time_period.month ? `
    AND YEAR(h.inv_posting_date) = ${$json.time_period.year}
` : '' }}
    AND h.inv_department IS NOT NULL
GROUP BY 
    h.inv_department,
    h.inv_department_name
ORDER BY total_amount DESC
LIMIT {{ $json.limit || 10 }}
```

---

## คำอธิบาย:

### 1. **Dynamic Time Period**
SQL query นี้รองรับ time_period หลายรูปแบบ:
- `this_year` - ปีนี้
- `last_year` - ปีที่แล้ว
- `this_month` - เดือนนี้
- `last_month` - เดือนที่แล้ว
- `month` + `value` - จำนวนเดือน (เช่น 3 เดือน, 6 เดือน)
- `year` + `value` - จำนวนปี (เช่น 1 ปี, 2 ปี)
- `week` + `value` - จำนวนสัปดาห์
- `day` + `value` - จำนวนวัน
- `today` - วันนี้
- `yesterday` - เมื่อวาน
- `date` + `year` + `month` - ระบุเดือนและปี

### 2. **Dynamic Limit**
- ใช้ `{{ $json.limit || 10 }}` เพื่อรองรับการระบุจำนวน
- ถ้าไม่ระบุจำนวน จะใช้ default = 10

### 3. **ข้อมูลที่แสดง**
- `department` - รหัสศูนย์/หน่วยงาน
- `department_name` - ชื่อศูนย์/หน่วยงาน
- `invoice_count` - จำนวน Invoice ทั้งหมด
- `item_count` - จำนวนสินค้าทั้งหมด
- `total_amount` - ยอดรวม (ไม่รวม VAT)
- `total_vat` - VAT รวม
- `net_amount` - ยอดรวมสุทธิ (รวม VAT)
- `avg_invoice_amount` - ยอดเฉลี่ยต่อ Invoice
- `first_invoice_date` - วันที่ Invoice แรก
- `last_invoice_date` - วันที่ Invoice ล่าสุด
- `sample_invoices` - ตัวอย่าง Invoice numbers (สูงสุด 5 รายการ)

---

## ตัวอย่างการใช้งาน:

### คำถาม: "ศูนย์ไหนยอดขายเยอะที่สุดในปีนี้"
**Input จาก Parser:**
```json
{
  "action": "top_center",
  "time_period": {
    "period": "this_year"
  },
  "limit": 10,
  "text": "ศูนย์ไหนยอดขายเยอะที่สุดในปีนี้",
  "session_id": "u_001"
}
```

**SQL ที่ถูก Execute:**
```sql
SELECT ...
WHERE 1=1
    AND YEAR(h.inv_posting_date) = YEAR(CURDATE())
    AND h.inv_department IS NOT NULL
GROUP BY ...
ORDER BY total_amount DESC
LIMIT 10
```

---

### คำถาม: "TOP 5 ศูนย์ยอดขาย 6 เดือน"
**Input จาก Parser:**
```json
{
  "action": "top_center",
  "time_period": {
    "period": "month",
    "value": 6
  },
  "limit": 5,
  "text": "TOP 5 ศูนย์ยอดขาย 6 เดือน",
  "session_id": "u_001"
}
```

**SQL ที่ถูก Execute:**
```sql
SELECT ...
WHERE 1=1
    AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    AND h.inv_department IS NOT NULL
GROUP BY ...
ORDER BY total_amount DESC
LIMIT 5
```

---

## หมายเหตุสำคัญ:

1. **ไม่ต้องใช้ WHERE Builder:**
   - SQL query นี้มี WHERE clause แบบ dynamic อยู่แล้ว
   - ไม่ต้องเพิ่ม Code node สำหรับสร้าง WHERE clause

2. **ใช้ Expression Mode:**
   - ใน n8n ต้องเลือก Expression mode (ไอคอน `{{ }}`)
   - Copy-paste SQL ทั้งหมดลงไป

3. **ตรวจสอบ Column Names:**
   - `h.inv_posting_date` - วันที่ออก Invoice
   - `h.inv_department` - รหัสศูนย์/หน่วยงาน
   - `h.inv_department_name` - ชื่อศูนย์/หน่วยงาน
   - ถ้า database ของคุณใช้ชื่อ column ต่างกัน ต้องแก้ไข

4. **Performance:**
   - ควรมี INDEX ที่ `inv_posting_date`
   - ควรมี INDEX ที่ `inv_department`
   - ถ้า query ช้า แนะนำให้เพิ่ม INDEX

---

## การทดสอบ:

1. **ทดสอบใน n8n:**
   - Execute workflow ด้วยคำถาม "ศูนย์ไหนยอดขายเยอะที่สุดในปีนี้"
   - ตรวจสอบ Output ว่ามีข้อมูลหรือไม่

2. **ตรวจสอบ Execution Log:**
   - ดู SQL ที่ถูก execute จริง
   - ตรวจสอบว่า WHERE clause ถูกสร้างถูกต้อง

3. **ถ้ายังไม่มีข้อมูล:**
   - ตรวจสอบว่า database มีข้อมูลในปีนี้หรือไม่
   - ลองเปลี่ยนเป็น `last_year` หรือ `month` + `value: 12`

---

## SQL แบบง่าย (สำหรับทดสอบ):

ถ้าต้องการทดสอบก่อน ลองใช้ SQL แบบง่ายนี้:

```sql
SELECT
    h.inv_department AS department,
    h.inv_department_name AS department_name,
    COUNT(DISTINCT h.inv_no) AS invoice_count,
    SUM(l.inv_line_amount) AS total_amount,
    SUM(l.inv_line_amount) + SUM(l.inv_line_amount_vat) AS net_amount
FROM data_warehouse.service_posted_invoice_header h
LEFT JOIN data_warehouse.service_posted_invoice_line l
    ON l.inv_line_inv_no = h.inv_no
WHERE 1=1
    AND YEAR(h.inv_posting_date) = YEAR(CURDATE())
    AND h.inv_department IS NOT NULL
GROUP BY 
    h.inv_department,
    h.inv_department_name
ORDER BY total_amount DESC
LIMIT 10
```

ถ้า SQL แบบง่ายนี้ทำงานได้ แสดงว่า database มีข้อมูล จากนั้นค่อยเปลี่ยนเป็น SQL แบบ dynamic
