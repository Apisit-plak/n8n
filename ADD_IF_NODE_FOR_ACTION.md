# วิธีเพิ่ม If Node เพื่อแยก Action

## ปัญหา

ตอนนี้ workflow มี:
- JavaScript node "ถูก" ที่ return `action: 'invoice_detail'` หรือ `action: 'customer_invoices'`
- แต่ยังไม่มี If node เพื่อแยกไปที่ SQL Query ที่ถูกต้อง

## วิธีแก้ไข

### 1. เพิ่ม If Node หลัง "ถูก" node

**ขั้นตอน**:
1. **คลิกขวา** ที่ node "ถูก" (JavaScript node)
2. เลือก **"Add node"** → **"If"**
3. ตั้งชื่อ node เป็น **"If - Check Action"**

### 2. ตั้งค่า If Node

**Condition 1: ตรวจสอบ invoice_detail**
- **Value 1**: `{{ $json.action }}`
- **Operation**: `equal`
- **Value 2**: `invoice_detail`

**Output**:
- `true` → เชื่อมต่อไปที่ "Execute a SQL query" (Invoice Detail) เดิม
- `false` → ไปที่ Condition 2

**หรือใช้ Switch Node แทน** (แนะนำ):

### 3. ใช้ Switch Node (แนะนำกว่า)

**Switch Node** จะแยกได้หลายเงื่อนไข:

1. **คลิกขวา** ที่ node "ถูก"
2. เลือก **"Add node"** → **"Switch"**
3. ตั้งชื่อ node เป็น **"Switch - Route by Action"**

**การตั้งค่า Switch Node**:

**Mode**: `Rules`

**Rules**:
1. **Rule 1**: 
   - **Value 1**: `{{ $json.action }}`
   - **Operation**: `equal`
   - **Value 2**: `invoice_detail`
   - **Output**: เชื่อมต่อไปที่ "Execute a SQL query" (Invoice Detail)

2. **Rule 2**:
   - **Value 1**: `{{ $json.action }}`
   - **Operation**: `equal`
   - **Value 2**: `customer_invoices`
   - **Output**: เชื่อมต่อไปที่ "Execute SQL Query - Customer Invoices" (ใหม่)

3. **Fallback Output** (ถ้าไม่ตรงเงื่อนไข):
   - เชื่อมต่อไปที่ Error Response node

## Workflow Structure ที่สมบูรณ์

```
[Webhook]
  ↓
[ตัวแยกข้อความที่ส่งมาจากเว็ป]
  ↓
[ถ้าหากข้อความที่เข้ามา] (If node แรก)
  ├─ (false) → [ผิด] → [Respond to Webhook]
  │
  └─ (true) → [ถูก] (JavaScript: แยก invoice_no หรือ customer_name)
                ↓
        [Switch - Route by Action] ← เพิ่ม node นี้
          ├─ (action = 'invoice_detail') → [Execute a SQL query] (Invoice Detail)
          │                                    ↓
          │                              [If: ตรวจสอบผลลัพธ์]
          │                                    ↓
          │                              [Code in JavaScript] (Format Invoice Detail)
          │                                    ↓
          │                              [Reply to user]
          │
          ├─ (action = 'customer_invoices') → [Execute SQL Query - Customer Invoices] (ใหม่)
          │                                       ↓
          │                                 [Code in JavaScript] (Format Customer Invoices)
          │                                       ↓
          │                                 [Reply to user]
          │
          └─ (fallback) → [JavaScript: Return error message]
                            ↓
                        [Respond to Webhook]
```

## ตัวอย่างการตั้งค่า Switch Node

### Rule 1: invoice_detail
```
Value 1: {{ $json.action }}
Operation: equal
Value 2: invoice_detail
```

### Rule 2: customer_invoices
```
Value 1: {{ $json.action }}
Operation: equal
Value 2: customer_invoices
```

### Fallback Output
- เชื่อมต่อไปที่ node ที่ return error message

## ทางเลือก: ใช้ If Node หลายตัว

ถ้าไม่ใช้ Switch Node สามารถใช้ If Node หลายตัว:

### If Node 1: ตรวจสอบ invoice_detail
- **Value 1**: `{{ $json.action }}`
- **Operation**: `equal`
- **Value 2**: `invoice_detail`
- `true` → ไปที่ "Execute a SQL query" (Invoice Detail)
- `false` → ไปที่ If Node 2

### If Node 2: ตรวจสอบ customer_invoices
- **Value 1**: `{{ $json.action }}`
- **Operation**: `equal`
- **Value 2**: `customer_invoices`
- `true` → ไปที่ "Execute SQL Query - Customer Invoices" (ใหม่)
- `false` → ไปที่ Error Response

## สรุป

### ✅ ต้องเพิ่ม:
1. **Switch Node** หรือ **If Node** หลัง "ถูก" node
2. **Execute SQL Query Node** ใหม่สำหรับ Customer Invoices
3. **JavaScript Node** ใหม่สำหรับ Format Customer Invoices

### ⚠️ ต้องแก้ไข:
- ไม่ต้องแก้ไขอะไร เพียงแค่เพิ่ม nodes ใหม่

## Tips

1. **Switch Node** ใช้ได้ดีกว่า If Node หลายตัว เพราะจัดการหลายเงื่อนไขได้ง่ายกว่า
2. **Fallback Output** สำคัญสำหรับจัดการกรณีที่ไม่ตรงเงื่อนไข
3. **ตรวจสอบ action** ให้แน่ใจว่า JavaScript node "ถูก" return `action` field

