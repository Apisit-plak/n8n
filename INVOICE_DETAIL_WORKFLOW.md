# Workflow สำหรับ Query Invoice Detail

## SQL Query ที่ใช้

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
ORDER BY l.inv_line_no;
```

## Nodes ที่ต้องใช้

### 1. Webhook Node (มีอยู่แล้ว)
- **HTTP Method**: `POST`
- **Path**: `/webhook-test/plak`
- **Fields to Set**:
  - `text`: `{{ $json.text }}`
  - `session_id`: `{{ $json.session_id }}`

### 2. Text Separator Node (ตัวแยกข้อความ) ⚠️ ต้องเพิ่ม
**หน้าที่**: แยก invoice number จากข้อความที่ผู้ใช้ส่งมา

**การตั้งค่า**:
- **Operation**: `Extract` หรือ `Split`
- **Field to Extract**: `text`
- **Pattern**: `IV\d+` หรือ `[A-Z]{2}\d+` (regex pattern สำหรับ invoice number)

**Output**: 
```json
{
  "invoice_no": "IV0303304",
  "text": "IV0303304",
  "session_id": "u_001"
}
```

**หรือใช้ JavaScript Node แทน**:
```javascript
// รับข้อความจาก webhook
const text = $input.item.json.text;
const sessionId = $input.item.json.session_id;

// แยก invoice number (เช่น IV0303304)
const invoiceMatch = text.match(/([A-Z]{2}\d+)/i);
const invoiceNo = invoiceMatch ? invoiceMatch[1].toUpperCase() : null;

if (!invoiceNo) {
  return [{ 
    reply: 'กรุณาระบุเลข invoice เช่น IV0303304',
    session_id: sessionId 
  }];
}

return [{ 
  invoice_no: invoiceNo,
  text: text,
  session_id: sessionId 
}];
```

### 3. If Node (ถ้าหากข้อความที่เข้ามา) ⚠️ ต้องเพิ่ม/แก้ไข
**หน้าที่**: ตรวจสอบว่ามี invoice number หรือไม่

**Condition**:
- **Value 1**: `{{ $json.invoice_no }}`
- **Operation**: `is not empty`
- **Value 2**: (ว่าง)

**Output**:
- `true` → ไปที่ Execute SQL Query
- `false` → ไปที่ Error Response

### 4. Execute SQL Query Node (มีอยู่แล้ว) ⚠️ ต้องแก้ไข
**การตั้งค่า**:
- **Database**: ตั้งค่า connection กับ database
- **Query**: ใช้ SQL query ที่ให้มา
- **Parameters**: 
  - `{{ $json.invoice_no }}` จะถูกแทนที่ใน query

**Output**: Array of invoice line items

### 5. If Node (ตรวจสอบผลลัพธ์) ⚠️ ต้องเพิ่ม
**หน้าที่**: ตรวจสอบว่ามีข้อมูล invoice หรือไม่

**Condition**:
- **Value 1**: `{{ $input.all().length }}`
- **Operation**: `larger`
- **Value 2**: `0`

**Output**:
- `true` → ไปที่ JavaScript Code (จัดรูปแบบ)
- `false` → ไปที่ Error Response (ไม่พบข้อมูล)

### 6. JavaScript Code Node (Code in JavaScript) ⚠️ ต้องแก้ไข
**หน้าที่**: จัดรูปแบบผลลัพธ์จาก SQL Query

**Code**:
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

### 7. Respond to Webhook Node (Reply to user) (มีอยู่แล้ว)
**การตั้งค่า**:
- **Response Code**: `200`
- **Response Body**: 
  ```json
  {
    "reply": "{{ $json.reply }}"
  }
  ```

## Workflow Structure ที่สมบูรณ์

```
[Webhook]
  ↓
[Text Separator / JavaScript: แยก invoice_no]
  ↓
[If: ตรวจสอบ invoice_no]
  ↓ (true)
[Execute SQL Query: Query invoice lines]
  ↓
[If: ตรวจสอบว่ามีข้อมูล]
  ↓ (true)
[JavaScript: จัดรูปแบบผลลัพธ์]
  ↓
[Respond to Webhook: {{ $json.reply }}]
```

## Error Handling

### Path 1: ไม่มี invoice number
```
[If: invoice_no is empty]
  ↓ (false)
[JavaScript: "ผิด" - return error message]
  ↓
[Respond to Webhook: Error response]
```

### Path 2: ไม่พบข้อมูล
```
[If: No data from SQL]
  ↓ (false)
[JavaScript: "ผิด1" - return "ไม่พบข้อมูล"]
  ↓
[Respond to Webhook: Error response]
```

## Nodes ที่ต้องเพิ่ม/แก้ไข

### ✅ ต้องเพิ่ม:
1. **Text Separator Node** หรือ **JavaScript Node** - สำหรับแยก invoice number
2. **If Node** - ตรวจสอบผลลัพธ์จาก SQL Query

### ⚠️ ต้องแก้ไข:
1. **Execute SQL Query Node** - ใช้ SQL query ที่ให้มา
2. **JavaScript Code Node** - จัดรูปแบบผลลัพธ์ตามโครงสร้างข้อมูลที่ได้

## Tips

1. **Parameterized Query**: n8n จะแทนที่ `{{ $json.invoice_no }}` อัตโนมัติ
2. **Error Handling**: ตรวจสอบว่ามีข้อมูลก่อนจัดรูปแบบ
3. **Number Formatting**: ใช้ `toLocaleString('th-TH')` สำหรับจัดรูปแบบตัวเลข
4. **Array Processing**: ใช้ `$input.all()` เพื่อรับ array จาก SQL Query

