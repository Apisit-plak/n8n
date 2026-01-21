# คู่มือการใช้งาน Message Parser สำหรับ n8n

## ภาพรวม
โค้ดนี้ใช้สำหรับแยกประเภทคำถามจากผู้ใช้และ extract ข้อมูลที่จำเป็น เพื่อส่งต่อไปยัง workflow ที่เหมาะสม

## การติดตั้ง
1. เปิด n8n workflow
2. เพิ่ม **Code** node
3. Copy โค้ดจากไฟล์ `n8n_code_parser.js` ไปวางใน Code node
4. เชื่อมต่อกับ Webhook node (INPUT) และ Switch node (OUTPUT)

## ประเภทคำถามที่รองรับ

### 1. ดู Invoice Detail (Invoice Number)
**รูปแบบ:**
- `IV0303304`
- `IV1234567`

**Output:**
```json
{
  "action": "invoice_detail",
  "invoice_no": "IV0303304",
  "text": "IV0303304",
  "session_id": "u_001"
}
```

---

### 2. ลูกค้า 1 ราย มี Invoice อะไรบ้าง
**รูปแบบ:**
- `การ์เดียนอินดัสทรีส์ invoice`
- `invoice การ์เดียนอินดัสทรีส์`
- `การ์เดียนอินดัสทรีส์ มี invoice อะไรบ้าง`
- `บิลของ การ์เดียนอินดัสทรีส์`

**Output:**
```json
{
  "action": "customer_invoices",
  "customer_name": "การ์เดียนอินดัสทรีส์",
  "text": "การ์เดียนอินดัสทรีส์ invoice",
  "session_id": "u_001"
}
```

---

### 3. รายการที่อยู่ใน Invoice รายการไหนทำยอดเยอะที่สุด + ระยะเวลา
**รูปแบบ:**
- `รายการไหนยอดเยอะสุด`
- `สินค้าขายดีที่สุด`
- `product ยอดเยอะสุด 3 เดือน`
- `รายการยอดมากสุดปีนี้`
- `TOP 10 สินค้า 6 เดือน`

**Output:**
```json
{
  "action": "top_items",
  "time_period": {
    "period": "month",
    "value": 3
  },
  "text": "product ยอดเยอะสุด 3 เดือน",
  "session_id": "u_001"
}
```

**time_period ที่รองรับ:**
- `this_year`, `last_year`, `year` (พร้อมจำนวนปี)
- `this_month`, `last_month`, `month` (พร้อมจำนวนเดือน)
- `this_week`, `week` (พร้อมจำนวนสัปดาห์)
- `today`, `yesterday`, `day` (พร้อมจำนวนวัน)
- `date` (พร้อม year, month)

---

### 4. ศูนย์ หรือ หน่วยงานไหน ยอดขายเยอะสุด
**รูปแบบ:**
- `ศูนย์ไหนยอดขายเยอะสุด`
- `SBU ยอดเยอะสุดปีนี้`
- `หน่วยงานไหนขายดีที่สุด 6 เดือน`
- `สาขายอดเยอะสุด`

**Output:**
```json
{
  "action": "top_center",
  "time_period": {
    "period": "this_year"
  },
  "text": "SBU ยอดเยอะสุดปีนี้",
  "session_id": "u_001"
}
```

---

### 5. ยอด Invoice แต่ละเดือน
**รูปแบบ:**
- `ยอด invoice แต่ละเดือน`
- `ยอดขายรายเดือนปีนี้`
- `monthly sales 2024`
- `ยอดรายเดือน 6 เดือน`

**Output:**
```json
{
  "action": "monthly_sales",
  "time_period": {
    "period": "this_year"
  },
  "text": "ยอด invoice แต่ละเดือน",
  "session_id": "u_001"
}
```

---

### 6. Product แยกตามกลุ่ม มียอดขายอะไรบ้าง
**รูปแบบ:**
- `product แยกตามกลุ่ม`
- `ยอดขายสินค้าแต่ละกลุ่ม`
- `สินค้า group ยอดขาย`
- `category sales`

**Output:**
```json
{
  "action": "product_group_sales",
  "time_period": null,
  "text": "product แยกตามกลุ่ม",
  "session_id": "u_001"
}
```

---

## การใช้งานใน n8n Workflow

### ขั้นตอนการตั้งค่า:

1. **Webhook Node** (INPUT)
   - รับข้อความจากผู้ใช้
   - ส่ง `text` และ `session_id` ไปยัง Code node

2. **Code Node** (Parser)
   - ใช้โค้ดจาก `n8n_code_parser.js`
   - แยกประเภทคำถามและ return action ที่เหมาะสม

3. **Switch Node** (Router)
   - ตั้งค่าเงื่อนไขตาม `action` field:
     - `invoice_detail` → ไปยัง Invoice Detail workflow
     - `customer_invoices` → ไปยัง Customer Invoices workflow
     - `top_items` → ไปยัง Top Items workflow
     - `top_center` → ไปยัง Top Center workflow
     - `monthly_sales` → ไปยัง Monthly Sales workflow
     - `product_group_sales` → ไปยัง Product Group Sales workflow
     - `unknown` → ไปยัง Error/Help response

4. **แต่ละ Workflow**
   - รับข้อมูลจาก parser
   - ดึงข้อมูลจาก database
   - Format response
   - ส่งกลับไปยัง Respond to Webhook node

---

## ตัวอย่าง Workflow Structure

```
Webhook
  ↓
Code (Parser) - ใช้โค้ดจาก n8n_code_parser.js
  ↓
Switch (Route by action)
  ├─ invoice_detail → Invoice Detail Workflow
  ├─ customer_invoices → Customer Invoices Workflow
  ├─ top_items → Top Items Workflow
  ├─ top_center → Top Center Workflow
  ├─ monthly_sales → Monthly Sales Workflow
  ├─ product_group_sales → Product Group Sales Workflow
  └─ unknown → Help Response
      ↓
Respond to Webhook
```

---

## หมายเหตุ

- **Case Insensitive**: การตรวจสอบไม่สนใจตัวพิมพ์เล็ก-ใหญ่
- **Flexible Matching**: รองรับรูปแบบคำถามที่หลากหลาย
- **Time Period**: รองรับการระบุระยะเวลาหลายรูปแบบ
- **Error Handling**: ถ้าไม่เข้าใจคำถาม จะ return `unknown` action พร้อมคำแนะนำ

---

## การทดสอบ

ลองทดสอบด้วยคำถามเหล่านี้:
1. `IV0303304`
2. `การ์เดียนอินดัสทรีส์ invoice`
3. `รายการไหนยอดเยอะสุด 3 เดือน`
4. `ศูนย์ไหนยอดขายเยอะสุดปีนี้`
5. `ยอด invoice แต่ละเดือน`
6. `product แยกตามกลุ่ม`
