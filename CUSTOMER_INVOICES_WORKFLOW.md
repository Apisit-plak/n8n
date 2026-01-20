# Workflow สำหรับ Query Invoice ของลูกค้า

## Code in JavaScript (รวมทั้ง Invoice Number และ Customer Name)

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

## Workflow Structure

```
[Webhook]
  ↓
[Code in JavaScript: แยก invoice_no หรือ customer_name]
  ↓
[If: ตรวจสอบ action]
  ├─ (action = 'invoice_detail') → [Execute SQL: Query Invoice Detail]
  ├─ (action = 'customer_invoices') → [Execute SQL: Query Customer Invoices]
  └─ (อื่นๆ) → [JavaScript: Return error message]
  ↓
[JavaScript: จัดรูปแบบผลลัพธ์]
  ↓
[Respond to Webhook]
```

## SQL Query สำหรับ Customer Invoices

### Execute SQL Query Node (ใหม่) - Customer Invoices

**Query** (ใช้โครงสร้างคล้าย Invoice Detail):
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

**หรือถ้าใช้ MySQL**:
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
WHERE h.customer_name LIKE CONCAT('%', '{{ $json.customer_name }}', '%')
ORDER BY h.inv_date DESC
```

**หรือถ้าต้องการข้อมูลจาก invoice_line (รวม line items ด้วย)**:
```sql
SELECT DISTINCT
  l.inv_line_inv_no            AS invoice_no,
  l.inv_line_customer_no       AS customer_no,
  l.inv_line_customer_name     AS customer_name,
  l.inv_line_department        AS department,
  l.inv_line_department_name   AS department_name,
  l.inv_line_sales_person      AS sales_person,
  l.inv_line_sales_person_name AS sales_person_name,
  h.inv_date                    AS invoice_date,
  SUM(l.inv_line_amount)       AS total_amount,
  SUM(l.inv_line_amount_vat)   AS total_amount_vat
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
WHERE l.inv_line_customer_name LIKE '%' || '{{ $json.customer_name }}' || '%'
GROUP BY 
  l.inv_line_inv_no,
  l.inv_line_customer_no,
  l.inv_line_customer_name,
  l.inv_line_department,
  l.inv_line_department_name,
  l.inv_line_sales_person,
  l.inv_line_sales_person_name,
  h.inv_date
ORDER BY h.inv_date DESC
```

## JavaScript Node สำหรับจัดรูปแบบ Customer Invoices

```javascript
const rows = $input.all();

if (!rows || rows.length === 0) {
  // ดึง customer_name จาก node ก่อนหน้า
  const customerName = $item(0).$node['Code in JavaScript'].json.customer_name || 'ลูกค้า';
  return [{ 
    reply: `ไม่พบ invoice ของลูกค้า: ${customerName}` 
  }];
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

## If Node สำหรับแยก Action

### If Node 1: ตรวจสอบ action

**Condition**:
- **Value 1**: `{{ $json.action }}`
- **Operation**: `equal`
- **Value 2**: `invoice_detail`

**Output**:
- `true` → ไปที่ Execute SQL Query (Invoice Detail)
- `false` → ไปที่ If Node 2

### If Node 2: ตรวจสอบ customer_invoices

**Condition**:
- **Value 1**: `{{ $json.action }}`
- **Operation**: `equal`
- **Value 2**: `customer_invoices`

**Output**:
- `true` → ไปที่ Execute SQL Query (Customer Invoices)
- `false` → ไปที่ Error Response

## ตัวอย่างการใช้งาน

### ตัวอย่างที่ 1: Query Invoice Detail
**Input**: `IV0303304`
**Output**: รายละเอียด invoice พร้อม line items

### ตัวอย่างที่ 2: Query Customer Invoices
**Input**: `การ์เดียนอินดัสทรีส์ invoice`
**Output**: 
```
📋 รายการ Invoice ของลูกค้า: 45-0096 การ์เดียนอินดัสทรีส์ คอร์ป
พบทั้งหมด 5 รายการ

1. 📄 IV0303304
   📅 วันที่: 20/1/2026
   💰 ยอดรวม: 558,900 บาท

2. 📄 IV0303303
   📅 วันที่: 19/1/2026
   💰 ยอดรวม: 450,000 บาท
...
```

## Tips

1. **Case Insensitive**: ใช้ `toUpperCase()` เพื่อให้ค้นหาได้ทั้งตัวพิมพ์เล็ก-ใหญ่
2. **Keyword Matching**: ใช้ `includes()` เพื่อตรวจสอบ keyword
3. **SQL LIKE**: ใช้ `LIKE '%...%'` เพื่อค้นหาแบบ partial match
4. **Error Handling**: จัดการกรณีไม่พบข้อมูล

