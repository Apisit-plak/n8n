# อธิบาย Switch Node Rules

## Switch Node คืออะไร?

**Switch Node** เป็น node ที่ใช้สำหรับ **route** (ส่งต่อ) ข้อมูลไปยัง branch ที่แตกต่างกันตามเงื่อนไขที่กำหนด

เหมือนกับ **if-else** หรือ **switch-case** ใน programming

---

## Rules คืออะไร?

**Rules** คือ **เงื่อนไข** ที่ใช้ตรวจสอบข้อมูล แล้วส่งไปยัง branch ที่เหมาะสม

แต่ละ Rule จะมี:
1. **Condition Field** - field ที่ต้องการตรวจสอบ (เช่น `action`)
2. **Operation** - วิธีตรวจสอบ (เช่น `is equal to`)
3. **Value** - ค่าที่ต้องการตรวจสอบ (เช่น `invoice_detail`)
4. **Output Name** - ชื่อ branch (เช่น "เชื่อมต่อไปที่ Execute SQL Query - Invoice Detail")

---

## วิธีตั้งค่า Switch Node Rules

### ขั้นตอน:

1. **เปิด Switch Node**
2. **เลือก Mode: Rules**
3. **คลิก "Add Routing Rule"** เพื่อเพิ่ม rule ใหม่
4. **ตั้งค่าแต่ละ rule:**

---

## ตัวอย่างการตั้งค่า Rules ทั้ง 8 แบบ

### Rule 1: invoice_detail

**Condition:**
- **Field:** `{{ $json.action }}`
- **Operation:** `is equal to`
- **Value:** `invoice_detail`

**Output Name:** `เชื่อมต่อไปที่ Execute SQL Query - Invoice Detail`

**ผลลัพธ์:** ถ้า `action` = `"invoice_detail"` → ส่งไป Branch 1 (Invoice Detail)

---

### Rule 2: customer_invoices

**Condition:**
- **Field:** `{{ $json.action }}`
- **Operation:** `is equal to`
- **Value:** `customer_invoices`

**Output Name:** `เชื่อมต่อไปที่ Execute SQL Query - Customer Invoices`

**ผลลัพธ์:** ถ้า `action` = `"customer_invoices"` → ส่งไป Branch 2 (Customer Invoices)

---

### Rule 3: top_items

**Condition:**
- **Field:** `{{ $json.action }}`
- **Operation:** `is equal to`
- **Value:** `top_items`

**Output Name:** `เชื่อมต่อไปที่ WHERE Builder (Top Items)`

**ผลลัพธ์:** ถ้า `action` = `"top_items"` → ส่งไป Branch 3 (Top Sale)

---

### Rule 4: top_center

**Condition:**
- **Field:** `{{ $json.action }}`
- **Operation:** `is equal to`
- **Value:** `top_center`

**Output Name:** `เชื่อมต่อไปที่ WHERE Builder (Top Center)`

**ผลลัพธ์:** ถ้า `action` = `"top_center"` → ส่งไป Branch 4 หรือ 5 (ต้องตรวจสอบใน workflow ของคุณ)

---

### Rule 5: monthly_sales

**Condition:**
- **Field:** `{{ $json.action }}`
- **Operation:** `is equal to`
- **Value:** `monthly_sales`

**Output Name:** `เชื่อมต่อไปที่ WHERE Builder (Monthly Sales)`

**ผลลัพธ์:** ถ้า `action` = `"monthly_sales"` → ส่งไป Branch 5 หรือ 6 (ดูยอด Invoice ย้อนหลัง)

---

### Rule 6: product_group_sales

**Condition:**
- **Field:** `{{ $json.action }}`
- **Operation:** `is equal to`
- **Value:** `product_group_sales`

**Output Name:** `เชื่อมต่อไปที่ WHERE Builder (Product Group Sales)`

**ผลลัพธ์:** ถ้า `action` = `"product_group_sales"` → ส่งไป Branch 4 (ขายดี/ท็อปขายตามรหัสสินค้า)

---

### Rule 7: missing_name

**Condition:**
- **Field:** `{{ $json.action }}`
- **Operation:** `is equal to`
- **Value:** `missing_name`

**Output Name:** `เชื่อมต่อไปที่ Respond to Webhook (Missing Name)`

**ผลลัพธ์:** ถ้า `action` = `"missing_name"` → ส่งไป Branch 7 (Direct Webhook)

---

### Rule 8: unknown

**Condition:**
- **Field:** `{{ $json.action }}`
- **Operation:** `is equal to`
- **Value:** `unknown`

**Output Name:** `เชื่อมต่อไปที่ Respond to Webhook (Unknown)`

**ผลลัพธ์:** ถ้า `action` = `"unknown"` → ส่งไป Branch 8 (Direct Webhook)

---

## วิธีตรวจสอบว่า Rules ถูกต้องหรือไม่

### 1. ตรวจสอบใน n8n:

1. **เปิด Switch Node**
2. **ดูที่ "Routing Rules" section**
3. **ตรวจสอบว่า:**
   - มี rules ทั้ง 8 แบบ
   - แต่ละ rule มี Condition Field: `{{ $json.action }}`
   - แต่ละ rule มี Operation: `is equal to`
   - แต่ละ rule มี Value ที่ถูกต้อง (invoice_detail, customer_invoices, etc.)
   - แต่ละ rule มี Output Name ที่ชัดเจน

### 2. ตรวจสอบ Mapping:

ตรวจสอบว่าแต่ละ rule map ไปที่ branch ที่ถูกต้อง:

| Action | Rule Value | Branch | Node ที่เชื่อมต่อ |
|--------|-----------|--------|------------------|
| `invoice_detail` | `invoice_detail` | Branch 1 | Execute SQL Query - Invoice Detail |
| `customer_invoices` | `customer_invoices` | Branch 2 | Execute SQL Query - Customer Invoices |
| `top_items` | `top_items` | Branch 3 | WHERE Builder → Execute SQL Query - Top Sale |
| `top_center` | `top_center` | Branch 4 หรือ 5? | WHERE Builder → Execute SQL Query |
| `monthly_sales` | `monthly_sales` | Branch 5 หรือ 6? | WHERE Builder → Execute SQL Query (ดูยอด Invoice ย้อนหลัง) |
| `product_group_sales` | `product_group_sales` | Branch 4? | WHERE Builder → Execute SQL Query (ขายดี/ท็อปขายตามรหัสสินค้า) |
| `missing_name` | `missing_name` | Branch 7 | Respond to Webhook9 |
| `unknown` | `unknown` | Branch 8 | Respond to Webhook10 |

---

## วิธีแก้ไขถ้า Rules ไม่ถูกต้อง

### ถ้า Rules ยังไม่ครบ:

1. **คลิก "Add Routing Rule"** ใน Switch Node
2. **ตั้งค่า Condition:**
   - Field: `{{ $json.action }}`
   - Operation: `is equal to`
   - Value: `top_center` (หรือ action อื่นที่ยังไม่มี)
3. **ตั้งค่า Output Name:** `เชื่อมต่อไปที่ ...`
4. **เชื่อมต่อ branch ที่เหมาะสม**

### ถ้า Rules map ไปผิด branch:

1. **ลบ rule ที่ผิด**
2. **สร้าง rule ใหม่**
3. **เชื่อมต่อ branch ที่ถูกต้อง**

---

## ตัวอย่างภาพรวม

```
Parser Output:
{
  "action": "invoice_detail",
  "invoice_no": "IV0303304",
  ...
}
  ↓
Switch Node
  ↓
Rule 1: action == "invoice_detail" → Branch 1 ✅
Rule 2: action == "customer_invoices" → Branch 2 ✅
Rule 3: action == "top_items" → Branch 3 ✅
Rule 4: action == "top_center" → Branch 4 หรือ 5? ❓
Rule 5: action == "monthly_sales" → Branch 5 หรือ 6? ❓
Rule 6: action == "product_group_sales" → Branch 4? ❓
Rule 7: action == "missing_name" → Branch 7 ✅
Rule 8: action == "unknown" → Branch 8 ✅
```

---

## คำถามที่ต้องตอบ

จาก workflow ของคุณ:

1. **Branch 4 (WHERE Builder1 → ขายดี/ท็อปขายตามรหัสสินค้า)** คือ action ไหน?
   - `top_center` หรือ `product_group_sales`?

2. **Branch 5 (WHERE Builder2 → ดูยอด Invoice ย้อนหลัง)** คือ action ไหน?
   - `monthly_sales` หรือ `top_center`?

3. **Branch 6 (WHERE Builder3 → ดูยอด Invoice ย้อนหลัง1)** คือ action ไหน?
   - `monthly_sales` หรือ action อื่น?

---

## สรุป

**Switch Node Rules** คือเงื่อนไขที่ใช้ตรวจสอบ `action` field แล้วส่งข้อมูลไปยัง branch ที่เหมาะสม

**ต้องมี rules ทั้ง 8 แบบ:**
- `invoice_detail`
- `customer_invoices`
- `top_items`
- `top_center`
- `monthly_sales`
- `product_group_sales`
- `missing_name`
- `unknown`

**แต่ละ rule ต้อง map ไปที่ branch ที่ถูกต้อง**
