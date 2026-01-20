# การจัดรูปแบบข้อความใน n8n สำหรับ Chat Interface

## วิธีจัดรูปแบบข้อความใน n8n JavaScript Node

### วิธีที่ 1: ใช้ Plain Text + Newline (ง่ายที่สุด) ✅

ใน JavaScript node:

```javascript
const invoiceData = {
  invoice: "IV0303304",
  customer: "45-0096 การ์เดียนอินดัสทรีส์ คอร์ป",
  department: "SBU70110 SBU ACG Team A (IR)",
  sales: "4802114 Mr. Sitti Ph.",
  items: [
    { code: "30000", name: "HL2000K-2DA17-C22U AIR CHAIN HOIST MODEL HL2000K-2DA17-C22U", qty: "1.00", unit: "ชุด", price: "270,000", total: "270,000" },
    { code: "40000", name: "MC-1002 INSTRUCTION MANUAL BOOK", qty: "1.00", unit: "เล่ม", price: "0", total: "0" }
  ],
  subtotal: "270,000",
  vat: "288,900",
  total: "558,900"
};

// จัดรูปแบบข้อความ
let reply = `📄 Invoice: ${invoiceData.invoice}\n`;
reply += `👤 ลูกค้า: ${invoiceData.customer}\n`;
reply += `🏢 หน่วยงาน: ${invoiceData.department}\n`;
reply += `👨‍💼 เซลส์: ${invoiceData.sales}\n`;
reply += `\n📦 รายการ:\n`;

invoiceData.items.forEach(item => {
  reply += `• ${item.code}. ${item.name}\n`;
  reply += `  จำนวน: ${item.qty} ${item.unit} ราคา: ${item.price} ยอด: ${item.total}\n`;
});

reply += `\n💰 รวมก่อน VAT: ${invoiceData.subtotal}\n`;
reply += `💵 VAT: ${invoiceData.vat}\n`;
reply += `✅ รวมสุทธิ: ${invoiceData.total}`;

return [{ reply: reply }];
```

### วิธีที่ 2: ใช้ HTML Formatting (สวยงามกว่า)

ใน JavaScript node:

```javascript
const invoiceData = {
  invoice: "IV0303304",
  customer: "45-0096 การ์เดียนอินดัสทรีส์ คอร์ป",
  department: "SBU70110 SBU ACG Team A (IR)",
  sales: "4802114 Mr. Sitti Ph.",
  items: [
    { code: "30000", name: "HL2000K-2DA17-C22U AIR CHAIN HOIST MODEL HL2000K-2DA17-C22U", qty: "1.00", unit: "ชุด", price: "270,000", total: "270,000" },
    { code: "40000", name: "MC-1002 INSTRUCTION MANUAL BOOK", qty: "1.00", unit: "เล่ม", price: "0", total: "0" }
  ],
  subtotal: "270,000",
  vat: "288,900",
  total: "558,900"
};

// จัดรูปแบบด้วย HTML
let reply = `<strong>📄 Invoice:</strong> ${invoiceData.invoice}<br>`;
reply += `<strong>👤 ลูกค้า:</strong> ${invoiceData.customer}<br>`;
reply += `<strong>🏢 หน่วยงาน:</strong> ${invoiceData.department}<br>`;
reply += `<strong>👨‍💼 เซลส์:</strong> ${invoiceData.sales}<br>`;
reply += `<br><strong>📦 รายการ:</strong><br>`;

invoiceData.items.forEach(item => {
  reply += `• <strong>${item.code}.</strong> ${item.name}<br>`;
  reply += `&nbsp;&nbsp;จำนวน: ${item.qty} ${item.unit} ราคา: ${item.price} ยอด: ${item.total}<br>`;
});

reply += `<br><strong>💰 รวมก่อน VAT:</strong> ${invoiceData.subtotal}<br>`;
reply += `<strong>💵 VAT:</strong> ${invoiceData.vat}<br>`;
reply += `<strong>✅ รวมสุทธิ:</strong> <strong style="color: green;">${invoiceData.total}</strong>`;

return [{ reply: reply }];
```

### วิธีที่ 3: ใช้ Markdown (รองรับในอนาคต)

```javascript
let reply = `**📄 Invoice:** IV0303304\n`;
reply += `**👤 ลูกค้า:** 45-0096 การ์เดียนอินดัสทรีส์ คอร์ป\n`;
// ... ต่อ
return [{ reply: reply }];
```

## การตั้งค่าใน Respond to Webhook Node

### สำหรับ Plain Text:
```json
{
  "reply": "{{ $json.reply }}"
}
```

### สำหรับ HTML:
```json
{
  "reply": "{{ $json.reply }}"
}
```
(เหมือนกัน แต่ frontend จะ render HTML)

## ตัวอย่างการจัดรูปแบบ

### แบบ Plain Text (ใช้ \n):
```
📄 Invoice: IV0303304
👤 ลูกค้า: 45-0096 การ์เดียนอินดัสทรีส์ คอร์ป
🏢 หน่วยงาน: SBU70110 SBU ACG Team A (IR)
👨‍💼 เซลส์: 4802114 Mr. Sitti Ph.

📦 รายการ:
• 30000. HL2000K-2DA17-C22U AIR CHAIN HOIST MODEL HL2000K-2DA17-C22U
  จำนวน: 1.00 ชุด ราคา: 270,000 ยอด: 270,000
• 40000. MC-1002 INSTRUCTION MANUAL BOOK
  จำนวน: 1.00 เล่ม ราคา: 0 ยอด: 0

💰 รวมก่อน VAT: 270,000
💵 VAT: 288,900
✅ รวมสุทธิ: 558,900
```

### แบบ HTML (ใช้ <br> และ <strong>):
```html
<strong>📄 Invoice:</strong> IV0303304<br>
<strong>👤 ลูกค้า:</strong> 45-0096 การ์เดียนอินดัสทรีส์ คอร์ป<br>
...
```

## Emoji Icons ที่ใช้ได้

- 📄 Document/Invoice
- 👤 Person/Customer
- 🏢 Building/Department
- 👨‍💼 Salesperson
- 📦 Box/Items
- 💰 Money/Subtotal
- 💵 VAT
- ✅ Checkmark/Total

## Tips

1. **ใช้ \n สำหรับขึ้นบรรทัดใหม่** - Frontend จะแปลงเป็น <br> อัตโนมัติ
2. **ใช้ Emoji** - ทำให้ข้อความอ่านง่ายขึ้น
3. **จัดรูปแบบด้วย spacing** - ใช้ `  ` (2 spaces) สำหรับ indent
4. **ใช้ bullet points** - ใช้ `•` สำหรับรายการ
5. **แยกส่วนด้วย blank line** - ใช้ `\n\n` สำหรับเว้นบรรทัด

