# Code สำหรับ Format Response ในแต่ละ Action Type

## วิธีใช้งาน
- ใช้ Code node สำหรับ format ข้อมูลจาก SQL Query ก่อนส่งไปยัง Respond to Webhook
- Mode: "Run Once for All Items" (เพราะต้อง format หลาย items)

---

## 1. Format Invoice Detail

**Input:** ข้อมูลจาก Execute SQL Query - Invoice Detail (หลาย rows)

```javascript
const items = $input.all();
let formattedReply = '';

if (!items || items.length === 0) {
  return [{
    reply: 'ไม่พบข้อมูล Invoice นี้',
    session_id: items[0]?.json?.session_id || 'u_001'
  }];
}

const firstItem = items[0].json;
const invoiceNo = firstItem.invoice_no;
const customerName = firstItem.customer_name;
const department = firstItem.department_name;
const salesPerson = firstItem.sales_person_name;
const invDate = firstItem.inv_date;

// คำนวณยอดรวม
let totalAmount = 0;
let totalVat = 0;
items.forEach(item => {
  totalAmount += parseFloat(item.json.inv_line_amount || 0);
  totalVat += parseFloat(item.json.inv_line_amount_vat || 0);
});
const netAmount = totalAmount + totalVat;

formattedReply = `📄 Invoice: ${invoiceNo}\n`;
formattedReply += `👤 ลูกค้า: ${customerName}\n`;
formattedReply += `🏢 หน่วยงาน: ${department}\n`;
formattedReply += `👨‍💼 เซลส์: ${salesPerson}\n`;
formattedReply += `📅 วันที่: ${invDate}\n\n`;
formattedReply += `📦 รายการ:\n`;

items.forEach((item, index) => {
  const line = item.json;
  formattedReply += `${line.inv_line_no || index + 1}. ${line.inv_line_description || ''}\n`;
  formattedReply += `   จำนวน: ${line.inv_line_quantity || 0} ${line.inv_line_unit || ''} `;
  formattedReply += `ราคา: ${parseFloat(line.inv_unit_price || 0).toLocaleString()} `;
  formattedReply += `ยอด: ${parseFloat(line.inv_line_amount || 0).toLocaleString()}\n\n`;
});

formattedReply += `💰 รวมก่อน VAT: ${totalAmount.toLocaleString()}\n`;
formattedReply += `💵 VAT: ${totalVat.toLocaleString()}\n`;
formattedReply += `✅ รวมสุทธิ: ${netAmount.toLocaleString()}`;

return [{
  reply: formattedReply,
  session_id: firstItem.session_id || 'u_001'
}];
```

---

## 2. Format Customer Invoices

**Input:** ข้อมูลจาก Execute SQL Query - Customer Invoices (หลาย rows)

```javascript
const items = $input.all();
let formattedReply = '';

if (!items || items.length === 0) {
  return [{
    reply: 'ไม่พบ Invoice ของลูกค้านี้',
    session_id: items[0]?.json?.session_id || 'u_001'
  }];
}

const customerName = items[0].json.customer_name || '';

formattedReply = `📋 Invoice ของ ${customerName}\n\n`;
formattedReply += `พบทั้งหมด ${items.length} ใบ\n\n`;

items.forEach((item, index) => {
  const inv = item.json;
  formattedReply += `${index + 1}. Invoice: ${inv.invoice_no}\n`;
  formattedReply += `   วันที่: ${inv.inv_date || ''}\n`;
  formattedReply += `   ยอดรวม: ${parseFloat(inv.inv_total_amount || 0).toLocaleString()}\n`;
  formattedReply += `   VAT: ${parseFloat(inv.inv_total_vat || 0).toLocaleString()}\n`;
  formattedReply += `   รวมสุทธิ: ${parseFloat(inv.inv_net_amount || 0).toLocaleString()}\n\n`;
});

return [{
  reply: formattedReply,
  session_id: items[0].json.session_id || 'u_001'
}];
```

---

## 3. Format Top Items

**Input:** ข้อมูลจาก Execute SQL Query - Top Items (หลาย rows)

```javascript
const items = $input.all();
let formattedReply = '';

if (!items || items.length === 0) {
  return [{
    reply: 'ไม่พบข้อมูลรายการสินค้า',
    session_id: items[0]?.json?.session_id || 'u_001'
  }];
}

formattedReply = `🏆 รายการสินค้าที่มียอดขายเยอะที่สุด\n\n`;

items.forEach((item, index) => {
  const product = item.json;
  formattedReply += `${index + 1}. ${product.item_description || product.item_no}\n`;
  formattedReply += `   รหัส: ${product.item_no || ''}\n`;
  formattedReply += `   ยอดรวม: ${parseFloat(product.total_amount || 0).toLocaleString()}\n`;
  formattedReply += `   VAT: ${parseFloat(product.total_amount_vat || 0).toLocaleString()}\n`;
  formattedReply += `   จำนวน: ${parseFloat(product.total_quantity || 0).toLocaleString()}\n`;
  formattedReply += `   จำนวน Invoice: ${product.invoice_count || 0}\n\n`;
});

return [{
  reply: formattedReply,
  session_id: items[0].json.session_id || 'u_001'
}];
```

---

## 4. Format Top Center

**Input:** ข้อมูลจาก Execute SQL Query - Top Center (หลาย rows)

```javascript
const items = $input.all();
let formattedReply = '';

if (!items || items.length === 0) {
  return [{
    reply: 'ไม่พบข้อมูลหน่วยงาน',
    session_id: items[0]?.json?.session_id || 'u_001'
  }];
}

formattedReply = `🏢 ศูนย์/หน่วยงานที่มียอดขายเยอะที่สุด\n\n`;

items.forEach((item, index) => {
  const center = item.json;
  formattedReply += `${index + 1}. ${center.department_name || center.department}\n`;
  formattedReply += `   รหัส: ${center.department || ''}\n`;
  formattedReply += `   ยอดรวม: ${parseFloat(center.net_amount || 0).toLocaleString()}\n`;
  formattedReply += `   VAT: ${parseFloat(center.total_vat || 0).toLocaleString()}\n`;
  formattedReply += `   จำนวน Invoice: ${center.invoice_count || 0}\n`;
  formattedReply += `   ยอดเฉลี่ยต่อ Invoice: ${parseFloat(center.avg_invoice_amount || 0).toLocaleString()}\n\n`;
});

return [{
  reply: formattedReply,
  session_id: items[0].json.session_id || 'u_001'
}];
```

---

## 5. Format Monthly Sales

**Input:** ข้อมูลจาก Execute SQL Query - Monthly Sales (หลาย rows)

```javascript
const items = $input.all();
let formattedReply = '';

if (!items || items.length === 0) {
  return [{
    reply: 'ไม่พบข้อมูลยอดขายรายเดือน',
    session_id: items[0]?.json?.session_id || 'u_001'
  }];
}

formattedReply = `📅 ยอด Invoice แต่ละเดือน\n\n`;

items.forEach((item) => {
  const month = item.json;
  formattedReply += `${month.month_name || month.month}\n`;
  formattedReply += `   จำนวน Invoice: ${month.invoice_count || 0}\n`;
  formattedReply += `   ยอดรวม: ${parseFloat(month.total_amount || 0).toLocaleString()}\n`;
  formattedReply += `   VAT: ${parseFloat(month.total_vat || 0).toLocaleString()}\n`;
  formattedReply += `   รวมสุทธิ: ${parseFloat(month.net_amount || 0).toLocaleString()}\n`;
  formattedReply += `   เฉลี่ยต่อ Invoice: ${parseFloat(month.avg_invoice_amount || 0).toLocaleString()}\n\n`;
});

return [{
  reply: formattedReply,
  session_id: items[0].json.session_id || 'u_001'
}];
```

---

## 6. Format Product Group Sales

**Input:** ข้อมูลจาก Execute SQL Query - Product Group Sales (หลาย rows)

```javascript
const items = $input.all();
let formattedReply = '';

if (!items || items.length === 0) {
  return [{
    reply: 'ไม่พบข้อมูลกลุ่มสินค้า',
    session_id: items[0]?.json?.session_id || 'u_001'
  }];
}

formattedReply = `📦 ยอดขายสินค้าแยกตามกลุ่ม\n\n`;

items.forEach((item, index) => {
  const group = item.json;
  formattedReply += `${index + 1}. ${group.product_group}\n`;
  formattedReply += `   ยอดรวม: ${parseFloat(group.total_amount || 0).toLocaleString()}\n`;
  formattedReply += `   VAT: ${parseFloat(group.total_amount_vat || 0).toLocaleString()}\n`;
  formattedReply += `   จำนวนสินค้า: ${group.item_count || 0}\n`;
  formattedReply += `   จำนวน Invoice: ${group.invoice_count || 0}\n`;
  formattedReply += `   จำนวนรวม: ${parseFloat(group.total_quantity || 0).toLocaleString()}\n\n`;
});

return [{
  reply: formattedReply,
  session_id: items[0].json.session_id || 'u_001'
}];
```

---

## หมายเหตุสำคัญ

1. **Mode:** ใช้ "Run Once for All Items" เพราะต้อง format หลาย items
2. **Return:** ต้อง return เป็น array `[{ ... }]` เสมอ
3. **Session ID:** ดึงจาก input items หรือใช้ default `'u_001'`
4. **Number Formatting:** ใช้ `.toLocaleString()` เพื่อ format ตัวเลขให้อ่านง่าย
5. **Error Handling:** ตรวจสอบว่ามี items หรือไม่ก่อน format

---

## วิธีใช้งาน

1. เพิ่ม Code node หลังจาก Execute SQL Query node
2. ตั้งค่า Mode: "Run Once for All Items"
3. Copy โค้ดที่เหมาะสมจากด้านบน
4. วางใน Code editor
5. เชื่อมต่อไปยัง Respond to Webhook node
