# วิธีเพิ่ม Execute SQL Query Node สำหรับ Customer Invoices

## ขั้นตอนการเพิ่ม Node

### 1. เพิ่ม Execute SQL Query Node ใหม่

1. **คลิกขวา** ที่ node "ถูก" (JavaScript node)
2. เลือก **"Add node"** → **"Execute SQL Query"**
3. ตั้งชื่อ node เป็น **"Execute SQL Query - Customer Invoices"**

### 2. ตั้งค่า SQL Query

**Database Connection**: ใช้ connection เดียวกับ Invoice Detail query

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

**หรือถ้าต้องการข้อมูลจาก invoice_line**:
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
  SUM(l.inv_line_amount_vat)   AS total_amount_vat,
  SUM(l.inv_line_amount) + SUM(l.inv_line_amount_vat) AS grand_total
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

### 3. เพิ่ม If Node เพื่อแยก Action

1. **คลิกขวา** ที่ node "ถูก" (JavaScript node)
2. เลือก **"Add node"** → **"If"**
3. ตั้งชื่อ node เป็น **"If - Check Action"**

**การตั้งค่า**:
- **Value 1**: `{{ $json.action }}`
- **Operation**: `equal`
- **Value 2**: `customer_invoices`

**Output**:
- `true` → เชื่อมต่อไปที่ "Execute SQL Query - Customer Invoices"
- `false` → เชื่อมต่อไปที่ If node เดิม (สำหรับ invoice_detail)

### 4. เพิ่ม JavaScript Node สำหรับจัดรูปแบบ

1. **คลิกขวา** ที่ "Execute SQL Query - Customer Invoices"
2. เลือก **"Add node"** → **"Code"** → **"JavaScript"**
3. ตั้งชื่อ node เป็น **"Format Customer Invoices"**

**Code**:
```javascript
const rows = $input.all();

if (!rows || rows.length === 0) {
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

### 5. เชื่อมต่อกับ Respond to Webhook

1. เชื่อมต่อ "Format Customer Invoices" → "Reply to user" (Respond to Webhook)

## Workflow Structure ที่สมบูรณ์

```
[Webhook]
  ↓
[Code in JavaScript: "ถูก" - แยก invoice_no หรือ customer_name]
  ↓
[If - Check Action]
  ├─ (action = 'invoice_detail') → [Execute SQL Query - Invoice Detail]
  │                                    ↓
  │                              [If: ตรวจสอบผลลัพธ์]
  │                                    ↓
  │                              [Code in JavaScript: Format Invoice Detail]
  │                                    ↓
  │                              [Reply to user]
  │
  └─ (action = 'customer_invoices') → [Execute SQL Query - Customer Invoices]
                                         ↓
                                    [Code in JavaScript: Format Customer Invoices]
                                         ↓
                                    [Reply to user]
```

## ตัวอย่างผลลัพธ์

### Input: "การ์เดียนอินดัสทรีส์ invoice"

### Output:
```
📋 รายการ Invoice ของลูกค้า
👤 45-0096 การ์เดียนอินดัสทรีส์ คอร์ป
🏢 หน่วยงาน: SBU70110 SBU ACG Team A (IR)
👨‍💼 เซลส์: 4802114 Mr. Sitti Ph.

พบทั้งหมด 5 รายการ

1. 📄 IV0303304
   📅 วันที่: 20/1/2026
   💰 รวมก่อน VAT: 270,000 บาท
   💵 VAT: 288,900 บาท
   ✅ รวมสุทธิ: 558,900 บาท

2. 📄 IV0303303
   📅 วันที่: 19/1/2026
   💰 รวมก่อน VAT: 200,000 บาท
   💵 VAT: 214,000 บาท
   ✅ รวมสุทธิ: 414,000 บาท

...

💰 ยอดรวมทั้งหมด: 2,500,000 บาท
```

## Tips

1. **ใช้ DISTINCT**: ถ้า query จาก invoice_line ต้องใช้ DISTINCT เพื่อไม่ให้ซ้ำ
2. **GROUP BY**: ถ้าใช้ SUM() ต้องมี GROUP BY
3. **LIKE Pattern**: ใช้ `LIKE '%...%'` เพื่อค้นหาแบบ partial match
4. **Date Formatting**: ใช้ `toLocaleDateString('th-TH')` สำหรับวันที่ไทย

