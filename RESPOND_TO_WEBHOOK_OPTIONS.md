# วิธีเชื่อมต่อ Respond to Webhook

## แบบที่ 1: รวม Respond to Webhook เป็นตัวเดียว (แนะนำ) ✅

### ข้อดี:
- จัดการง่าย
- Code เดียวกัน
- ดูแลง่าย

### วิธีทำ:

1. **ลบ Respond to Webhook2 และ Respond to Webhook3**
   - คลิกขวาที่ node → Delete

2. **เชื่อมต่อทั้งหมดไปที่ "Reply to user" (Respond to Webhook) เดียว**

### Workflow Structure:

```
[Code in JavaScript - Format Invoice Detail]
  ↓
[Reply to user] ← ใช้ตัวเดียว
  ↑
[Code in JavaScript - Format Customer Invoices]
  ↑
[ผิด1] (Error Response จาก If1 false)
  ↑
[ผิด] (Error Response จาก If แรก)
```

### การตั้งค่า "Reply to user":

**Response Body**:
```json
{
  "reply": "{{ $json.reply }}"
}
```

**หมายเหตุ**: 
- ถ้า node ส่งมาเป็น `reply` field → จะแสดงผล
- ถ้า node ส่งมาเป็น error message → จะแสดง error

---

## แบบที่ 2: แยก Respond to Webhook (ตามที่เห็นในภาพ)

### ข้อดี:
- แยก error handling ชัดเจน
- Debug ง่าย

### วิธีทำ:

1. **เชื่อมต่อ false branch ของ If1**

**ขั้นตอน**:
- คลิกที่ false branch ของ If1 node
- เชื่อมต่อไปที่ JavaScript node ใหม่ (เช่น "ผิด1")
- หรือเชื่อมต่อไปที่ Respond to Webhook2 โดยตรง

### JavaScript Node "ผิด1" (Error Response):

**Code**:
```javascript
return [{
  reply: 'ไม่พบข้อมูล invoice ที่ระบุ'
}];
```

### Workflow Structure:

```
[If1]
  ├─ (true) → [Code in JavaScript - Format Invoice Detail] → [Respond to Webhook2]
  └─ (false) → [ผิด1] → [Respond to Webhook2]
```

### การตั้งค่า Respond to Webhook ทั้ง 3 ตัว:

**Respond to Webhook** (จาก "ผิด"):
```json
{
  "reply": "{{ $json.reply }}"
}
```

**Respond to Webhook2** (จาก Invoice Detail):
```json
{
  "reply": "{{ $json.reply }}"
}
```

**Respond to Webhook3** (จาก Customer Invoices):
```json
{
  "reply": "{{ $json.reply }}"
}
```

---

## แนะนำ: ใช้แบบที่ 1 (รวมเป็นตัวเดียว)

### วิธีเชื่อมต่อ:

1. **ลบ Respond to Webhook2 และ Respond to Webhook3**

2. **เชื่อมต่อใหม่**:
   - [Code in JavaScript - Format Invoice Detail] → [Reply to user]
   - [Code in JavaScript - Format Customer Invoices] → [Reply to user]
   - [ผิด1] → [Reply to user] (ถ้ามี)
   - [ผิด] → [Reply to user]

3. **ตั้งค่า "Reply to user"**:
   - Response Body: `{ "reply": "{{ $json.reply }}" }`

### Workflow Structure ที่แนะนำ:

```
[Switch - Route by Action]
  ├─ (invoice_detail)
  │   ↓
  │   [Execute SQL Query - Invoice Detail]
  │   ↓
  │   [If1]
  │   ├─ (true) → [Code in JavaScript - Format Invoice Detail]
  │   └─ (false) → [ผิด1: return { reply: 'ไม่พบข้อมูล' }]
  │   ↓
  │   [Reply to user] ← ใช้ตัวเดียว
  │
  └─ (customer_invoices)
      ↓
      [Execute SQL Query - Customer Invoices]
      ↓
      [Code in JavaScript - Format Customer Invoices]
      ↓
      [Reply to user] ← ใช้ตัวเดียว
```

---

## สรุป

### แบบที่ 1: รวมเป็นตัวเดียว (แนะนำ) ✅
- ง่ายต่อการดูแล
- Code เดียวกัน
- ใช้ "Reply to user" ตัวเดียว

### แบบที่ 2: แยกเป็น 3 ตัว
- แยก error handling ชัดเจน
- Debug ง่าย แต่ดูแลซับซ้อนกว่า

**แนะนำ**: ใช้แบบที่ 1 (รวมเป็นตัวเดียว) เพราะง่ายกว่าและทำงานได้เหมือนกัน

