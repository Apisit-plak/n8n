# Flow หลัง Switch Node

## ใช่! หลัง Switch Node จะเป็น SQL Query แยกกัน

### Flow Structure:

```
[ถูก] (JavaScript: return action)
  ↓
[Switch - Route by Action]
  ├─ (action = 'invoice_detail')
  │   ↓
  │   [Execute SQL Query - Invoice Detail] ← SQL Query แยกตัวที่ 1
  │   (Query จาก invoice_line)
  │   ↓
  │   [If: ตรวจสอบผลลัพธ์]
  │   ↓
  │   [Code in JavaScript: Format Invoice Detail]
  │   ↓
  │   [Reply to user]
  │
  ├─ (action = 'customer_invoices')
  │   ↓
  │   [Execute SQL Query - Customer Invoices] ← SQL Query แยกตัวที่ 2
  │   (Query จาก invoice_header)
  │   ↓
  │   [Code in JavaScript: Format Customer Invoices]
  │   ↓
  │   [Reply to user]
  │
  └─ (fallback/อื่นๆ)
      ↓
      [JavaScript: Return error message]
      ↓
      [Respond to Webhook]
```

## SQL Query แยกกัน 2 ตัว

### 1. Execute SQL Query - Invoice Detail

**ใช้เมื่อ**: `action = 'invoice_detail'` (พิมพ์ IV0303304)

**Query**:
```sql
SELECT
  l.inv_line_inv_no            AS invoice_no,
  l.inv_line_customer_no       AS customer_no,
  l.inv_line_customer_name     AS customer_name,
  l.inv_line_department        AS department,
  l.inv_line_department_name   AS department_name,
  l.inv_line_sales_person      AS sales_person,
  l.inv_line_sales_person_name AS sales_person_name,
  l.inv_line_no,
  l.inv_line_item_no,
  l.inv_line_description,
  l.inv_line_quantity,
  l.inv_line_unit,
  l.inv_unit_price,
  l.inv_line_amount,
  l.inv_line_amount_vat
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
WHERE l.inv_line_inv_no = '{{ $json.invoice_no }}'
ORDER BY l.inv_line_no
```

**Output**: Array of invoice line items (หลาย rows)

### 2. Execute SQL Query - Customer Invoices

**ใช้เมื่อ**: `action = 'customer_invoices'` (พิมพ์ "ชื่อลูกค้า invoice")

**Query**:
```sql
SELECT
  h.inv_no                    AS invoice_no,
  h.customer_no               AS customer_no,
  h.customer_name             AS customer_name,
  h.department                AS department,
  h.department_name          AS department_name,
  h.sales_person              AS sales_person,
  h.sales_person_name        AS sales_person_name,
  h.inv_date                  AS invoice_date,
  h.total_amount              AS total_amount,
  h.total_amount_vat          AS total_amount_vat,
  h.grand_total               AS grand_total
FROM data_warehouse.service_posted_invoice_header h
WHERE h.customer_name LIKE '%' || '{{ $json.customer_name }}' || '%'
ORDER BY h.inv_date DESC
```

**Output**: Array of invoice headers (หลาย rows)

## JavaScript Node ก็แยกกัน

### 1. Code in JavaScript - Format Invoice Detail

**ใช้เมื่อ**: หลัง SQL Query - Invoice Detail

**Code**: จัดรูปแบบ invoice พร้อม line items

### 2. Code in JavaScript - Format Customer Invoices

**ใช้เมื่อ**: หลัง SQL Query - Customer Invoices

**Code**: จัดรูปแบบรายการ invoices ของลูกค้า

## สรุป

### ✅ ใช่! SQL Query แยกกัน 2 ตัว:

1. **Invoice Detail Query** - Query จาก `invoice_line` table
   - ใช้เมื่อ: `action = 'invoice_detail'`
   - ดึง: รายละเอียด invoice พร้อม line items

2. **Customer Invoices Query** - Query จาก `invoice_header` table
   - ใช้เมื่อ: `action = 'customer_invoices'`
   - ดึง: รายการ invoices ทั้งหมดของลูกค้า

### ✅ JavaScript Node ก็แยกกัน 2 ตัว:

1. **Format Invoice Detail** - จัดรูปแบบ invoice detail
2. **Format Customer Invoices** - จัดรูปแบบ customer invoices list

## ตัวอย่าง Flow

### Flow 1: Query Invoice Detail
```
Input: "IV0303304"
  ↓
[ถูก] → action: 'invoice_detail', invoice_no: 'IV0303304'
  ↓
[Switch] → Route to Invoice Detail
  ↓
[SQL Query - Invoice Detail] → Query invoice_line
  ↓
[Format Invoice Detail] → แสดง invoice พร้อม line items
  ↓
[Reply to user]
```

### Flow 2: Query Customer Invoices
```
Input: "การ์เดียนอินดัสทรีส์ invoice"
  ↓
[ถูก] → action: 'customer_invoices', customer_name: 'การ์เดียนอินดัสทรีส์'
  ↓
[Switch] → Route to Customer Invoices
  ↓
[SQL Query - Customer Invoices] → Query invoice_header
  ↓
[Format Customer Invoices] → แสดงรายการ invoices
  ↓
[Reply to user]
```

## Tips

1. **SQL Query แยกกัน** - แต่ละ query มีจุดประสงค์ต่างกัน
2. **JavaScript แยกกัน** - แต่ละ formatter จัดรูปแบบผลลัพธ์ต่างกัน
3. **Switch Node** - แยก flow ตาม action
4. **Response เดียวกัน** - ทั้งสอง flow ไปที่ "Reply to user" เดียวกัน

