# คู่มือการตั้งค่า Switch Node สำหรับ Routing

## ภาพรวม
Switch node ใช้สำหรับ route คำถามไปยัง workflow ที่เหมาะสมตาม `action` field ที่ parser ส่งมา

## Switch Node Configuration

### Mode: Rules

ตั้งค่า Switch node เป็น **"Rules"** mode และเพิ่ม rules ตามนี้:

---

### Rule 1: invoice_detail
**Condition:**
- Field: `action`
- Operation: `Equal`
- Value: `invoice_detail`

**Output:** เชื่อมต่อไปยัง "Execute SQL Query - Invoice Detail" node

---

### Rule 2: customer_invoices
**Condition:**
- Field: `action`
- Operation: `Equal`
- Value: `customer_invoices`

**Output:** เชื่อมต่อไปยัง "Execute SQL Query - Customer Invoices" node

---

### Rule 3: top_items
**Condition:**
- Field: `action`
- Operation: `Equal`
- Value: `top_items`

**Output:** เชื่อมต่อไปยัง "Execute SQL Query - Top Items" node

---

### Rule 4: top_center
**Condition:**
- Field: `action`
- Operation: `Equal`
- Value: `top_center`

**Output:** เชื่อมต่อไปยัง "Execute SQL Query - Top Center" node

---

### Rule 5: monthly_sales
**Condition:**
- Field: `action`
- Operation: `Equal`
- Value: `monthly_sales`

**Output:** เชื่อมต่อไปยัง "Execute SQL Query - Monthly Sales" node

---

### Rule 6: product_group_sales
**Condition:**
- Field: `action`
- Operation: `Equal`
- Value: `product_group_sales`

**Output:** เชื่อมต่อไปยัง "Execute SQL Query - Product Group Sales" node

---

### Rule 7: missing_name
**Condition:**
- Field: `action`
- Operation: `Equal`
- Value: `missing_name`

**Output:** เชื่อมต่อไปยัง "Respond to Webhook" node (ส่ง error message)

---

### Rule 8: unknown (Fallback)
**Condition:**
- Field: `action`
- Operation: `Equal`
- Value: `unknown`

**Output:** เชื่อมต่อไปยัง "Respond to Webhook" node (ส่ง help message)

---

## Workflow Structure

```
Webhook
  ↓
Code (Parser) - n8n_code_parser.js
  ↓
Switch (Route by Action) - 8 rules
  ├─ invoice_detail
  │   ↓
  │   Code (WHERE Builder) - SQL_WHERE_BUILDER.js (ถ้าจำเป็น)
  │   ↓
  │   Execute SQL Query - Invoice Detail
  │   ↓
  │   If (มีข้อมูล?)
  │   ├─ True → Code (Format) → Respond to Webhook
  │   └─ False → Code (Error) → Respond to Webhook
  │
  ├─ customer_invoices
  │   ↓
  │   Execute SQL Query - Customer Invoices
  │   ↓
  │   Code (Format) → Respond to Webhook
  │
  ├─ top_items
  │   ↓
  │   Code (WHERE Builder) - SQL_WHERE_BUILDER.js
  │   ↓
  │   Execute SQL Query - Top Items
  │   ↓
  │   Code (Format) → Respond to Webhook
  │
  ├─ top_center
  │   ↓
  │   Code (WHERE Builder) - SQL_WHERE_BUILDER.js
  │   ↓
  │   Execute SQL Query - Top Center
  │   ↓
  │   Code (Format) → Respond to Webhook
  │
  ├─ monthly_sales
  │   ↓
  │   Code (WHERE Builder) - SQL_WHERE_BUILDER.js
  │   ↓
  │   Execute SQL Query - Monthly Sales
  │   ↓
  │   Code (Format) → Respond to Webhook
  │
  ├─ product_group_sales
  │   ↓
  │   Code (WHERE Builder) - SQL_WHERE_BUILDER.js
  │   ↓
  │   Execute SQL Query - Product Group Sales
  │   ↓
  │   Code (Format) → Respond to Webhook
  │
  ├─ missing_name
  │   ↓
  │   Respond to Webhook (Error message)
  │
  └─ unknown
      ↓
      Respond to Webhook (Help message)
```

---

## ขั้นตอนการตั้งค่าใน n8n

### 1. เพิ่ม Code Node (Parser)
- วางโค้ดจาก `n8n_code_parser.js`
- เชื่อมต่อจาก Webhook node

### 2. เพิ่ม Switch Node
- ตั้งค่า Mode: **Rules**
- เพิ่ม 8 rules ตามที่ระบุข้างต้น
- เชื่อมต่อจาก Code (Parser) node

### 3. สำหรับแต่ละ Action Type:

#### A. invoice_detail & customer_invoices
- เพิ่ม **Execute SQL Query** node
- ใช้ SQL จาก `SQL_QUERIES.md`
- เพิ่ม **Code (Format)** node เพื่อ format response
- เพิ่ม **Respond to Webhook** node

#### B. top_items, top_center, monthly_sales, product_group_sales
- เพิ่ม **Code (WHERE Builder)** node
  - วางโค้ดจาก `SQL_WHERE_BUILDER.js`
- เพิ่ม **Execute SQL Query** node
  - ใช้ SQL จาก `SQL_QUERIES.md`
  - ใช้ `{{ $json.where_clause }}` ใน WHERE clause
- เพิ่ม **Code (Format)** node เพื่อ format response
- เพิ่ม **Respond to Webhook** node

#### C. missing_name & unknown
- เพิ่ม **Respond to Webhook** node
- ใช้ `{{ $json.reply }}` ใน Response Body

---

## ตัวอย่าง SQL Query ที่ใช้ WHERE Builder

```sql
SELECT
  l.inv_line_item_no,
  l.inv_line_description,
  SUM(l.inv_line_amount) AS total_amount
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
{{ $json.where_clause }}
GROUP BY 
  l.inv_line_item_no,
  l.inv_line_description
ORDER BY total_amount DESC
LIMIT 20
```

---

## หมายเหตุ

- **Expression Mode:** ใช้ `{{ }}` สำหรับ dynamic values ใน SQL
- **WHERE Builder:** ใช้ Code node เพื่อสร้าง WHERE clause แบบ dynamic
- **Error Handling:** เพิ่ม If node เพื่อตรวจสอบว่ามีข้อมูลหรือไม่
- **Response Format:** Format response ให้อ่านง่ายด้วย Code node ก่อนส่งกลับ
