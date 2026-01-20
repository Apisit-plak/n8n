# คู่มือการตั้งค่า Nodes ทั้งหมดใน Workflow

## 1. Node "ถูก" (JavaScript) - แยก invoice_no หรือ customer_name

### การตั้งค่า Code:

```javascript
const text = ($json.text ?? '').toUpperCase();
const sessionId = $json.session_id;

// 1. ตรวจสอบว่าเป็น Invoice Number (IV0303304)
const invoiceMatch = text.match(/\bIV\d{7}\b/);
if (invoiceMatch) {
  return [{
    action: 'invoice_detail',
    invoice_no: invoiceMatch[0].trim(),
    text: text,
    session_id: sessionId
  }];
}

// 2. ตรวจสอบว่าเป็นคำถาม Invoice ของลูกค้า
const keywords = ['INVOICE', 'อินวอย', 'ใบแจ้งหนี้', 'บิล'];
const isInvoiceQuery = keywords.some(k => text.includes(k));

if (isInvoiceQuery) {
  // ตัด keyword ออก เหลือเฉพาะชื่อลูกค้า
  let customerName = text;
  keywords.forEach(k => {
    customerName = customerName.replace(new RegExp(k, 'ig'), '');
  });
  customerName = customerName.trim();

  if (!customerName) {
    return [{
      action: 'missing_name',
      reply: 'กรุณาพิมพ์ชื่อลูกค้าตามด้วยคำว่า invoice เช่น "การ์เดียนอินดัสทรีส์ invoice"',
      session_id: sessionId
    }];
  }

  return [{
    action: 'customer_invoices',
    customer_name: customerName,
    text: text,
    session_id: sessionId
  }];
}

// 3. ถ้าไม่ใช่ทั้งสองแบบ
return [{
  action: 'unknown',
  reply: 'กรุณาระบุ:\n- เลข Invoice เช่น IV0303304\n- หรือชื่อลูกค้าตามด้วยคำว่า invoice เช่น "การ์เดียนอินดัสทรีส์ invoice"',
  session_id: sessionId
}];
```

### Output ที่ได้:
- `action: 'invoice_detail'` + `invoice_no`
- `action: 'customer_invoices'` + `customer_name`
- `action: 'unknown'` หรือ `'missing_name'` + `reply`

### ต่อจากนี้:
→ ไปที่ **Switch - Route by Action**

---

## 2. Switch - Route by Action (Switch Node)

### การตั้งค่า:

**Mode**: `Rules`

**Rule 1: invoice_detail**
- **Value 1**: `{{ $json.action }}`
- **Operation**: `equal`
- **Value 2**: `invoice_detail`
- **Output**: → เชื่อมต่อไปที่ "Execute SQL Query - Invoice Detail"

**Rule 2: customer_invoices**
- **Value 1**: `{{ $json.action }}`
- **Operation**: `equal`
- **Value 2**: `customer_invoices`
- **Output**: → เชื่อมต่อไปที่ "Execute SQL Query - Customer Invoices"

**Fallback Output**: → เชื่อมต่อไปที่ Error Response node (ถ้ามี)

### ต่อจากนี้:
- **Rule 1** → ไปที่ **Execute SQL Query - Invoice Detail**
- **Rule 2** → ไปที่ **Execute SQL Query - Customer Invoices**
- **Fallback** → ไปที่ Error Response

---

## 3. Execute SQL Query - Invoice Detail

### การตั้งค่า:

**Database Connection**: ตั้งค่า connection กับ database

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

### Output ที่ได้:
- Array of invoice line items (หลาย rows)

### ต่อจากนี้:
→ ไปที่ **If Node** (ตรวจสอบผลลัพธ์) → **Code in JavaScript - Format Invoice Detail**

---

## 4. If Node (ตรวจสอบผลลัพธ์ Invoice Detail)

### การตั้งค่า:

**Condition**:
- **Value 1**: `{{ $input.all().length }}`
- **Operation**: `larger`
- **Value 2**: `0`

### Output:
- `true` → ไปที่ **Code in JavaScript - Format Invoice Detail**
- `false` → ไปที่ Error Response (เช่น "ผิด1" node)

---

## 5. Code in JavaScript - Format Invoice Detail

### การตั้งค่า Code:

```javascript
// รับข้อมูล invoice lines จาก SQL Query
const invoiceLines = $input.all();

if (!invoiceLines || invoiceLines.length === 0) {
  return [{ reply: 'ไม่พบข้อมูล invoice' }];
}

// ดึงข้อมูล header จาก item แรก
const firstLine = invoiceLines[0].json;
const invoiceNo = firstLine.invoice_no || 'N/A';
const customerNo = firstLine.customer_no || 'N/A';
const customerName = firstLine.customer_name || 'N/A';
const department = firstLine.department || 'N/A';
const departmentName = firstLine.department_name || 'N/A';
const salesPerson = firstLine.sales_person || 'N/A';
const salesPersonName = firstLine.sales_person_name || 'N/A';

// คำนวณยอดรวม
let subtotal = 0;
let totalVat = 0;

invoiceLines.forEach(line => {
  const data = line.json;
  subtotal += parseFloat(data.inv_line_amount || 0);
  totalVat += parseFloat(data.inv_line_amount_vat || 0);
});

const grandTotal = subtotal + totalVat;

// จัดรูปแบบข้อความ
let reply = `📄 Invoice: ${invoiceNo}\n`;
reply += `👤 ลูกค้า: ${customerNo} ${customerName}\n`;
reply += `🏢 หน่วยงาน: ${department} ${departmentName}\n`;
reply += `👨‍💼 เซลส์: ${salesPerson} ${salesPersonName}\n`;
reply += `\n📦 รายการ:\n`;

invoiceLines.forEach((line, index) => {
  const data = line.json;
  const lineNo = data.inv_line_no || '';
  const itemNo = data.inv_line_item_no || '';
  const description = data.inv_line_description || '';
  const quantity = parseFloat(data.inv_line_quantity || 0).toFixed(2);
  const unit = data.inv_line_unit || '';
  const unitPrice = parseFloat(data.inv_unit_price || 0).toLocaleString('th-TH');
  const amount = parseFloat(data.inv_line_amount || 0).toLocaleString('th-TH');
  
  reply += `${lineNo}. ${itemNo} ${description}\n`;
  reply += `   จำนวน: ${quantity} ${unit} ราคา: ${unitPrice} ยอด: ${amount}\n`;
  
  if (index < invoiceLines.length - 1) {
    reply += `\n`;
  }
});

reply += `\n💰 รวมก่อน VAT: ${subtotal.toLocaleString('th-TH')}\n`;
reply += `💵 VAT: ${totalVat.toLocaleString('th-TH')}\n`;
reply += `✅ รวมสุทธิ: ${grandTotal.toLocaleString('th-TH')}`;

return [{ reply: reply }];
```

### Output ที่ได้:
- `reply`: ข้อความที่จัดรูปแบบแล้ว

### ต่อจากนี้:
→ ไปที่ **Reply to user** (Respond to Webhook)

---

## 6. Execute SQL Query - Customer Invoices

### การตั้งค่า:

**Database Connection**: ใช้ connection เดียวกับ Invoice Detail

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

### Output ที่ได้:
- Array of invoice headers (หลาย rows)

### ต่อจากนี้:
→ ไปที่ **Code in JavaScript - Format Customer Invoices**

---

## 7. Code in JavaScript - Format Customer Invoices

### การตั้งค่า Code:

```javascript
const rows = $input.all();

if (!rows || rows.length === 0) {
  const customerName = $item(0).$node['Code in JavaScript'].json.customer_name || 'ลูกค้า';
  return [{ reply: `ไม่พบ invoice ของลูกค้า: ${customerName}` }];
}

const firstRow = rows[0].json;
const customerName = firstRow.customer_name || 'ลูกค้า';
const customerNo = firstRow.customer_no || '';
const department = firstRow.department || '';
const departmentName = firstRow.department_name || '';
const salesPerson = firstRow.sales_person || '';
const salesPersonName = firstRow.sales_person_name || '';

// คำนวณยอดรวมทั้งหมด
let totalAll = 0;
rows.forEach(row => {
  const amount = parseFloat(row.json.total_amount || 0);
  const vat = parseFloat(row.json.total_amount_vat || 0);
  totalAll += amount + vat;
});

let reply = `📋 รายการ Invoice ของลูกค้า\n`;
reply += `👤 ${customerNo} ${customerName}\n`;
if (department) {
  reply += `🏢 หน่วยงาน: ${department} ${departmentName}\n`;
}
if (salesPerson) {
  reply += `👨‍💼 เซลส์: ${salesPerson} ${salesPersonName}\n`;
}
reply += `\nพบทั้งหมด ${rows.length} รายการ\n\n`;

rows.forEach((row, index) => {
  const data = row.json;
  const invoiceNo = data.invoice_no || 'N/A';
  const invoiceDate = data.invoice_date ? 
    new Date(data.invoice_date).toLocaleDateString('th-TH') : 'N/A';
  const totalAmount = parseFloat(data.total_amount || 0);
  const totalVat = parseFloat(data.total_amount_vat || 0);
  const grandTotal = totalAmount + totalVat;
  
  reply += `${index + 1}. 📄 ${invoiceNo}\n`;
  reply += `   📅 วันที่: ${invoiceDate}\n`;
  reply += `   💰 รวมก่อน VAT: ${totalAmount.toLocaleString('th-TH')} บาท\n`;
  reply += `   💵 VAT: ${totalVat.toLocaleString('th-TH')} บาท\n`;
  reply += `   ✅ รวมสุทธิ: ${grandTotal.toLocaleString('th-TH')} บาท\n`;
  
  if (index < rows.length - 1) {
    reply += `\n`;
  }
});

reply += `\n💰 ยอดรวมทั้งหมด: ${totalAll.toLocaleString('th-TH')} บาท`;

return [{ reply: reply }];
```

### Output ที่ได้:
- `reply`: ข้อความที่จัดรูปแบบแล้ว

### ต่อจากนี้:
→ ไปที่ **Reply to user** (Respond to Webhook)

---

## 8. Reply to user (Respond to Webhook)

### การตั้งค่า:

**Respond With**: `JSON`

**Response Body**:
```json
{
  "reply": "{{ $json.reply }}"
}
```

**Response Code**: `200`

### Output:
- ส่ง response กลับไปที่ chat interface

---

## สรุป Flow ทั้งหมด:

```
1. [ถูก] (JavaScript: แยก invoice_no หรือ customer_name)
   ↓
2. [Switch - Route by Action] (แยก flow)
   ├─ Rule 1: invoice_detail
   │   ↓
   │   3. [Execute SQL Query - Invoice Detail]
   │      ↓
   │   4. [If: ตรวจสอบผลลัพธ์]
   │      ↓ (true)
   │   5. [Code in JavaScript - Format Invoice Detail]
   │      ↓
   │   8. [Reply to user]
   │
   └─ Rule 2: customer_invoices
       ↓
       6. [Execute SQL Query - Customer Invoices]
          ↓
       7. [Code in JavaScript - Format Customer Invoices]
          ↓
       8. [Reply to user]
```

## Checklist การตั้งค่า:

- [ ] Node "ถูก" - ตั้งค่า JavaScript code
- [ ] Switch Node - ตั้งค่า Rules (2 rules)
- [ ] Execute SQL Query - Invoice Detail - ตั้งค่า SQL query
- [ ] If Node - ตั้งค่า condition
- [ ] Code in JavaScript - Format Invoice Detail - ตั้งค่า code
- [ ] Execute SQL Query - Customer Invoices - ตั้งค่า SQL query
- [ ] Code in JavaScript - Format Customer Invoices - ตั้งค่า code
- [ ] Reply to user - ตั้งค่า Response Body

