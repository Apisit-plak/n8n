// n8n Code Node - Message Parser
// ใช้สำหรับแยกประเภทคำถามและ extract ข้อมูลที่จำเป็น

// ข้อมูลมาจาก Webhook node ซึ่งมี structure: { body: { text: "...", session_id: "..." } }
// สำหรับ "Run Once for Each Item" mode ใช้ $json.body โดยตรง
const body = $json.body || {};
const rawText = body.text ?? '';
const sessionId = body.session_id ?? 'u_001';

// Normalize text: trim whitespace และแปลงเป็น uppercase
const text = String(rawText).trim().toUpperCase();

// Debug: ตรวจสอบค่า text
console.log('Raw text:', rawText);
console.log('Normalized text:', text);
console.log('Session ID:', sessionId);

// Helper function: extract number from text
function extractNumber(text) {
  const match = text.match(/[\d,]+/);
  return match ? match[0].replace(/,/g, '') : null;
}

// Helper function: extract date/time period
function extractTimePeriod(text) {
  // ตรวจสอบรูปแบบตัวเลข + หน่วยเวลา เช่น "6 เดือน", "1 ปี", "2 เดือน", "3 เดือน"
  // รองรับทั้งภาษาไทยและอังกฤษ
  const periodPatterns = [
    // รูปแบบ: ตัวเลข + เดือน (เช่น "6 เดือน", "3 เดือน", "2 เดือน")
    { pattern: /(\d+)\s*(เดือน|MONTH|MONTHS)/i, type: 'month', unit: 'month' },
    // รูปแบบ: ตัวเลข + ปี (เช่น "1 ปี", "2 ปี", "3 ปี")
    { pattern: /(\d+)\s*(ปี|YEAR|YEARS)/i, type: 'year', unit: 'year' },
    // รูปแบบ: ตัวเลข + สัปดาห์ (เช่น "2 สัปดาห์", "4 สัปดาห์")
    { pattern: /(\d+)\s*(สัปดาห์|WEEK|WEEKS)/i, type: 'week', unit: 'week' },
    // รูปแบบ: ตัวเลข + วัน (เช่น "7 วัน", "30 วัน")
    { pattern: /(\d+)\s*(วัน|DAY|DAYS)/i, type: 'day', unit: 'day' }
  ];
  
  // ตรวจสอบรูปแบบตัวเลข + หน่วยเวลา
  for (const { pattern, type, unit } of periodPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1]);
      return {
        period: type,
        value: value,
        unit: unit
      };
    }
  }
  
  // ตรวจสอบรูปแบบคำเฉพาะ (ไม่มีตัวเลข)
  const periods = {
    'ปีนี้': 'this_year',
    'ปีที่แล้ว': 'last_year',
    'เดือนนี้': 'this_month',
    'เดือนที่แล้ว': 'last_month',
    'สัปดาห์นี้': 'this_week',
    'วันนี้': 'today',
    'เมื่อวาน': 'yesterday'
  };
  
  for (const [key, value] of Object.entries(periods)) {
    if (text.includes(key.toUpperCase())) {
      return { period: value };
    }
  }
  
  // ตรวจสอบรูปแบบวันที่ เช่น "2024-01-01", "01/2024"
  const dateMatch = text.match(/(\d{4})[-\/](\d{1,2})/);
  if (dateMatch) {
    return {
      period: 'date',
      year: parseInt(dateMatch[1]),
      month: parseInt(dateMatch[2])
    };
  }
  
  return null;
}

// Helper function: extract customer name
function extractCustomerName(text, keywords) {
  let customerName = text;
  keywords.forEach(k => {
    customerName = customerName.replace(new RegExp(k, 'ig'), '');
  });
  // ลบคำที่เกี่ยวข้องกับ invoice, query ออก
  const removeWords = [
    'INVOICE', 'INVOICES', 'INV', 'BILL', 'BILLS', 'RECEIPT',
    'ของ', 'มี', 'อะไร', 'บ้าง', 'รายการ', 'ยอด', 'ขาย',
    'ลูกค้า', 'CUSTOMER', 'CLIENT', 'FROM', 'ของ',
    'อยากรู้', 'ต้องการ', 'ขอ', 'ช่วย', 'แสดง', 'SHOW', 'LIST', 'ดู',
    'WHAT', 'WHICH', 'มีอะไร', 'มีบ้าง', 'มีอะไรบ้าง'
  ];
  removeWords.forEach(w => {
    customerName = customerName.replace(new RegExp(w, 'ig'), '');
  });
  return customerName.trim();
}

// ============================================
// 1. ตรวจสอบ Invoice Number (IV0303304)
// ============================================
// Debug: ตรวจสอบค่า text
console.log('Input text:', text);
console.log('Text length:', text.length);

// ตรวจสอบ Invoice Number pattern (IV + 7 หลัก)
// ใช้ pattern ที่ยืดหยุ่นกว่า: IV ตามด้วยตัวเลข 7 หลัก
const invoiceMatch = text.match(/IV\d{7}/);
console.log('Invoice match:', invoiceMatch);

if (invoiceMatch) {
  const invoiceNo = invoiceMatch[0].trim();
  console.log('Matched invoice_no:', invoiceNo);
  
  return {
    action: 'invoice_detail',
    invoice_no: invoiceNo,
    text: text,
    session_id: sessionId
  };
}

// ============================================
// 2. ลูกค้า 1 ราย มี invoice อะไรบ้าง
// ============================================
console.log('=== Customer Invoices Check ===');
// รองรับ keyword ที่หลากหลาย
const customerInvoiceKeywords = [
  'INVOICE', 'INVOICES', 'อินวอย', 'ใบแจ้งหนี้', 'บิล', 'BILL', 'BILLS',
  'ใบกำกับ', 'ใบเสร็จ', 'RECEIPT', 'INV'
];
const customerNameKeywords = [
  'ลูกค้า', 'ของ', 'มี', 'CUSTOMER', 'CLIENT', 'ของ', 'FROM',
  'อยากรู้', 'ต้องการ', 'ขอ', 'ช่วย', 'แสดง', 'SHOW', 'LIST', 'ดู'
];
const questionKeywords = [
  'อะไร', 'บ้าง', 'WHAT', 'WHICH', 'LIST', 'SHOW', 'ดู', 'แสดง',
  'มีอะไร', 'มีบ้าง', 'มีอะไรบ้าง'
];

// ตรวจสอบว่ามี invoice keyword หรือไม่
const hasInvoiceKeyword = customerInvoiceKeywords.some(k => text.includes(k));
console.log('Has invoice keyword:', hasInvoiceKeyword);

// ตรวจสอบว่ามีตัวอักษรไทยหรือไม่ (ชื่อลูกค้า)
const hasThaiChars = text.match(/[ก-๙]+/);
console.log('Has Thai chars:', hasThaiChars);

// ตรวจสอบว่ามี customer name keywords หรือไม่
const hasCustomerNameKeyword = customerNameKeywords.some(k => text.includes(k));
console.log('Has customer name keyword:', hasCustomerNameKeyword);

// ตรวจสอบว่ามี question keywords หรือไม่
const hasQuestionKeyword = questionKeywords.some(k => text.includes(k));

const isCustomerInvoiceQuery = hasInvoiceKeyword && 
                               (hasCustomerNameKeyword || hasThaiChars || hasQuestionKeyword);
console.log('Is customer invoice query:', isCustomerInvoiceQuery);

if (isCustomerInvoiceQuery) {
  const customerName = extractCustomerName(text, customerInvoiceKeywords);
  console.log('Extracted customer name:', customerName);
  console.log('Customer name length:', customerName ? customerName.length : 0);
  
  if (!customerName || customerName.length < 2) {
    console.log('❌ Missing customer name');
    return {
      action: 'missing_name',
      reply: 'กรุณาพิมพ์ชื่อลูกค้าตามด้วยคำว่า invoice เช่น:\n' +
             '- "การ์เดียนอินดัสทรีส์ invoice"\n' +
             '- "invoice การ์เดียนอินดัสทรีส์"\n' +
             '- "ดู invoice ของ การ์เดียนอินดัสทรีส์"\n' +
             '- "การ์เดียนอินดัสทรีส์ มี invoice อะไรบ้าง"',
      text: rawText,
      session_id: sessionId
    };
  }

  console.log('✅ Customer invoices query');
  return {
    action: 'customer_invoices',
    customer_name: customerName,
    text: rawText,
    session_id: sessionId
  };
}

// ============================================
// 3. รายการที่อยู่ใน Invoice รายการไหนทำยอดเยอะที่สุด + ระยะเวลา
// ============================================
// รองรับ keyword ที่หลากหลาย - คิดให้ครอบคลุมทุกกรณี

// Keywords สำหรับสินค้า/รายการ
const itemKeywords = [
  'รายการ', 'สินค้า', 'PRODUCT', 'PRODUCTS', 'ITEM', 'ITEMS', 'ของ',
  'GOODS', 'MERCHANDISE', 'SKU', 'SKUS', 'ชิ้น', 'ตัว', 'อย่าง', 'ชนิด'
];

// Keywords สำหรับการแสดงความต้องการ/คำขอ
const requestKeywords = [
  'อยากได้', 'อยากรู้', 'ต้องการ', 'ขอ', 'ช่วย', 'แสดง', 'SHOW', 'LIST', 'ดู',
  'WANT', 'NEED', 'GET', 'SHOW ME', 'I WANT', 'I NEED'
];

// Keywords สำหรับการถาม (คำถามธรรมชาติ) - Top Items
const topItemQuestionKeywords = [
  'อะไร', 'ไหน', 'WHAT', 'WHICH', 'WHO', 'ไหน', 'อะไรบ้าง',
  'อะไรที่', 'ไหนที่', 'WHAT IS', 'WHAT ARE', 'WHICH ONE'
];

// Keywords สำหรับยอดเยอะ/ขายดี (Indicators)
const topIndicators = [
  // ภาษาไทย
  'เยอะ', 'เยอะสุด', 'มาก', 'มากสุด', 'สูง', 'สูงสุด', 'ดี', 'ดีสุด', 'ดีที่สุด',
  'ขายดี', 'ขายเยอะ', 'ขายมาก', 'ขายสูง', 'ขายดีที่สุด', 'ขายเยอะสุด',
  'ยอดเยอะ', 'ยอดมาก', 'ยอดสูง', 'ยอดเยอะสุด', 'ยอดมากสุด', 'ยอดสูงสุด',
  'ยอดขาย', 'ยอดขายเยอะ', 'ยอดขายมาก', 'ยอดขายสูง', 'ยอดขายเยอะสุด',
  'อันดับ', 'ลำดับ', 'ที่', 'ที่สุด', 'สุด',
  // ภาษาอังกฤษ
  'TOP', 'BEST', 'SELLING', 'HIGHEST', 'MOST', 'GREATEST', 'LARGEST',
  'BEST SELLING', 'TOP SELLING', 'BEST SELLER', 'BEST SELLERS',
  'HIGHEST SALES', 'MOST SALES', 'GREATEST SALES', 'LARGEST SALES',
  'RANK', 'RANKING', 'RANKED', 'ORDER', 'ORDERED'
];

// Keywords สำหรับการถามแบบธรรมชาติ (ไม่ระบุจำนวน)
const naturalQuestionPatterns = [
  /อะไร.*(ขายดี|ขายเยอะ|ยอดเยอะ|ยอดมาก|ยอดสูง|ขายดีที่สุด|ขายเยอะสุด|ยอดเยอะสุด|ยอดมากสุด|ยอดสูงสุด)/i,
  /(สินค้า|รายการ|PRODUCT|ITEM).*(อะไร|ไหน).*(ขายดี|ขายเยอะ|ยอดเยอะ|ยอดมาก|ยอดสูง|ขายดีที่สุด|ขายเยอะสุด|ยอดเยอะสุด|ยอดมากสุด|ยอดสูงสุด)/i,
  /(สินค้า|รายการ|PRODUCT|ITEM).*(ที่|THAT).*(ขายดี|ขายเยอะ|ยอดเยอะ|ยอดมาก|ยอดสูง|ขายดีที่สุด|ขายเยอะสุด|ยอดเยอะสุด|ยอดมากสุด|ยอดสูงสุด)/i,
  /(อะไร|WHAT).*(ที่|THAT).*(ขายดี|ขายเยอะ|ยอดเยอะ|ยอดมาก|ยอดสูง|ขายดีที่สุด|ขายเยอะสุด|ยอดเยอะสุด|ยอดมากสุด|ยอดสูงสุด)/i,
  /(สินค้า|รายการ|PRODUCT|ITEM).*(ไหน|WHICH).*(ขายดี|ขายเยอะ|ยอดเยอะ|ยอดมาก|ยอดสูง|ขายดีที่สุด|ขายเยอะสุด|ยอดเยอะสุด|ยอดมากสุด|ยอดสูงสุด)/i
];

// ตรวจสอบว่ามี keyword ที่เกี่ยวข้องกับ top items
const hasItemKeyword = itemKeywords.some(k => text.includes(k));
const hasTopIndicator = topIndicators.some(k => text.includes(k));
const hasTopItemQuestionKeyword = topItemQuestionKeywords.some(k => text.includes(k));
const hasRequestKeyword = requestKeywords.some(k => text.includes(k));
const hasNaturalQuestion = naturalQuestionPatterns.some(pattern => pattern.test(text));

// ตรวจสอบว่าเป็น top items query
// รองรับหลายกรณี:
// 1. มี item keyword + top indicator (เช่น "สินค้าขายดีที่สุด")
// 2. มี natural question pattern (เช่น "อะไรขายดีที่สุด")
// 3. มี question keyword + top indicator (เช่น "อะไรยอดเยอะสุด")
// 4. มี request keyword + item keyword + top indicator (เช่น "อยากได้ รายการสินค้าที่ ขายดี")
const isTopItemQuery = (hasItemKeyword && hasTopIndicator) || 
                       hasNaturalQuestion || 
                       (hasTopItemQuestionKeyword && hasTopIndicator) ||
                       (hasRequestKeyword && hasItemKeyword && hasTopIndicator);

if (isTopItemQuery) {
  const timePeriod = extractTimePeriod(text);
  
  // Extract limit จากคำถาม - รองรับหลายรูปแบบ
  let limit = 10; // default
  
  // รูปแบบ 1: "TOP 10", "TOP10", "top 10", "TOP-10"
  const topMatch = text.match(/TOP\s*-?\s*(\d+)/i);
  if (topMatch) {
    limit = parseInt(topMatch[1]);
  } else {
    // รูปแบบ 2: "10 รายการ", "10 สินค้า", "10 ITEM", "10 PRODUCTS"
    const numberMatch = text.match(/(\d+)\s*(รายการ|สินค้า|ITEM|ITEMS|PRODUCT|PRODUCTS|ชิ้น|ตัว|อย่าง|อันดับ|ลำดับ)/i);
    if (numberMatch) {
      limit = parseInt(numberMatch[1]);
    } else {
      // รูปแบบ 3: "รายการ 10", "สินค้า 10", "ITEM 10"
      const reverseMatch = text.match(/(รายการ|สินค้า|ITEM|ITEMS|PRODUCT|PRODUCTS)\s*(\d+)/i);
      if (reverseMatch) {
        limit = parseInt(reverseMatch[2]);
      } else {
        // รูปแบบ 4: "10 อันดับ", "10 ลำดับ", "10 RANK", "10 RANKING"
        const rankMatch = text.match(/(\d+)\s*(อันดับ|ลำดับ|RANK|RANKING|ORDER)/i);
        if (rankMatch) {
          limit = parseInt(rankMatch[1]);
        } else {
          // รูปแบบ 5: "อันดับ 10", "ลำดับ 10", "RANK 10"
          const rankReverseMatch = text.match(/(อันดับ|ลำดับ|RANK|RANKING|ORDER)\s*(\d+)/i);
          if (rankReverseMatch) {
            limit = parseInt(rankReverseMatch[2]);
          } else {
            // รูปแบบ 6: "10 ตัว", "10 ชิ้น", "10 อย่าง"
            const unitMatch = text.match(/(\d+)\s*(ตัว|ชิ้น|อย่าง|ชนิด)/i);
            if (unitMatch) {
              limit = parseInt(unitMatch[1]);
            } else {
              // รูปแบบ 7: "BEST 10", "BEST 10 ITEMS", "10 BEST"
              const bestMatch = text.match(/BEST\s*(\d+)/i) || text.match(/(\d+)\s*BEST/i);
              if (bestMatch) {
                limit = parseInt(bestMatch[1] || bestMatch[2]);
              }
            }
          }
        }
      }
    }
  }
  
  // ถ้าไม่เจอ limit และเป็นคำถามแบบธรรมชาติ (ไม่ระบุจำนวน) ให้ใช้ default 10
  // แต่ถ้ามีคำว่า "ทั้งหมด", "ALL", "ทุก", "EVERY" ให้ใช้ limit สูงๆ
  if (text.includes('ทั้งหมด') || text.includes('ALL') || text.includes('ทุก') || text.includes('EVERY')) {
    limit = 100; // หรือไม่จำกัด
  }
  
  return {
    action: 'top_items',
    time_period: timePeriod,
    limit: limit,
    text: rawText,
    session_id: sessionId
  };
}

// ============================================
// 4. ศูนย์ หรือ หน่วยงานไหน ยอดขายเยอะสุด
// ============================================
// รองรับ keyword ที่หลากหลาย
const centerKeywords = [
  'ศูนย์', 'หน่วยงาน', 'SBU', 'CENTER', 'CENTERS', 'BRANCH', 'BRANCHES', 'สาขา',
  'DEPARTMENT', 'DEPT', 'หน่วย', 'แผนก', 'DIVISION', 'SECTION'
];
const salesKeywords = [
  'ยอดขาย', 'SALES', 'ยอด', 'ขาย', 'REVENUE', 'INCOME', 'AMOUNT',
  'ยอดรวม', 'TOTAL', 'SUM'
];
const topCenterIndicators = [
  'เยอะ', 'มาก', 'สูง', 'TOP', 'BEST', 'อันดับ', 'RANK', 'RANKING', 'ลำดับ'
];

const hasCenterKeyword = centerKeywords.some(k => text.includes(k));
const hasSalesKeyword = salesKeywords.some(k => text.includes(k));
const hasTopCenterIndicator = topCenterIndicators.some(k => text.includes(k));

const isTopCenterQuery = hasCenterKeyword && 
                         (hasSalesKeyword || hasTopCenterIndicator);

if (isTopCenterQuery) {
  const timePeriod = extractTimePeriod(text);
  
  // Extract limit (ถ้ามี)
  let limit = 10;
  const limitMatch = text.match(/(\d+)\s*(ศูนย์|หน่วยงาน|CENTER|BRANCH|อันดับ|RANK)/i);
  if (limitMatch) {
    limit = parseInt(limitMatch[1]);
  }
  
  return {
    action: 'top_center',
    time_period: timePeriod,
    limit: limit,
    text: rawText,
    session_id: sessionId
  };
}

// ============================================
// 5. ยอด invoice แต่ละเดือน
// ============================================
// รองรับ keyword ที่หลากหลาย
const monthlyKeywords = [
  'แต่ละเดือน', 'รายเดือน', 'MONTHLY', 'เดือน', 'MONTH', 'MONTHS',
  'รายเดือน', 'PER MONTH', 'MONTHLY REPORT', 'รายงานรายเดือน'
];
const monthlyIndicators = [
  'ยอด', 'INVOICE', 'INVOICES', 'ขาย', 'SALES', 'REVENUE', 'AMOUNT',
  'ยอดรวม', 'TOTAL', 'SUM', 'รายงาน', 'REPORT', 'STATISTICS'
];

const hasMonthlyKeyword = monthlyKeywords.some(k => text.includes(k));
const hasMonthlyIndicator = monthlyIndicators.some(k => text.includes(k));

const isMonthlyQuery = hasMonthlyKeyword && hasMonthlyIndicator;

if (isMonthlyQuery) {
  const timePeriod = extractTimePeriod(text);
  
  return {
    action: 'monthly_sales',
    time_period: timePeriod,
    text: rawText,
    session_id: sessionId
  };
}

// ============================================
// 6. Product แยกตามกลุ่ม มียอดขายอะไรบ้าง
// ============================================
// รองรับ keyword ที่หลากหลาย
const productGroupKeywords = [
  'PRODUCT', 'PRODUCTS', 'สินค้า', 'ITEM', 'ITEMS', 'ของ',
  'กลุ่ม', 'GROUP', 'GROUPS', 'CATEGORY', 'CATEGORIES', 'หมวด',
  'ประเภท', 'TYPE', 'TYPES', 'CLASS', 'CLASSIFICATION'
];
const groupIndicators = [
  'กลุ่ม', 'GROUP', 'GROUPS', 'CATEGORY', 'CATEGORIES', 'หมวด',
  'ประเภท', 'TYPE', 'TYPES', 'CLASS', 'แยก', 'SEPARATE', 'BY GROUP',
  'BY CATEGORY', 'ตามกลุ่ม', 'ตามหมวด'
];

const hasProductGroupKeyword = productGroupKeywords.some(k => text.includes(k));
const hasGroupIndicator = groupIndicators.some(k => text.includes(k));

const isProductGroupQuery = hasProductGroupKeyword && hasGroupIndicator;

if (isProductGroupQuery) {
  const timePeriod = extractTimePeriod(text);
  
  return {
    action: 'product_group_sales',
    time_period: timePeriod,
    text: rawText,
    session_id: sessionId
  };
}

// ============================================
// ถ้าไม่ใช่ทั้ง 6 แบบ
// ============================================
return {
  action: 'unknown',
  reply: 'ไม่เข้าใจคำถาม กรุณาลองใช้รูปแบบต่อไปนี้:\n\n' +
         '1. ดู Invoice:\n' +
         '   - "IV0303304"\n' +
         '   - "การ์เดียนอินดัสทรีส์ invoice"\n' +
         '   - "ดู invoice ของ การ์เดียนอินดัสทรีส์"\n\n' +
         '2. รายการยอดเยอะสุด:\n' +
         '   - "TOP 10 สินค้า 6 เดือน"\n' +
         '   - "รายการยอดเยอะสุด 2 เดือน"\n' +
         '   - "สินค้าขายดีที่สุด 1 ปี"\n' +
         '   - "10 สินค้าขายดี 3 เดือน"\n\n' +
         '3. หน่วยงานยอดเยอะสุด:\n' +
         '   - "ศูนย์ไหนยอดขายเยอะสุด"\n' +
         '   - "SBU ยอดเยอะสุดปีนี้"\n' +
         '   - "TOP 5 ศูนย์ยอดขาย 6 เดือน"\n\n' +
         '4. ยอดรายเดือน:\n' +
         '   - "ยอด invoice แต่ละเดือน"\n' +
         '   - "ยอดขายรายเดือนปีนี้"\n' +
         '   - "รายงานยอดขายรายเดือน 12 เดือน"\n\n' +
         '5. กลุ่มสินค้า:\n' +
         '   - "product แยกตามกลุ่ม"\n' +
         '   - "ยอดขายสินค้าแต่ละกลุ่ม"\n' +
         '   - "สินค้าแยกตาม category 1 ปี"',
  text: rawText,
  session_id: sessionId
};
