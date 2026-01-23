// n8n Code Node - Invoice Detail Formatter with Contextual Suggestions
// ใช้หลัง Execute SQL Query node สำหรับ invoice_detail action
// วางโค้ดทั้งหมดนี้ใน Code In JavaScript node

// ตรวจสอบว่ามีข้อมูลหรือไม่
const items = $input.all();

// ============================================
// กรณีที่ 1: ไม่มีข้อมูลเลย
// ============================================
if (!items || items.length === 0) {
  return {
    json: {
      reply: "ขออภัยครับ ไม่พบ Invoice นี้ 😔\n\n" +
             "🔍 สาเหตุที่เป็นไปได้:\n" +
             "  • เลข Invoice ไม่ถูกต้อง\n" +
             "  • Invoice นี้ไม่มีในระบบ\n\n" +
             "💡 ลองคำถามอื่น:\n" +
             "  • \"IV0303304\" - ลอง invoice อื่น\n" +
             "  • \"การ์เดียนอินดัสทรีส์ invoice\" - ดู invoice ของลูกค้า\n" +
             "  • \"สินค้าขายดีที่สุด 6 เดือน\" - ดูสินค้าขายดี\n" +
             "  • \"ศูนย์ไหนยอดขายเยอะสุด\" - ดูศูนย์ที่ขายดี"
    }
  };
}

// ============================================
// กรณีที่ 2: มีข้อมูลแต่เป็น object ว่าง
// ============================================
const firstItem = items[0].json;
if (!firstItem || Object.keys(firstItem).length === 0) {
  return {
    json: {
      reply: "ขออภัยครับ ไม่พบข้อมูล Invoice นี้ 😔\n\n" +
             "💡 ลองคำถามอื่น:\n" +
             "  • \"IV0303304\" - ลอง invoice อื่น\n" +
             "  • \"การ์เดียนอินดัสทรีส์ invoice\" - ดู invoice ของลูกค้า\n" +
             "  • \"สินค้าขายดีที่สุด 6 เดือน\"\n" +
             "  • \"ศูนย์ไหนยอดขายเยอะสุด\""
    }
  };
}

// ============================================
// กรณีที่ 3: มีข้อมูล - Format response
// ============================================
const invoice = items[0].json;
const lines = items; // รายการสินค้าทั้งหมด

let reply = `📄 รายละเอียด Invoice: ${invoice.inv_no || 'N/A'}\n\n`;

// ข้อมูลลูกค้า
reply += `👤 ลูกค้า: ${invoice.customer_name || 'N/A'}`;
if (invoice.customer_no) {
  reply += ` (${invoice.customer_no})`;
}
reply += '\n';

// ข้อมูลศูนย์/หน่วยงาน
if (invoice.department_name || invoice.department) {
  reply += `🏢 ศูนย์: ${invoice.department_name || 'N/A'}`;
  if (invoice.department) {
    reply += ` (${invoice.department})`;
  }
  reply += '\n';
}

// วันที่
const invDate = invoice.inv_date || invoice.inv_posting_date || 'N/A';
reply += `📅 วันที่: ${invDate}\n`;

// ยอดรวม
const totalAmount = parseFloat(invoice.total_amount || 0);
const totalVat = parseFloat(invoice.total_vat || invoice.total_amount_vat || 0);
const netAmount = totalAmount + totalVat;

reply += `💰 ยอดรวม: ${totalAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท\n`;
if (totalVat > 0) {
  reply += `💵 VAT: ${totalVat.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท\n`;
  reply += `💎 รวมสุทธิ: ${netAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท\n`;
}

// รายการสินค้า
reply += `\n📦 รายการสินค้า (${lines.length} รายการ):\n`;

lines.forEach((item, index) => {
  const line = item.json;
  const itemNo = line.item_no || line.inv_line_item_no || 'N/A';
  const itemDesc = line.item_description || line.inv_line_description || 'N/A';
  const quantity = parseFloat(line.quantity || line.inv_line_quantity || 0);
  const unitPrice = parseFloat(line.unit_price || line.inv_unit_price || 0);
  const lineAmount = parseFloat(line.line_amount || line.inv_line_amount || 0);
  
  reply += `${index + 1}. ${itemNo} - ${itemDesc}\n`;
  reply += `   จำนวน ${quantity} x ${unitPrice.toLocaleString('th-TH', {minimumFractionDigits: 2})} = ${lineAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท\n`;
});

reply += '\n━━━━━━━━━━━━━━━━━━━━━━━━\n';
reply += '💡 ต้องการดูข้อมูลเพิ่มเติม?\n';

// Contextual suggestions
if (invoice.customer_name) {
  reply += `• "${invoice.customer_name} มี invoice อะไรบ้าง" - ดู invoice อื่นๆ\n`;
}

// ถ้ามีสินค้า แนะนำให้ดูสินค้านั้น
if (lines.length > 0 && lines[0].json.item_no) {
  const firstItemNo = lines[0].json.item_no || lines[0].json.inv_line_item_no;
  reply += `• "สินค้า ${firstItemNo} ขายดีที่สุดไหม" - ดูสินค้านี้\n`;
}

// ถ้ามีศูนย์ แนะนำให้ดูศูนย์นั้น
if (invoice.department_name) {
  reply += `• "${invoice.department_name} ยอดขายเท่าไหร่" - ดูยอดขายศูนย์\n`;
}

reply += '• "สินค้าขายดีที่สุด 6 เดือน" - ดูสินค้าขายดี\n';
reply += '• "ศูนย์ไหนยอดขายเยอะสุด" - ดูศูนย์ที่ขายดี';

return { json: { reply: reply } };
