# คู่มือการตั้งค่า Workflow สำหรับแต่ละ Action

## สรุปการใช้งาน WHERE Builder และ SQL Query

---

## ✅ Action ที่ต้องใช้ WHERE Builder + SQL Query

### 1. `top_items`
**Flow:**
```
Switch (top_items)
  ↓
Code (WHERE Builder) ← ใช้ SQL_WHERE_BUILDER.js
  ↓
Execute SQL Query (Top Items) ← ใช้ SQL จาก SQL_QUERIES_N8N.md
  ↓
Code (Format Response)
  ↓
Respond to Webhook
```

**เหตุผล:** มี `time_period` ต้องสร้าง WHERE clause แบบ dynamic

---

### 2. `top_center`
**Flow:**
```
Switch (top_center)
  ↓
Code (WHERE Builder) ← ใช้ SQL_WHERE_BUILDER.js
  ↓
Execute SQL Query (Top Center) ← ใช้ SQL จาก SQL_QUERIES_N8N.md
  ↓
Code (Format Response)
  ↓
Respond to Webhook
```

**เหตุผล:** มี `time_period` ต้องสร้าง WHERE clause แบบ dynamic

---

### 3. `monthly_sales`
**Flow:**
```
Switch (monthly_sales)
  ↓
Code (WHERE Builder) ← ใช้ SQL_WHERE_BUILDER.js
  ↓
Execute SQL Query (Monthly Sales) ← ใช้ SQL จาก SQL_QUERIES_N8N.md
  ↓
Code (Format Response)
  ↓
Respond to Webhook
```

**เหตุผล:** มี `time_period` ต้องสร้าง WHERE clause แบบ dynamic

---

### 4. `product_group_sales`
**Flow:**
```
Switch (product_group_sales)
  ↓
Code (WHERE Builder) ← ใช้ SQL_WHERE_BUILDER.js
  ↓
Execute SQL Query (Product Group Sales) ← ใช้ SQL จาก SQL_QUERIES_N8N.md
  ↓
Code (Format Response)
  ↓
Respond to Webhook
```

**เหตุผล:** มี `time_period` ต้องสร้าง WHERE clause แบบ dynamic

---

## ❌ Action ที่ไม่ต้องใช้ WHERE Builder (แต่ต้องใช้ SQL Query)

### 5. `invoice_detail`
**Flow:**
```
Switch (invoice_detail)
  ↓
Execute SQL Query (Invoice Detail) ← ใช้ SQL จาก SQL_QUERIES_N8N.md
  ↓
If (มีข้อมูล?)
  ├─ True → Code (Format Response) → Respond to Webhook
  └─ False → Code (Error Message) → Respond to Webhook
```

**เหตุผล:** ไม่มี `time_period` ใช้ WHERE clause แบบ static (`WHERE l.inv_line_inv_no = '{{ $json.invoice_no }}'`)

---

### 6. `customer_invoices`
**Flow:**
```
Switch (customer_invoices)
  ↓
Execute SQL Query (Customer Invoices) ← ใช้ SQL จาก SQL_QUERIES_N8N.md
  ↓
Code (Format Response)
  ↓
Respond to Webhook
```

**เหตุผล:** ไม่มี `time_period` ใช้ WHERE clause แบบ static (`WHERE h.inv_customer_name LIKE '%{{ $json.customer_name }}%'`)

---

## ⚠️ Action ที่ไม่ต้องใช้ WHERE Builder และ SQL Query (Error Cases)

### 7. `missing_name`
**Flow:**
```
Switch (missing_name)
  ↓
Respond to Webhook ← ส่ง reply โดยตรง
```

**Parser Output:**
```json
{
  "action": "missing_name",
  "reply": "กรุณาพิมพ์ชื่อลูกค้าตามด้วยคำว่า invoice...",
  "session_id": "u_001"
}
```

**Respond to Webhook Configuration:**
- Response Body: `{{ $json.reply }}`
- หรือ: `{ "reply": "{{ $json.reply }}" }`

**เหตุผล:** Parser ส่ง `reply` มาแล้ว ไม่ต้อง query database

---

### 8. `unknown`
**Flow:**
```
Switch (unknown)
  ↓
Respond to Webhook ← ส่ง reply โดยตรง
```

**Parser Output:**
```json
{
  "action": "unknown",
  "reply": "ไม่เข้าใจคำถาม กรุณาลองใช้รูปแบบต่อไปนี้:\n\n1. ดู Invoice: ...",
  "session_id": "u_001"
}
```

**Respond to Webhook Configuration:**
- Response Body: `{{ $json.reply }}`
- หรือ: `{ "reply": "{{ $json.reply }}" }`

**เหตุผล:** Parser ส่ง `reply` มาแล้ว ไม่ต้อง query database

---

## สรุปตาราง

| Action | WHERE Builder | SQL Query | Format Code | Respond to Webhook |
|--------|--------------|-----------|-------------|-------------------|
| `invoice_detail` | ❌ | ✅ | ✅ | ✅ |
| `customer_invoices` | ❌ | ✅ | ✅ | ✅ |
| `top_items` | ✅ | ✅ | ✅ | ✅ |
| `top_center` | ✅ | ✅ | ✅ | ✅ |
| `monthly_sales` | ✅ | ✅ | ✅ | ✅ |
| `product_group_sales` | ✅ | ✅ | ✅ | ✅ |
| `missing_name` | ❌ | ❌ | ❌ | ✅ (reply โดยตรง) |
| `unknown` | ❌ | ❌ | ❌ | ✅ (reply โดยตรง) |

---

## ตัวอย่างการตั้งค่า Respond to Webhook สำหรับ Error Cases

### สำหรับ `missing_name` และ `unknown`:

**Option 1: ส่ง reply โดยตรง (String)**
```
Response Body: {{ $json.reply }}
```

**Option 2: ส่ง reply ใน JSON format**
```
Response Body (JSON):
{
  "reply": "{{ $json.reply }}"
}
```

**Option 3: ใช้ Expression Editor**
- คลิกไอคอน `{{ }}` เพื่อเปิด Expression Editor
- ใส่: `{{ $json.reply }}`
- หรือ: `{ "reply": "{{ $json.reply }}" }`

---

## หมายเหตุสำคัญ

1. **WHERE Builder ใช้เฉพาะ action ที่มี `time_period`:**
   - `top_items`
   - `top_center`
   - `monthly_sales`
   - `product_group_sales`

2. **Error cases (`missing_name`, `unknown`) ไม่ต้อง:**
   - ใช้ WHERE Builder
   - ใช้ SQL Query
   - ใช้ Format Code
   - แค่ส่ง `reply` ที่ parser ส่งมาโดยตรง

3. **ตรวจสอบ Parser Output:**
   - ดู OUTPUT ของ Code (Parser) node
   - ตรวจสอบว่า `action` field ถูกต้อง
   - ตรวจสอบว่า `reply` field มีอยู่ (สำหรับ error cases)
