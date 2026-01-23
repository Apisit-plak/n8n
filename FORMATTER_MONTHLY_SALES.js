// n8n Code Node - Monthly Sales Formatter with Contextual Suggestions
// ใช้หลัง Execute SQL Query node สำหรับ monthly_sales action
// วางโค้ดทั้งหมดนี้ใน Code In JavaScript node

// ตรวจสอบว่ามีข้อมูลหรือไม่
const items = $input.all();

// ============================================
// กรณีที่ 1: ไม่มีข้อมูลเลย
// ============================================
if (!items || items.length === 0) {
  return {
    json: {
      reply: "ขออภัยครับ ไม่พบข้อมูลในช่วงเวลาที่ระบุ 😔\n\n" +
             "💡 ลองคำถามอื่น:\n" +
             "  • \"ยอด invoice แต่ละเดือน 12 เดือน\"\n" +
             "  • \"ยอดขายรายเดือนปีที่แล้ว\"\n" +
             "  • \"สินค้าขายดีที่สุด 6 เดือน\"\n" +
             "  • \"ศูนย์ไหนยอดขายเยอะสุด\""
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
      reply: "ขออภัยครับ ไม่พบข้อมูลรายเดือน 😔\n\n" +
             "💡 ลองเปลี่ยนเป็น:\n" +
             "  • \"ยอด invoice แต่ละเดือน 12 เดือน\"\n" +
             "  • \"ยอดขายรายเดือนปีที่แล้ว\"\n" +
             "  • \"สินค้าขายดีที่สุด 6 เดือน\"\n" +
             "  • \"ศูนย์ไหนยอดขายเยอะสุดปีที่แล้ว\""
    }
  };
}

// ============================================
// กรณีที่ 3: มีข้อมูล - Format response
// ============================================
const months = items.map(item => item.json);

// หาเดือนที่ยอดสูงสุดและต่ำสุด
const maxMonth = months.reduce((max, m) => {
  const maxAmount = parseFloat(max.total_amount || 0);
  const mAmount = parseFloat(m.total_amount || 0);
  return mAmount > maxAmount ? m : max;
}, months[0]);

const minMonth = months.reduce((min, m) => {
  const minAmount = parseFloat(min.total_amount || 0);
  const mAmount = parseFloat(m.total_amount || 0);
  return mAmount < minAmount ? m : min;
}, months[0]);

let reply = `📈 ยอด Invoice รายเดือน - ${months.length} เดือนย้อนหลัง\n\n`;

// แสดงข้อมูลแต่ละเดือน
months.forEach((month) => {
  const isMax = (month.year_month === maxMonth.year_month) || 
                (month.year === maxMonth.year && month.month === maxMonth.month);
  const maxMark = isMax ? ' ⭐ สูงสุด' : '';
  
  const monthLabel = month.year_month || `${month.year}-${String(month.month).padStart(2, '0')}`;
  const amount = parseFloat(month.total_amount || 0);
  const count = month.invoice_count || 0;
  
  reply += `${monthLabel}: 💰 ${amount.toLocaleString('th-TH', {minimumFractionDigits: 0})} บาท `;
  reply += `(${count} Invoice)${maxMark}\n`;
});

// คำนวณสรุป
const totalAmount = months.reduce((sum, m) => sum + parseFloat(m.total_amount || 0), 0);
const avgAmount = totalAmount / months.length;

reply += '\n📊 สรุป:\n';

const maxMonthLabel = maxMonth.year_month || `${maxMonth.year}-${String(maxMonth.month).padStart(2, '0')}`;
const minMonthLabel = minMonth.year_month || `${minMonth.year}-${String(minMonth.month).padStart(2, '0')}`;

reply += `• เดือนที่ยอดสูงสุด: ${maxMonthLabel} (${parseFloat(maxMonth.total_amount).toLocaleString('th-TH', {minimumFractionDigits: 0})} บาท)\n`;
reply += `• เดือนที่ยอดต่ำสุด: ${minMonthLabel} (${parseFloat(minMonth.total_amount).toLocaleString('th-TH', {minimumFractionDigits: 0})} บาท)\n`;
reply += `• ยอดเฉลี่ยต่อเดือน: ${avgAmount.toLocaleString('th-TH', {minimumFractionDigits: 0})} บาท\n`;

reply += '\n━━━━━━━━━━━━━━━━━━━━━━━━\n';
reply += '💡 ต้องการวิเคราะห์เพิ่มเติม?\n';

// Contextual suggestions ตามเดือนที่ยอดสูงสุด
const maxMonthShort = maxMonthLabel.replace('-', ' ');
reply += `• "เดือน ${maxMonthShort} ขายอะไรบ้าง" - ดูสินค้าขายดี\n`;
reply += `• "ศูนย์ไหนยอดขายเยอะสุดเดือน ${maxMonthShort}" - ดูศูนย์\n`;
reply += '• "product แยกตามกลุ่ม 1 ปี" - ดูตามหมวดหมู่\n';
reply += '• "สินค้าขายดีที่สุด 6 เดือน" - ดูสินค้าขายดี\n';
reply += '• "เปรียบเทียบยอดขายปีนี้กับปีที่แล้ว" - เปรียบเทียบปี';

return { json: { reply: reply } };
