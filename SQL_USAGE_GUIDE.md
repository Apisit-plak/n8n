# SQL Queries Usage Guide - วิธีเลือกใช้ SQL Queries

## 📋 สรุป: ต้องเลือกใช้ตาม Action

**คำตอบ:** **ต้องเลือกใช้** - ไม่ใช้ทุกอันพร้อมกัน

---

## 🔄 วิธีการทำงาน

### 1. Flow การทำงาน:

```
User Input (คำถาม)
    ↓
Parser (n8n_code_parser.js)
    ↓
Output: { action: 'top_items', time_period: {...}, limit: 10 }
    ↓
Switch Node (Route by Action)
    ↓
┌─────────────────────────────────────┐
│  Route ไปยัง Action ที่ถูกต้อง      │
└─────────────────────────────────────┘
    ↓
WHERE Builder (ถ้ามี time_period)
    ↓
Execute SQL Query (ใช้ Query ที่ตรงกับ Action)
    ↓
Format Response
    ↓
Respond to Webhook
```

---

## 📊 SQL Queries แบ่งเป็น 2 ประเภท

### 1. **SQL Queries สำหรับใช้งานจริง** (6 queries)

ใช้ใน Workflow ตาม Action:

#### Query 1: `invoice_detail`
- **Action:** `invoice_detail`
- **ใช้เมื่อ:** ผู้ใช้ถาม Invoice Number (เช่น "IV0303304")
- **WHERE Builder:** ❌ ไม่ต้องใช้
- **Node:** Execute SQL Query - Invoice Detail

#### Query 2: `customer_invoices`
- **Action:** `customer_invoices`
- **ใช้เมื่อ:** ผู้ใช้ถาม Invoice ของลูกค้า (เช่น "การ์เดียนอินดัสทรีส์ invoice")
- **WHERE Builder:** ❌ ไม่ต้องใช้
- **Node:** Execute SQL Query - Customer Invoices

#### Query 3: `top_items`
- **Action:** `top_items`
- **ใช้เมื่อ:** ผู้ใช้ถามรายการสินค้าขายดี (เช่น "TOP 10 สินค้า 6 เดือน")
- **WHERE Builder:** ✅ ต้องใช้
- **Node:** Execute SQL Query - Top Items

#### Query 4: `top_center`
- **Action:** `top_center`
- **ใช้เมื่อ:** ผู้ใช้ถามศูนย์ยอดขายเยอะสุด (เช่น "ศูนย์ไหนยอดขายเยอะสุด")
- **WHERE Builder:** ✅ ต้องใช้
- **Node:** Execute SQL Query - Top Center

#### Query 5: `monthly_sales`
- **Action:** `monthly_sales`
- **ใช้เมื่อ:** ผู้ใช้ถามยอดรายเดือน (เช่น "ยอด invoice แต่ละเดือน")
- **WHERE Builder:** ✅ ต้องใช้
- **Node:** Execute SQL Query - Monthly Sales

#### Query 6: `product_group_sales`
- **Action:** `product_group_sales`
- **ใช้เมื่อ:** ผู้ใช้ถามยอดขายแยกตามกลุ่ม (เช่น "product แยกตามกลุ่ม")
- **WHERE Builder:** ✅ ต้องใช้
- **Node:** Execute SQL Query - Product Group Sales

---

### 2. **SQL Queries สำหรับทดสอบและ Debug** (5 queries)

**ใช้สำหรับทดสอบเท่านั้น - ไม่ใช้ใน Workflow**

#### Test Query 1: ทดสอบ Top Items เดือนนี้ (Query แบบ Static)
- **ใช้เมื่อ:** ต้องการทดสอบว่ามีข้อมูลในเดือนนี้หรือไม่
- **ใช้ใน:** Database client (เช่น MySQL Workbench, phpMyAdmin)
- **ไม่ใช้ใน:** n8n Workflow

#### Test Query 2: ตรวจสอบว่ามีข้อมูลในเดือนนี้หรือไม่
- **ใช้เมื่อ:** ต้องการตรวจสอบว่ามีข้อมูลใน database ตามเงื่อนไขเดือนนี้
- **ใช้ใน:** Database client
- **ไม่ใช้ใน:** n8n Workflow

#### Test Query 3: ทดสอบข้อมูลทั้งหมด (ไม่กรองเวลา)
- **ใช้เมื่อ:** ต้องการทดสอบว่า WHERE clause มีปัญหาหรือไม่
- **ใช้ใน:** Database client
- **ไม่ใช้ใน:** n8n Workflow

#### Test Query 4: ทดสอบข้อมูล 12 เดือนล่าสุด
- **ใช้เมื่อ:** ต้องการทดสอบข้อมูลในช่วง 12 เดือนล่าสุด
- **ใช้ใน:** Database client
- **ไม่ใช้ใน:** n8n Workflow

#### Test Query 5: ตรวจสอบวันที่ล่าสุดใน database
- **ใช้เมื่อ:** ต้องการดูว่ามีข้อมูลเดือนไหนบ้าง
- **ใช้ใน:** Database client
- **ไม่ใช้ใน:** n8n Workflow

---

## 🎯 ตัวอย่างการใช้งาน

### ตัวอย่างที่ 1: คำถาม "IV0303304"

```
Parser → action: 'invoice_detail'
    ↓
Switch → Route ไปยัง 'invoice_detail'
    ↓
Execute SQL Query - Invoice Detail
    ↓
ใช้ Query 1 (invoice_detail)
```

### ตัวอย่างที่ 2: คำถาม "TOP 10 สินค้า 6 เดือน"

```
Parser → action: 'top_items', time_period: { period: 'month', value: 6 }, limit: 10
    ↓
Switch → Route ไปยัง 'top_items'
    ↓
WHERE Builder → where_clause: 'WHERE 1=1 AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)'
    ↓
Execute SQL Query - Top Items
    ↓
ใช้ Query 3 (top_items)
```

### ตัวอย่างที่ 3: คำถาม "ศูนย์ไหนยอดขายเยอะสุดปีนี้"

```
Parser → action: 'top_center', time_period: { period: 'this_year' }
    ↓
Switch → Route ไปยัง 'top_center'
    ↓
WHERE Builder → where_clause: 'WHERE 1=1 AND YEAR(h.inv_posting_date) = YEAR(CURDATE())'
    ↓
Execute SQL Query - Top Center
    ↓
ใช้ Query 4 (top_center)
```

---

## ✅ Checklist สำหรับ Setup

### สำหรับ Workflow:

- [ ] สร้าง Switch Node เพื่อ route ตาม `action`
- [ ] สร้าง WHERE Builder Node (สำหรับ action ที่มี `time_period`)
- [ ] สร้าง Execute SQL Query Node สำหรับแต่ละ action:
  - [ ] Invoice Detail (Query 1)
  - [ ] Customer Invoices (Query 2)
  - [ ] Top Items (Query 3)
  - [ ] Top Center (Query 4)
  - [ ] Monthly Sales (Query 5)
  - [ ] Product Group Sales (Query 6)
- [ ] ตั้งค่า Expression mode (`{{ }}`) ในทุก SQL Query Node
- [ ] Copy SQL query ที่ถูกต้องไปวางในแต่ละ Node

### สำหรับ Testing:

- [ ] ใช้ Test Queries ใน Database Client เพื่อทดสอบ
- [ ] ตรวจสอบว่ามีข้อมูลใน database หรือไม่
- [ ] ทดสอบ SQL query ก่อนนำมาใช้ใน n8n

---

## ❌ สิ่งที่ห้ามทำ

1. **ห้ามใช้ทุก query พร้อมกัน** - แต่ละ action ใช้ query ที่แตกต่างกัน
2. **ห้ามใช้ Test Queries ใน Workflow** - ใช้สำหรับทดสอบเท่านั้น
3. **ห้ามลืม WHERE Builder** - สำหรับ action ที่มี `time_period` ต้องใช้ WHERE Builder ก่อน

---

## 📝 สรุป

- **SQL Queries สำหรับใช้งานจริง:** ใช้ใน Workflow ตาม Action (6 queries)
- **SQL Queries สำหรับทดสอบ:** ใช้สำหรับทดสอบเท่านั้น (5 queries)
- **ต้องเลือกใช้:** Switch Node จะเลือก query ให้อัตโนมัติตาม `action`
- **ไม่ใช้ทุกอันพร้อมกัน:** แต่ละ action ใช้ query ที่แตกต่างกัน
