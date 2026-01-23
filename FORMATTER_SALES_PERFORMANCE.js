//n8n Code Node - Sales Performance Formatter with Contextual Suggestions
// ใช้หลัง Execute SQL Query node สำหรับ sales_performance action
// วางโค้ดทั้งหมดนี้ใน Code In JavaScript node

const items = $input.all();

console.log('=== Sales Performance Formatter ===');
console.log('Items count:', items.length);

// ========================================
// 1. ตรวจสอบว่ามีข้อมูลหรือไม่
// ========================================
if (!items || items.length === 0 || !items[0].json || Object.keys(items[0].json).length === 0) {
  console.log('❌ No data found');
  
  const noDataReply =
    '❌ ไม่พบข้อมูลเซลส์\n\n' +
    '🔍 เป็นไปได้ว่า:\n' +
    '  • ชื่อเซลส์ไม่ถูกต้อง\n' +
    '  • ยังไม่มีข้อมูลในช่วงเวลาที่ระบุ\n' +
    '  • ยังไม่มีข้อมูลในระบบ\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '💡 ลองคำถามอื่น:\n' +
    '  • "TOP 10 เซลส์ยอดเยอะสุด" - ดูเซลส์ทั้งหมด\n' +
    '  • "TOP 5 เซลส์ปีนี้" - ดูเซลส์ในปีนี้\n' +
    '  • "สินค้าขายดีที่สุด" - ดูสินค้าขายดี\n' +
    '  • "ศูนย์ไหนยอดขายเยอะสุด" - ดูศูนย์ที่ขายดี';
  
  return [{ json: { reply: noDataReply } }];
}

// ========================================
// 2. สร้างข้อความตอบกลับ
// ========================================
const salesData = items.map(item => item.json);
const topSales = salesData[0]; // เซลส์อันดับ 1

// คำนวณยอดรวมทั้งหมด
const grandTotalAmount = salesData.reduce((sum, s) => sum + (parseFloat(s.net_amount) || 0), 0);

let reply = `👥 ยอดขายของเซลส์\n\n`;

salesData.forEach((sales, index) => {
  const salesName = sales.sales_person_name || 'ไม่ระบุชื่อ';
  const salesCode = sales.sales_person_code || 'N/A';
  const netAmount = parseFloat(sales.net_amount) || 0;
  const invoiceCount = parseInt(sales.invoice_count) || 0;
  const customerCount = parseInt(sales.customer_count) || 0;
  const productCount = parseInt(sales.product_count) || 0;
  const avgAmount = parseFloat(sales.avg_invoice_amount) || 0;
  const firstDate = sales.first_invoice_date || 'N/A';
  const lastDate = sales.last_invoice_date || 'N/A';
  
  // คำนวณ % ของยอดรวม
  const percentage = grandTotalAmount > 0 ? (netAmount / grandTotalAmount * 100).toFixed(1) : 0;
  
  // จัดรูปแบบตัวเลข
  const formattedNetAmount = netAmount.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  const formattedAvgAmount = avgAmount.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  reply += `${index + 1}. **${salesName}** (${salesCode})\n`;
  reply += `   💰 ยอดรวม: ${formattedNetAmount} บาท (${percentage}%)\n`;
  reply += `   📄 Invoice: ${invoiceCount} ใบ`;
  
  if (customerCount > 0) {
    reply += ` | 👥 ลูกค้า: ${customerCount} ราย`;
  }
  reply += `\n`;
  
  if (productCount > 0) {
    reply += `   📦 สินค้า: ${productCount} รายการ`;
  }
  
  if (avgAmount > 0) {
    reply += ` | 📊 เฉลี่ย: ${formattedAvgAmount} บาท/ใบ`;
  }
  
  if (productCount > 0 || avgAmount > 0) {
    reply += `\n`;
  }
  
  if (firstDate !== 'N/A' && lastDate !== 'N/A') {
    reply += `   📅 ช่วงเวลา: ${firstDate} ถึง ${lastDate}\n`;
  }
  
  // แสดงตัวอย่างลูกค้า (เฉพาะอันดับ 1-3)
  if (index < 3 && sales.top_customers) {
    const customers = sales.top_customers.split(', ').slice(0, 3);
    if (customers.length > 0) {
      reply += `   👥 ตัวอย่างลูกค้า: ${customers.join(', ')}\n`;
    }
  }
  
  reply += '\n';
});

// ========================================
// 3. สรุปรวม
// ========================================
const totalSalesPeople = salesData.length;
const grandTotalInvoices = salesData.reduce((sum, s) => sum + (parseInt(s.invoice_count) || 0), 0);
const grandTotalCustomers = salesData.reduce((sum, s) => sum + (parseInt(s.customer_count) || 0), 0);

const formattedGrandTotal = grandTotalAmount.toLocaleString('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

reply += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
reply += `📊 สรุปรวม:\n`;
reply += `   👥 จำนวนเซลส์: ${totalSalesPeople} คน\n`;
reply += `   💰 ยอดรวมทั้งหมด: ${formattedGrandTotal} บาท\n`;
reply += `   📄 Invoice รวม: ${grandTotalInvoices} ใบ\n`;
if (grandTotalCustomers > 0) {
  reply += `   👥 ลูกค้ารวม: ${grandTotalCustomers} ราย\n`;
}
reply += `\n`;

// ========================================
// 4. Contextual Suggestions
// ========================================
reply += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
reply += `💡 ต้องการวิเคราะห์เพิ่มเติม?\n`;

if (topSales && topSales.sales_person_name) {
  reply += `  • "เซลส์ ${topSales.sales_person_name} ขายสินค้าอะไรบ้าง" - ดูสินค้า\n`;
  reply += `  • "เซลส์ ${topSales.sales_person_name} ดูแลลูกค้าใครบ้าง" - ดูลูกค้า\n`;
}

reply += `  • "TOP 10 สินค้าขายดีที่สุด" - ดูสินค้าขายดี\n`;
reply += `  • "ศูนย์ไหนยอดขายเยอะสุด" - ดูศูนย์ที่ขายดี\n`;
reply += `  • "ยอด invoice แต่ละเดือน" - ดูแนวโน้มรายเดือน`;

// ========================================
// 5. Return formatted response
// ========================================
console.log('✅ Formatted reply successfully');
return [{ json: { reply: reply } }];
