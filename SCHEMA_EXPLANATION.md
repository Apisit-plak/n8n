# Database Schema Explanation

## โครงสร้างข้อมูล

### 1. service_posted_invoice_header (ตาราง Header - ศูนย์ใหญ่)

**หน้าที่:** เก็บข้อมูล Invoice Header (ศูนย์ใหญ่ที่เก็บสินค้าต่างๆ)

**Columns สำคัญ:**
- `inv_no` - เลข Invoice (เช่น IV0303304)
- `inv_posting_date` - วันที่ Post Invoice
- `inv_customer_no` - รหัสลูกค้า
- `inv_customer_name` - ชื่อลูกค้า
- `inv_department` - รหัสศูนย์/หน่วยงาน (จาก header)
- `inv_department_name` - ชื่อศูนย์/หน่วยงาน (จาก header)
- `inv_sales_person` - รหัสเซลส์
- `inv_sales_person_name` - ชื่อเซลส์

**ความหมาย:** 
- Header บอกว่า Invoice นี้เป็นของศูนย์/หน่วยงานอะไร
- Header บอกว่า Invoice นี้เป็นของลูกค้าใคร

---

### 2. service_posted_invoice_line (ตาราง Line - รายละเอียดสินค้า)

**หน้าที่:** เก็บรายละเอียดสินค้าในแต่ละ Invoice (สินค้านั้นๆที่อยู่ในศูนย์แต่ละที่)

**Columns สำคัญ:**
- `inv_line_inv_no` - เลข Invoice (เชื่อมกับ header)
- `inv_line_item_no` - รหัสสินค้า
- `inv_line_description` - คำอธิบายสินค้า
- `inv_line_quantity` - จำนวน
- `inv_line_amount` - ยอดขาย (ไม่รวม VAT)
- `inv_line_amount_vat` - VAT
- `inv_line_department` - รหัสศูนย์/หน่วยงาน (จาก line)
- `inv_line_department_name` - ชื่อศูนย์/หน่วยงาน (จาก line)

**ความหมาย:**
- Line บอกว่า Invoice นี้มีสินค้าอะไรบ้าง
- Line บอกว่าสินค้านี้อยู่ในศูนย์/หน่วยงานไหน (อาจจะต่างจาก header)

---

## การเชื่อมโยงข้อมูล

### Relationship:
```
service_posted_invoice_header (h)
  ↓ (h.inv_no = l.inv_line_inv_no)
service_posted_invoice_line (l)
```

### ตัวอย่าง:
- **Header:** `inv_no = 'IV0303304'`, `inv_department = 'DEPT01'`, `inv_department_name = 'ศูนย์ A'`
- **Line 1:** `inv_line_inv_no = 'IV0303304'`, `inv_line_item_no = 'ITEM001'`, `inv_line_department = 'DEPT01'`
- **Line 2:** `inv_line_inv_no = 'IV0303304'`, `inv_line_item_no = 'ITEM002'`, `inv_line_department = 'DEPT02'`

**หมายเหตุ:** 
- Header บอกว่า Invoice นี้เป็นของศูนย์ A
- แต่ Line อาจจะบอกว่าสินค้า ITEM001 อยู่ในศูนย์ A และ ITEM002 อยู่ในศูนย์ B

---

## การใช้งานใน SQL Queries

### 1. invoice_detail (ดูรายละเอียด Invoice)

**เมื่อถาม:** "IV0303304"

**Query:**
- JOIN header กับ line โดยใช้ `h.inv_no = l.inv_line_inv_no`
- แสดงข้อมูลทั้งจาก header (ศูนย์ใหญ่) และ line (ศูนย์ที่เก็บสินค้าแต่ละรายการ)
- แสดงรายละเอียดสินค้าทั้งหมดใน Invoice นี้

**Output:**
- ข้อมูล Invoice (จาก header)
- ข้อมูลศูนย์/หน่วยงาน (จาก header และ line)
- รายละเอียดสินค้าแต่ละรายการ (จาก line)

---

### 2. top_center (ศูนย์/หน่วยงานไหนยอดขายเยอะสุด)

**เมื่อถาม:** "ศูนย์ไหนยอดขายเยอะสุด"

**Query:**
- GROUP BY `h.inv_department`, `h.inv_department_name` (จาก header)
- SUM `l.inv_line_amount` (จาก line)
- Header บอกว่าศูนย์อะไร
- Line บอกว่าศูนย์นั้นมี invoice อะไรบ้าง

**Output:**
- ชื่อศูนย์/หน่วยงาน
- จำนวน Invoice
- ยอดขายรวม
- ตัวอย่าง Invoice numbers

---

### 3. top_items (รายการสินค้าขายดีที่สุด)

**เมื่อถาม:** "TOP 10 สินค้า 6 เดือน"

**Query:**
- GROUP BY `l.inv_line_item_no`, `l.inv_line_description` (จาก line)
- SUM `l.inv_line_amount` (จาก line)
- JOIN กับ header เพื่อดูข้อมูลศูนย์/หน่วยงานที่ขายสินค้านี้

**Output:**
- รหัสสินค้า, คำอธิบาย
- ยอดขายรวม
- จำนวน Invoice
- ศูนย์/หน่วยงานที่ขายสินค้านี้มากที่สุด

---

## หมายเหตุสำคัญ

1. **Header vs Line Department:**
   - `h.inv_department` = ศูนย์/หน่วยงานของ Invoice (จาก header)
   - `l.inv_line_department` = ศูนย์/หน่วยงานของสินค้าแต่ละรายการ (จาก line)
   - อาจจะต่างกันได้ (สินค้าอาจจะอยู่ในศูนย์อื่น)

2. **การ JOIN:**
   - ใช้ `h.inv_no = l.inv_line_inv_no` เพื่อเชื่อม header กับ line
   - ต้องใช้ LEFT JOIN เพื่อให้ได้ข้อมูลครบถ้วน

3. **การ GROUP BY:**
   - สำหรับ top_center: GROUP BY `h.inv_department`, `h.inv_department_name`
   - สำหรับ top_items: GROUP BY `l.inv_line_item_no`, `l.inv_line_description`

4. **การ SUM:**
   - ใช้ `SUM(l.inv_line_amount)` จาก line table
   - ไม่ใช้ `h.inv_total_amount` เพราะไม่มีใน header table

---

## ตัวอย่างการใช้งาน

### ตัวอย่างที่ 1: ดู Invoice Detail
```
คำถาม: "IV0303304"
Output:
- Invoice No: IV0303304
- Department (Header): ศูนย์ A
- Items:
  - ITEM001 (Department: ศูนย์ A)
  - ITEM002 (Department: ศูนย์ B)
```

### ตัวอย่างที่ 2: Top Center
```
คำถาม: "ศูนย์ไหนยอดขายเยอะสุด 6 เดือน"
Output:
1. ศูนย์ A - ยอดขาย: 1,000,000 (Invoice: 50)
2. ศูนย์ B - ยอดขาย: 800,000 (Invoice: 40)
3. ศูนย์ C - ยอดขาย: 600,000 (Invoice: 30)
```

### ตัวอย่างที่ 3: Top Items
```
คำถาม: "TOP 10 สินค้า 6 เดือน"
Output:
1. ITEM001 - ยอดขาย: 500,000 (Invoice: 20, Departments: ศูนย์ A, ศูนย์ B)
2. ITEM002 - ยอดขาย: 400,000 (Invoice: 15, Departments: ศูนย์ A)
3. ITEM003 - ยอดขาย: 300,000 (Invoice: 10, Departments: ศูนย์ B, ศูนย์ C)
```
