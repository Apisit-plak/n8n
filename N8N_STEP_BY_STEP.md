# คู่มือ Step-by-Step สำหรับ Setup Invoice Detail Query ใน n8n

## สถานะปัจจุบันของ Workflow

จากภาพที่เห็น workflow ของคุณมี:
1. ✅ Webhook
2. ✅ ตัวแยกข้อความที่ส่งมาจากเว็ป
3. ✅ ถ้าหากข้อความที่เข้ามา (If node)
4. ✅ ถูก (JavaScript node)
5. ✅ Execute a SQL query
6. ✅ If (ตรวจสอบผลลัพธ์)
7. ✅ Code in JavaScript
8. ✅ Reply to user

## สิ่งที่ต้องทำ

### ✅ Nodes ที่มีอยู่แล้ว - ไม่ต้องเพิ่ม
- Webhook
- Text Separator (ตัวแยกข้อความ)
- If nodes
- Execute SQL Query
- JavaScript Code
- Respond to Webhook

### ⚠️ Nodes ที่ต้องแก้ไข

#### 1. Execute SQL Query Node - **ต้องแก้ไข SQL**

**ขั้นตอน**:
1. คลิกที่ **"Execute a SQL query"** node
2. ไปที่ tab **Parameters**
3. เปลี่ยน SQL query เป็น:

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

**สำคัญ**: 
- `{{ $json.invoice_no }}` จะดึงค่าจาก node ก่อนหน้า
- ตรวจสอบว่า database connection ถูกต้อง

#### 2. JavaScript Node "ถูก" - **ต้องแก้ไข Code**

**ขั้นตอน**:
1. คลิกที่ **"ถูก"** node (JavaScript node ก่อน SQL Query)
2. เปลี่ยน code เป็น (รวมทั้ง Invoice Number และ Customer Name):

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

**Output ที่ต้องการ**:
```json
{
  "invoice_no": "IV0303304",
  "text": "IV0303304",
  "session_id": "u_001"
}
```

#### 3. JavaScript Node "Code in JavaScript" - **ต้องแก้ไข Code**

**ขั้นตอน**:
1. คลิกที่ **"Code in JavaScript"** node (หลัง SQL Query)
2. เปลี่ยน code เป็น:

```javascript
// รับข้อมูล invoice lines จาก SQL Query
const invoiceLines = $input.all();

// ตรวจสอบว่ามีข้อมูลหรือไม่
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

#### 4. Respond to Webhook Node "Reply to user" - **ตรวจสอบ**

**ขั้นตอน**:
1. คลิกที่ **"Reply to user"** node
2. ตรวจสอบว่า **Response Body** เป็น:
   ```json
   {
     "reply": "{{ $json.reply }}"
   }
   ```

## สรุป: ไม่ต้องเพิ่ม Node ใหม่

### ✅ สิ่งที่ต้องทำ:
1. **แก้ไข SQL Query** ใน "Execute a SQL query" node
2. **แก้ไข JavaScript code** ใน "ถูก" node (ตรวจสอบว่าแยก invoice_no ได้)
3. **แก้ไข JavaScript code** ใน "Code in JavaScript" node (จัดรูปแบบผลลัพธ์)
4. **ตรวจสอบ** Respond to Webhook node

### ❌ ไม่ต้องเพิ่ม:
- ไม่ต้องเพิ่ม node ใหม่
- Workflow structure ที่มีอยู่แล้วใช้ได้

## การทดสอบ

1. **Save workflow**
2. **Activate workflow** (เปิดสวิตช์ที่มุมบนขวา)
3. **Execute step** ในแต่ละ node เพื่อทดสอบ
4. **ทดสอบจาก chat** - ส่งข้อความ "IV0303304"

## Troubleshooting

### SQL Query ไม่ทำงาน
- ✅ ตรวจสอบ database connection
- ✅ ตรวจสอบว่า `{{ $json.invoice_no }}` มีค่าหรือไม่
- ✅ Execute step ใน "ถูก" node เพื่อดู output

### ไม่ได้ผลลัพธ์
- ✅ Execute step ใน "Execute a SQL query" เพื่อดูว่ามีข้อมูลหรือไม่
- ✅ ตรวจสอบ If node ว่าตรวจสอบผลลัพธ์ถูกต้องหรือไม่

### Format ไม่ถูกต้อง
- ✅ Execute step ใน "Code in JavaScript" เพื่อดู output
- ✅ ตรวจสอบว่า field names ตรงกับ SQL query หรือไม่

