# ตัวอย่าง n8n Workflow สำหรับ Query 10 อันดับ Invoice ที่มีราคามากที่สุด

## Workflow Structure

```
[Webhook] → [If: ตรวจสอบคำสั่ง] → [Execute SQL Query] → [JavaScript: จัดรูปแบบ] → [Respond to Webhook]
```

## Step-by-Step Setup

### 1. Webhook Node
- **HTTP Method**: `POST`
- **Path**: `/webhook-test/plak`
- **Fields to Set**:
  - `text`: `{{ $json.text }}`
  - `session_id`: `{{ $json.session_id }}`

### 2. If Node (ตรวจสอบคำสั่ง)

**Condition**: ตรวจสอบว่าผู้ใช้ต้องการดู top invoices หรือไม่

**Settings**:
- **Value 1**: `{{ $json.text }}`
- **Operation**: `contains`
- **Value 2**: `top` หรือ `อันดับ` หรือ `invoice` (ตามที่ต้องการ)

**Output**: 
- `true` → ไปที่ Execute SQL Query
- `false` → ไปที่ workflow อื่น (เช่น invoice detail)

### 3. Execute SQL Query Node

**Database**: ตั้งค่า connection กับ database ของคุณ

**Query**:
```sql
SELECT TOP 10 
    invoice_number,
    customer_name,
    total_amount,
    invoice_date
FROM invoices
ORDER BY total_amount DESC
```

หรือถ้าใช้ MySQL:
```sql
SELECT 
    invoice_number,
    customer_name,
    total_amount,
    invoice_date
FROM invoices
ORDER BY total_amount DESC
LIMIT 10
```

**Output**: Array of invoice objects

### 4. JavaScript Node (จัดรูปแบบผลลัพธ์)

**Code**:
```javascript
// รับข้อมูลจาก SQL Query
const invoices = $input.all();

// ตรวจสอบว่ามีข้อมูลหรือไม่
if (!invoices || invoices.length === 0) {
  return [{ reply: 'ไม่พบข้อมูล invoice' }];
}

// จัดรูปแบบข้อความ
let reply = `🏆 **10 อันดับ Invoice ที่มีราคามากที่สุด**\n\n`;

invoices.forEach((invoice, index) => {
  const data = invoice.json;
  const rank = index + 1;
  const invoiceNumber = data.invoice_number || 'N/A';
  const customerName = data.customer_name || 'N/A';
  const totalAmount = data.total_amount ? 
    new Intl.NumberFormat('th-TH').format(data.total_amount) : '0';
  const invoiceDate = data.invoice_date ? 
    new Date(data.invoice_date).toLocaleDateString('th-TH') : 'N/A';
  
  reply += `${rank}. 📄 ${invoiceNumber}\n`;
  reply += `   👤 ${customerName}\n`;
  reply += `   💰 ราคา: ${totalAmount} บาท\n`;
  reply += `   📅 วันที่: ${invoiceDate}\n`;
  
  if (index < invoices.length - 1) {
    reply += `\n`;
  }
});

return [{ reply: reply }];
```

### 5. Respond to Webhook Node

**Response Body**:
```json
{
  "reply": "{{ $json.reply }}"
}
```

## ตัวอย่างผลลัพธ์

```
🏆 **10 อันดับ Invoice ที่มีราคามากที่สุด**

1. 📄 IV0303304
   👤 45-0096 การ์เดียนอินดัสทรีส์ คอร์ป
   💰 ราคา: 558,900 บาท
   📅 วันที่: 20/1/2026

2. 📄 IV0303303
   👤 45-0095 ABC Company
   💰 ราคา: 450,000 บาท
   📅 วันที่: 19/1/2026

...
```

## Workflow แบบสมบูรณ์ (มีหลายคำสั่ง)

### If Node แบบหลายเงื่อนไข

**Condition 1**: Top invoices
- **Value 1**: `{{ $json.text.toLowerCase() }}`
- **Operation**: `contains`
- **Value 2**: `top` หรือ `อันดับ` หรือ `invoice`

**Condition 2**: Invoice detail
- **Value 1**: `{{ $json.text }}`
- **Operation**: `matches regex`
- **Value 2**: `IV\d+` (ตรวจสอบว่าเป็น invoice number)

### JavaScript Node สำหรับจัดการหลายคำสั่ง

```javascript
const text = $input.item.json.text.toLowerCase();
const sessionId = $input.item.json.session_id;

// ตรวจสอบคำสั่ง
if (text.includes('top') || text.includes('อันดับ') || text.includes('invoice')) {
  // ส่งต่อไปที่ SQL Query node
  return [{ 
    action: 'query_top_invoices',
    text: text,
    session_id: sessionId 
  }];
} else if (text.match(/iv\d+/i)) {
  // ส่งต่อไปที่ Invoice Detail query
  const invoiceNumber = text.match(/iv\d+/i)[0].toUpperCase();
  return [{ 
    action: 'query_invoice_detail',
    invoice_number: invoiceNumber,
    session_id: sessionId 
  }];
} else {
  // คำสั่งไม่รู้จัก
  return [{ 
    reply: 'กรุณาระบุคำสั่ง เช่น:\n- "top 10 invoice" หรือ "อันดับ invoice"\n- "IV0303304" (ดูรายละเอียด invoice)' 
  }];
}
```

## ตัวอย่าง SQL Query ที่ซับซ้อนกว่า

### Query พร้อม JOIN และ Aggregate

```sql
SELECT TOP 10
    i.invoice_number,
    c.customer_name,
    SUM(il.quantity * il.unit_price) as total_amount,
    i.invoice_date,
    COUNT(il.item_id) as item_count
FROM invoices i
INNER JOIN customers c ON i.customer_id = c.customer_id
INNER JOIN invoice_lines il ON i.invoice_id = il.invoice_id
WHERE i.status = 'paid'
GROUP BY i.invoice_number, c.customer_name, i.invoice_date
ORDER BY total_amount DESC
```

## Tips

1. **ใช้ Parameterized Query** - เพื่อป้องกัน SQL injection
2. **Cache Results** - ถ้าข้อมูลไม่เปลี่ยนบ่อย
3. **Error Handling** - จัดการกรณี database error
4. **Format Numbers** - ใช้ `Intl.NumberFormat` สำหรับจัดรูปแบบตัวเลข
5. **Date Formatting** - ใช้ `toLocaleDateString` สำหรับวันที่

## Error Handling

```javascript
try {
  const invoices = $input.all();
  
  if (!invoices || invoices.length === 0) {
    return [{ reply: 'ไม่พบข้อมูล invoice' }];
  }
  
  // ... format code ...
  
} catch (error) {
  return [{ 
    reply: `เกิดข้อผิดพลาด: ${error.message}\nกรุณาลองใหม่อีกครั้ง` 
  }];
}
```

