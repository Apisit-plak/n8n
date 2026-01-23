// n8n Code Node - Formatter สำหรับ item_centers (สินค้า XXX ขายได้ศูนย์ไหนบ้าง)
// ใช้สำหรับจัดรูปแบบข้อมูลและสร้างข้อความตอบกลับ

const items = $input.all();

console.log('=== Item Centers Formatter ===');
console.log('Items count:', items.length);
console.log('Items:', JSON.stringify(items, null, 2));

// ========================================
// 1. ตรวจสอบว่ามีข้อมูลหรือไม่
// ========================================
if (!items || items.length === 0 || !items[0].json || Object.keys(items[0].json).length === 0) {
  console.log('❌ No data found');
  
  // คำแนะนำเมื่อไม่มีข้อมูล
  const noDataReply = 
    '❌ ไม่พบข้อมูลสินค้านี้\n\n' +
    '🔍 เป็นไปได้ว่า:\n' +
    '  • รหัสสินค้าไม่ถูกต้อง\n' +
    '  • ยังไม่มีการขายในช่วงเวลาที่ระบุ\n' +
    '  • ยังไม่มีข้อมูลในระบบ\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '💡 ลองคำถามอื่น:\n' +
    '  • "สินค้าขายดีที่สุด" - ดูสินค้าขายดีทั้งหมด\n' +
    '  • "ศูนย์ไหนยอดขายเยอะสุด" - ดูศูนย์ที่ขายดี\n' +
    '  • "MC-AP-1001 ขายได้ศูนย์ไหน" - ลองสินค้ารหัสอื่น';
  
  return [{ json: { reply: noDataReply } }];
}

// ========================================
// 2. ดึงข้อมูลสินค้า (ข้อมูลจากแถวแรก)
// ========================================
const firstItem = items[0].json;
const itemNo = firstItem.item_no || 'N/A';
const itemDescription = firstItem.item_description || 'ไม่มีคำอธิบาย';

console.log('Item No:', itemNo);
console.log('Item Description:', itemDescription);

// ========================================
// 3. สร้างข้อความตอบกลับ - ข้อมูลสินค้า
// ========================================
let reply = `🛍️ สินค้า: ${itemNo}\n`;
reply += `📝 ${itemDescription}\n\n`;
reply += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

// ========================================
// 4. แสดงรายการศูนย์/หน่วยงาน (เรียงตามยอดขายมากไปน้อย)
// ========================================
reply += `📍 ศูนย์/หน่วยงานที่ขายสินค้านี้:\n\n`;

items.forEach((item, index) => {
  const data = item.json;
  
  const department = data.department || 'N/A';
  const departmentName = data.department_name || 'ไม่ระบุ';
  const invoiceCount = data.invoice_count || 0;
  const totalQuantity = data.total_quantity || 0;
  const netAmount = data.net_amount || 0;
  const avgAmount = data.avg_amount || 0;
  const firstDate = data.first_invoice_date || 'N/A';
  const lastDate = data.last_invoice_date || 'N/A';
  
  // จัดรูปแบบตัวเลข
  const formattedNetAmount = parseFloat(netAmount).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  const formattedAvgAmount = parseFloat(avgAmount).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  const formattedQuantity = parseFloat(totalQuantity).toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  // แสดงข้อมูลแต่ละศูนย์
  reply += `${index + 1}. **${departmentName}** (${department})\n`;
  reply += `   💰 ยอดรวม: ${formattedNetAmount} บาท\n`;
  reply += `   📦 จำนวน: ${formattedQuantity} ชิ้น\n`;
  reply += `   📄 Invoice: ${invoiceCount} ใบ\n`;
  reply += `   📊 เฉลี่ย: ${formattedAvgAmount} บาท/ใบ\n`;
  reply += `   📅 ช่วงเวลา: ${firstDate} ถึง ${lastDate}\n\n`;
});

// ========================================
// 5. สรุปยอดรวมทั้งหมด
// ========================================
const totalCenters = items.length;
const grandTotalQuantity = items.reduce((sum, item) => sum + (parseFloat(item.json.total_quantity) || 0), 0);
const grandTotalAmount = items.reduce((sum, item) => sum + (parseFloat(item.json.net_amount) || 0), 0);
const grandTotalInvoices = items.reduce((sum, item) => sum + (parseInt(item.json.invoice_count) || 0), 0);

const formattedGrandTotal = parseFloat(grandTotalAmount).toLocaleString('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formattedGrandQuantity = parseFloat(grandTotalQuantity).toLocaleString('th-TH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

reply += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
reply += `📊 สรุปรวม:\n`;
reply += `   🏢 จำนวนศูนย์: ${totalCenters} ศูนย์\n`;
reply += `   💰 ยอดรวมทั้งหมด: ${formattedGrandTotal} บาท\n`;
reply += `   📦 จำนวนรวม: ${formattedGrandQuantity} ชิ้น\n`;
reply += `   📄 Invoice รวม: ${grandTotalInvoices} ใบ\n\n`;

// ========================================
// 6. แสดงตัวอย่าง Invoice (จากศูนย์ที่ขายเยอะสุด - แถวแรก)
// ========================================
if (firstItem.sample_invoices) {
  const sampleInvoices = firstItem.sample_invoices.split(', ').slice(0, 3);
  if (sampleInvoices.length > 0) {
    reply += `📋 ตัวอย่าง Invoice (จาก ${firstItem.department_name}):\n`;
    sampleInvoices.forEach(inv => {
      reply += `   • ${inv}\n`;
    });
    reply += `\n`;
  }
}

// ========================================
// 7. Contextual Suggestions
// ========================================
reply += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
reply += `💡 ต้องการข้อมูลเพิ่มเติม?\n`;
reply += `  • "สินค้าขายดีที่สุด 6 เดือน" - ดูสินค้าขายดีทั้งหมด\n`;
reply += `  • "ศูนย์ไหนยอดขายเยอะสุด" - ดูศูนย์ที่ขายดีที่สุด\n`;
reply += `  • "TOP 10 สินค้า 3 เดือน" - ดู TOP สินค้า\n`;
reply += `  • "${itemNo} ขายได้ศูนย์ไหน 6 เดือน" - ดูข้อมูลช่วง 6 เดือน`;

// ========================================
// 8. Return formatted response
// ========================================
console.log('✅ Formatted reply successfully');
return [{ json: { reply: reply } }];
