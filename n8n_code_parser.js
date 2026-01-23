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

// ⚠️ Sales keywords - ถ้ามีคำเหล่านี้ แสดงว่าเป็น sales_performance ไม่ใช่ customer_invoices
const salesPersonKeywords = [
  'เซลส์', 'เซลล์', 'SALES', 'SALESPERSON', 'SALES PERSON', 'SELLER',
  'พนักงานขาย', 'พนักงาน ขาย'
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

// ⚠️ ตรวจสอบว่าเป็นคำถามเกี่ยวกับเซลส์หรือไม่ (ถ้าใช่ ให้ข้าม customer_invoices)
const hasSalesPersonKeyword = salesPersonKeywords.some(k => text.includes(k));
console.log('Has sales person keyword:', hasSalesPersonKeyword);

// เพิ่มเงื่อนไข: ต้องไม่มี sales person keyword
const isCustomerInvoiceQuery = hasInvoiceKeyword && 
                               !hasSalesPersonKeyword &&  // ⚠️ ต้องไม่ใช่คำถามเกี่ยวกับเซลส์
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
      reply: '❌ กรุณาระบุชื่อลูกค้าด้วยครับ\n\n' +
             '📋 ตัวอย่างที่ถูกต้อง:\n' +
             '  • "การ์เดียนอินดัสทรีส์ invoice"\n' +
             '  • "invoice การ์เดียนอินดัสทรีส์"\n' +
             '  • "การ์เดียนอินดัสทรีส์ มี invoice อะไรบ้าง"\n\n' +
             '━━━━━━━━━━━━━━━━━━━━━━━━\n' +
             '💡 หรือลองคำถามอื่น:\n' +
             '  • "สินค้าขายดีที่สุด 6 เดือน" - ดูสินค้าขายดี\n' +
             '  • "ศูนย์ไหนยอดขายเยอะสุด" - ดูศูนย์ที่ขายดี\n' +
             '  • "ยอด invoice แต่ละเดือน" - ดูสถิติรายเดือน\n' +
             '  • "IV0303304" - ดูรายละเอียด invoice',
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

// ตรวจสอบว่ามี center keyword (ถ้ามี แสดงว่าไม่ใช่ top items query)
const centerKeywordsForExclusion = [
  'ศูนย์', 'หน่วยงาน', 'SBU', 'CENTER', 'CENTERS', 'BRANCH', 'BRANCHES', 'สาขา',
  'DEPARTMENT', 'DEPT', 'หน่วย', 'แผนก', 'DIVISION', 'SECTION'
];
const hasCenterKeywordForExclusion = centerKeywordsForExclusion.some(k => text.includes(k));

// ตรวจสอบว่าเป็น top items query
// รองรับหลายกรณี:
// 1. มี item keyword + top indicator (เช่น "สินค้าขายดีที่สุด")
// 2. มี natural question pattern (เช่น "อะไรขายดีที่สุด")
// 3. มี question keyword + top indicator (เช่น "อะไรยอดเยอะสุด") - แต่ต้องไม่มี center keyword
// 4. มี request keyword + item keyword + top indicator (เช่น "อยากได้ รายการสินค้าที่ ขายดี")
// หมายเหตุ: ถ้ามี center keyword แสดงว่าไม่ใช่ top items query
const isTopItemQuery = !hasCenterKeywordForExclusion && (
                       (hasItemKeyword && hasTopIndicator) || 
                       hasNaturalQuestion || 
                       (hasTopItemQuestionKeyword && hasTopIndicator) ||
                       (hasRequestKeyword && hasItemKeyword && hasTopIndicator));

if (isTopItemQuery) {
  const timePeriod = extractTimePeriod(text);
  
  // Extract item filter (ชื่อสินค้าที่ต้องการกรอง)
  let itemFilter = null;
  
  // ลบ keyword ที่ไม่เกี่ยวกับชื่อสินค้าออก
  let cleanText = text;
  const removeKeywords = [
    'สินค้า', 'PRODUCT', 'ITEM', 'รายการ', 'ขายดี', 'ที่สุด', 'เยอะสุด', 'มากสุด',
    'TOP', 'BEST', 'ไหน', 'อะไร', 'ตัว', 'อย่าง', 'บ้าง', 'เดือน', 'ปี', 'วัน',
    'ยอด', 'เยอะ', 'มาก', 'สูง', 'ดี', 'ดีสุด', 'ปีนี้', 'ปีที่แล้ว', 'เดือนนี้'
  ];
  
  removeKeywords.forEach(kw => {
    cleanText = cleanText.replace(new RegExp(kw, 'gi'), ' ');
  });
  
  // ลบตัวเลขที่เป็น time period หรือ limit ออก
  cleanText = cleanText.replace(/\d+\s*(เดือน|ปี|วัน|MONTH|YEAR|DAY|รายการ|อันดับ)/gi, ' ');
  cleanText = cleanText.replace(/TOP\s*\d+/gi, ' ');
  
  // ทำความสะอาด
  cleanText = cleanText.trim().replace(/\s+/g, ' ');
  
  // ถ้ายังมีข้อความเหลือ และยาวพอสมควร → ใช้เป็น filter
  if (cleanText.length > 3) {
    itemFilter = cleanText;
  }
  
  // Extract limit จากคำถาม - รองรับหลายรูปแบบ
  // ถ้าถามว่า "ตัวไหน" (เอกพจน์) ให้ default = 3 แทน 10
  let limit = (text.includes('ตัวไหน') || text.includes('อันไหน')) ? 3 : 10;
  
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
  
  // ถ้าไม่เจอ limit และเป็นคำถามแบบธรรมชาติ (ไม่ระบุจำนวน) ให้ใช้ default
  // แต่ถ้ามีคำว่า "ทั้งหมด", "ALL", "ทุก", "EVERY" ให้ใช้ limit สูงๆ
  if (text.includes('ทั้งหมด') || text.includes('ALL') || text.includes('ทุก') || text.includes('EVERY')) {
    limit = 100; // หรือไม่จำกัด
  }
  
  console.log('✅ Top items query - limit:', limit, 'filter:', itemFilter);
  return {
    action: 'top_items',
    time_period: timePeriod,
    limit: limit,
    item_filter: itemFilter,
    text: rawText,
    session_id: sessionId
  };
}

// ============================================
// 3.5 สินค้า XXX ขายได้ศูนย์ไหนบ้าง (Item Centers)
// ============================================
// รองรับคำถามแบบ: "สินค้า MC-1002 ขายได้ศูนย์ไหนบ้าง", "MC-AP-1001 ขายได้หน่วยไหน"
const itemCenterKeywords = [
  'สินค้า', 'PRODUCT', 'ITEM', 'รหัส', 'CODE', 'SKU', 'รายการ'
];
const centerQuestionKeywords = [
  'ศูนย์ไหน', 'หน่วยไหน', 'SBU ไหน', 'CENTER', 'CENTERS', 'BRANCH', 'BRANCHES',
  'สาขา', 'DEPARTMENT', 'DEPT', 'หน่วยงาน', 'แผนก', 'DIVISION', 'SECTION',
  'ไหน', 'ที่ไหน', 'WHERE', 'WHICH CENTER', 'WHICH BRANCH'
];
const itemActionKeywords = [
  'ขาย', 'ขายได้', 'ขายที่', 'มีที่', 'อยู่ที่', 'มี', 'มีใน', 'SELL', 'SOLD', 'AVAILABLE',
  'ขายได้ที่', 'ขายที่ไหน', 'มีที่ไหน', 'อยู่ที่ไหน'
];

// ตรวจสอบว่ามี item code pattern (เช่น MC-1002, MC-AP-1001, XX-YY-123, etc.)
const itemCodePattern = /[A-Z]{1,4}-[A-Z0-9-]+/i;
const itemCodeMatch = text.match(itemCodePattern);

// ตรวจสอบว่ามี keyword ที่เกี่ยวข้องกับ item centers
const hasItemCenterKeyword = itemCenterKeywords.some(k => text.includes(k));
const hasCenterQuestionKeyword = centerQuestionKeywords.some(k => text.includes(k));
const hasItemActionKeyword = itemActionKeywords.some(k => text.includes(k));

// ตรวจสอบว่าเป็น item centers query
// รองรับหลายรูปแบบ:
// 1. มี item code + center question (เช่น "MC-1002 ขายได้ศูนย์ไหน")
// 2. มี item keyword + center question + action (เช่น "สินค้า XXX ขายได้ที่ไหน")
// 3. มี item code + action + center question (เช่น "MC-AP-1001 ขายที่ศูนย์ไหนบ้าง")
const isItemCentersQuery = (itemCodeMatch || hasItemCenterKeyword) && 
                           hasCenterQuestionKeyword && 
                           (hasItemActionKeyword || itemCodeMatch);

if (isItemCentersQuery) {
  const timePeriod = extractTimePeriod(text);
  
  // Extract item number/code
  let itemNo = null;
  if (itemCodeMatch) {
    itemNo = itemCodeMatch[0].trim();
  }
  
  // Extract limit (ถ้ามี) - รองรับหลายรูปแบบ
  let limit = 10; // default แสดง 10 ศูนย์
  
  // รูปแบบ 1: "TOP 5", "TOP5", "top 5", "TOP-5"
  const topMatch = text.match(/TOP\s*-?\s*(\d+)/i);
  if (topMatch) {
    limit = parseInt(topMatch[1]);
  } else {
    // รูปแบบ 2: "5 ศูนย์", "10 หน่วยงาน", "5 CENTER", "5 BRANCH"
    const numberMatch = text.match(/(\d+)\s*(ศูนย์|หน่วยงาน|CENTER|CENTERS|BRANCH|BRANCHES|SBU|DEPARTMENT|DEPT|หน่วย|แผนก)/i);
    if (numberMatch) {
      limit = parseInt(numberMatch[1]);
    } else {
      // รูปแบบ 3: "ศูนย์ 5", "หน่วยงาน 10", "CENTER 5"
      const reverseMatch = text.match(/(ศูนย์|หน่วยงาน|CENTER|CENTERS|BRANCH|BRANCHES|SBU|DEPARTMENT|DEPT)\s*(\d+)/i);
      if (reverseMatch) {
        limit = parseInt(reverseMatch[2]);
      } else {
        // รูปแบบ 4: "จำนวน 20", "AMOUNT 15", "จำนวน 10 ตัว"
        const amountMatch = text.match(/(จำนวน|AMOUNT|QUANTITY)\s*(\d+)/i);
        if (amountMatch) {
          limit = parseInt(amountMatch[2]);
        } else {
          // รูปแบบ 5: "20 ตัว", "15 อัน", "10 ชิ้น"
          const unitMatch = text.match(/(\d+)\s*(ตัว|อัน|ชิ้น|อย่าง)/i);
          if (unitMatch) {
            limit = parseInt(unitMatch[1]);
          } else {
            // รูปแบบ 6: "ตัว 20", "อัน 15", "ชิ้น 10"
            const unitReverseMatch = text.match(/(ตัว|อัน|ชิ้น|อย่าง)\s*(\d+)/i);
            if (unitReverseMatch) {
              limit = parseInt(unitReverseMatch[2]);
            } else {
              // รูปแบบ 7: "แสดง 10", "SHOW 5", "ดู 20"
              const showMatch = text.match(/(แสดง|SHOW|ดู|LIST)\s*(\d+)/i);
              if (showMatch) {
                limit = parseInt(showMatch[2]);
              }
            }
          }
        }
      }
    }
  }
  
  // ถ้ามีคำว่า "ทั้งหมด", "ALL", "ทุก", "EVERY" ให้แสดงศูนย์ทั้งหมด
  if (text.includes('ทั้งหมด') || text.includes('ALL') || text.includes('ทุก') || text.includes('EVERY')) {
    limit = 100;
  }
  
  console.log('✅ Item centers query - item_no:', itemNo, 'limit:', limit);
  return {
    action: 'item_centers',
    item_no: itemNo,
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
  // ภาษาไทย - รองรับหลายรูปแบบ
  'เยอะ', 'เยอะสุด', 'เยอะที่สุด', 'มาก', 'มากสุด', 'มากที่สุด',
  'สูง', 'สูงสุด', 'สูงที่สุด', 'ดี', 'ดีสุด', 'ดีที่สุด',
  'ขายดี', 'ขายเยอะ', 'ขายมาก', 'ขายสูง', 'ขายดีที่สุด', 'ขายเยอะสุด',
  'ยอดเยอะ', 'ยอดมาก', 'ยอดสูง', 'ยอดเยอะสุด', 'ยอดมากสุด', 'ยอดสูงสุด',
  'อันดับ', 'ลำดับ', 'ที่', 'ที่สุด', 'สุด',
  // ภาษาอังกฤษ
  'TOP', 'BEST', 'HIGHEST', 'MOST', 'GREATEST', 'LARGEST',
  'RANK', 'RANKING', 'RANKED', 'ORDER', 'ORDERED'
];
// Keywords สำหรับคำถาม (เช่น "ไหน", "อะไร")
const topCenterQuestionKeywords = [
  'ไหน', 'อะไร', 'WHAT', 'WHICH', 'WHO', 'ไหนที่', 'อะไรที่',
  'WHAT IS', 'WHAT ARE', 'WHICH ONE', 'WHICH CENTER', 'WHICH BRANCH'
];

const hasCenterKeyword = centerKeywords.some(k => text.includes(k));
const hasSalesKeyword = salesKeywords.some(k => text.includes(k));
const hasTopCenterIndicator = topCenterIndicators.some(k => text.includes(k));
const hasTopCenterQuestionKeyword = topCenterQuestionKeywords.some(k => text.includes(k));

// รองรับหลายรูปแบบ:
// 1. มี center keyword + sales keyword (เช่น "ศูนย์ยอดขาย")
// 2. มี center keyword + top indicator (เช่น "ศูนย์เยอะสุด")
// 3. มี center keyword + question keyword + sales/top indicator (เช่น "ศูนย์ไหนยอดขายเยอะสุด")
const isTopCenterQuery = hasCenterKeyword && 
                         (hasSalesKeyword || hasTopCenterIndicator || 
                          (hasTopCenterQuestionKeyword && (hasSalesKeyword || hasTopCenterIndicator)));

if (isTopCenterQuery) {
  const timePeriod = extractTimePeriod(text);
  
  // Extract limit (ถ้ามี) - รองรับหลายรูปแบบ
  let limit = 10; // default
  
  // รูปแบบ 1: "TOP 5", "TOP5", "top 5", "TOP-5"
  const topMatch = text.match(/TOP\s*-?\s*(\d+)/i);
  if (topMatch) {
    limit = parseInt(topMatch[1]);
  } else {
    // รูปแบบ 2: "5 ศูนย์", "10 หน่วยงาน", "5 CENTER", "5 BRANCH"
    const numberMatch = text.match(/(\d+)\s*(ศูนย์|หน่วยงาน|CENTER|CENTERS|BRANCH|BRANCHES|อันดับ|RANK|RANKING|ลำดับ)/i);
    if (numberMatch) {
      limit = parseInt(numberMatch[1]);
    } else {
      // รูปแบบ 3: "ศูนย์ 5", "หน่วยงาน 10", "CENTER 5"
      const reverseMatch = text.match(/(ศูนย์|หน่วยงาน|CENTER|CENTERS|BRANCH|BRANCHES)\s*(\d+)/i);
      if (reverseMatch) {
        limit = parseInt(reverseMatch[2]);
      } else {
        // รูปแบบ 4: "5 อันดับ", "10 ลำดับ", "5 RANK"
        const rankMatch = text.match(/(\d+)\s*(อันดับ|ลำดับ|RANK|RANKING|ORDER)/i);
        if (rankMatch) {
          limit = parseInt(rankMatch[1]);
        } else {
          // รูปแบบ 5: "อันดับ 5", "ลำดับ 10", "RANK 5"
          const rankReverseMatch = text.match(/(อันดับ|ลำดับ|RANK|RANKING|ORDER)\s*(\d+)/i);
          if (rankReverseMatch) {
            limit = parseInt(rankReverseMatch[2]);
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
  
  // ตรวจสอบว่าต้องการจัดกลุ่มแบบไหน
  let groupBy = 'number'; // default: Group 1-9 (ตามตัวเลขหน้า)
  
  // ตรวจสอบ keyword สำหรับแต่ละประเภท
  if (text.includes('BRAND') || text.includes('ยี่ห้อ') || text.includes('แบรนด์') || text.includes('BRANDS')) {
    groupBy = 'brand';
  } else if (text.includes('CATEGORY') || text.includes('CATEGORIES') || text.includes('IR') || 
             text.includes('หมวดหมู่') || text.includes('หมวด') || text.includes('IR CODE')) {
    groupBy = 'ir_code';
  } else if (text.includes('PREFIX') || text.includes('รหัสหน้า') || text.includes('SERIES') ||
             text.includes('MC-') || text.includes('AP-') || text.includes('SP-')) {
    groupBy = 'prefix';
  } else if (text.includes('TYPE') || text.includes('ประเภท') || text.includes('ITEM TYPE')) {
    groupBy = 'item_type';
  } else if (text.includes('DEPARTMENT') || text.includes('ศูนย์') || text.includes('หน่วยงาน')) {
    groupBy = 'department';
  }
  // else: ใช้ default 'number' (Group 1-9)
  
  // Extract limit (ถ้ามี) - รองรับหลายรูปแบบ
  let limit = 50; // default แสดง 50 กลุ่ม
  
  // รูปแบบ 1: "TOP 5", "TOP5", "top 5", "TOP-5"
  const topMatch = text.match(/TOP\s*-?\s*(\d+)/i);
  if (topMatch) {
    limit = parseInt(topMatch[1]);
  } else {
    // รูปแบบ 2: "5 กลุ่ม", "10 brand", "5 category"
    const numberMatch = text.match(/(\d+)\s*(กลุ่ม|GROUP|GROUPS|BRAND|BRANDS|CATEGORY|CATEGORIES|ยี่ห้อ|แบรนด์|หมวด|หมวดหมู่|SERIES|ประเภท|TYPE|ศูนย์|หน่วยงาน|DEPARTMENT)/i);
    if (numberMatch) {
      limit = parseInt(numberMatch[1]);
    } else {
      // รูปแบบ 3: "กลุ่ม 5", "brand 10", "category 5"
      const reverseMatch = text.match(/(กลุ่ม|GROUP|GROUPS|BRAND|BRANDS|CATEGORY|CATEGORIES|ยี่ห้อ|แบรนด์)\s*(\d+)/i);
      if (reverseMatch) {
        limit = parseInt(reverseMatch[2]);
      } else {
        // รูปแบบ 4: "แสดง 10", "SHOW 5", "ดู 20"
        const showMatch = text.match(/(แสดง|SHOW|ดู|LIST)\s*(\d+)/i);
        if (showMatch) {
          limit = parseInt(showMatch[2]);
        }
      }
    }
  }
  
  // ถ้ามีคำว่า "ทั้งหมด", "ALL", "ทุก", "EVERY" ให้แสดงทั้งหมด
  if (text.includes('ทั้งหมด') || text.includes('ALL') || text.includes('ทุก') || text.includes('EVERY')) {
    limit = 100;
  }
  
  console.log('✅ Product group query - group_by:', groupBy, 'limit:', limit);
  return {
    action: 'product_group_sales',
    time_period: timePeriod,
    group_by: groupBy,
    limit: limit,
    text: rawText,
    session_id: sessionId
  };
}

// ============================================
// 7. Sales Performance (ยอดขายของเซลส์)
// ============================================
// รองรับคำถามแบบ: "เซลส์ [ชื่อ] ขายได้เท่าไหร่", "TOP 10 เซลส์ยอดเยอะสุด"

// Check inline เพื่อหลีกเลี่ยง "already been declared" error
const isSalesQuery = (() => {
  const salesKeywords = [
    'เซลส์', 'SALES', 'SALESPERSON', 'SALE', 'ขาย', 'พนักงานขาย',
    'SELLER', 'SELLERS', 'เซลล์', 'SALES PERSON'
  ];
  const salesIndicators = [
    'ยอด', 'SALES', 'ขาย', 'REVENUE', 'AMOUNT', 'ยอดขาย', 'ยอดรวม',
    'เยอะ', 'เยอะสุด', 'มาก', 'มากสุด', 'ดี', 'ดีสุด', 'ดีที่สุด',
    'TOP', 'BEST', 'HIGHEST', 'MOST', 'PERFORMANCE', 'มี', 'ได้',
    'INVOICE', 'INVOICES', 'INV', 'บิล', 'ใบแจ้งหนี้', 'เท่าไหร่',
    'ลูกค้า', 'CUSTOMER', 'CUSTOMERS', 'CLIENT', 'CLIENTS', 'ดูแล', 'รับผิดชอบ'
  ];
  
  const hasSalesKeyword = salesKeywords.some(k => text.includes(k));
  const hasSalesIndicator = salesIndicators.some(k => text.includes(k));
  
  return hasSalesKeyword && hasSalesIndicator;
})();

if (isSalesQuery) {
  const timePeriod = extractTimePeriod(text);
  
  // Extract sales person name (ถ้ามี)
  let salesPersonName = null;
  
  // ลบ keyword ทั่วไปออก
  let cleanText = text;
  const removeKeywords = [
    'เซลส์', 'เซลล์', 'SALES', 'SALESPERSON', 'SALES PERSON', 'SELLER',
    'ขาย', 'ยอด', 'ยอดขาย', 'เยอะสุด', 'มากสุด', 'ดีที่สุด', 
    'TOP', 'BEST', 'มี', 'ได้', 'เท่าไหร่', 'บ้าง',
    'INVOICE', 'INVOICES', 'INV', 'บิล', 'เดือน', 'ปี', 'วัน', 'ปีนี้', 'ปีที่แล้ว',
    'PERFORMANCE', 'พนักงาน', 'พนักงานขาย', 'คน', 'ไหน', 'อะไร',
    // เพิ่ม: keyword เกี่ยวกับ "ดูแลลูกค้า"
    'ดูแล', 'รับผิดชอบ', 'ลูกค้า', 'ใคร', 'ใครบ้าง', 'CUSTOMER', 'CUSTOMERS', 
    'CLIENT', 'CLIENTS', 'TAKE CARE', 'HANDLE', 'MANAGE',
    // เพิ่ม: คำถามอื่นๆ
    'กี่', 'เท่าใด', 'HOW MANY', 'HOW MUCH', 'WHAT'
  ];
  
  removeKeywords.forEach(kw => {
    cleanText = cleanText.replace(new RegExp(kw, 'gi'), ' ');
  });
  
  // ลบตัวเลขที่เป็น time period หรือ limit ออก
  cleanText = cleanText.replace(/\d+\s*(เดือน|ปี|วัน|MONTH|YEAR|DAY|รายการ|อันดับ|คน)/gi, ' ');
  cleanText = cleanText.replace(/TOP\s*\d+/gi, ' ');
  
  // ทำความสะอาด
  cleanText = cleanText.trim().replace(/\s+/g, ' ');
  
  // ถ้ายังมีข้อความเหลือ และยาวพอสมควร → ใช้เป็นชื่อเซลส์
  if (cleanText.length > 2) {
    salesPersonName = cleanText;
  }
  
  // Extract limit (ถ้ามี)
  let limit = 10; // default แสดง 10 คน
  
  // รูปแบบ 1: "TOP 5", "TOP10"
  const topMatch = text.match(/TOP\s*-?\s*(\d+)/i);
  if (topMatch) {
    limit = parseInt(topMatch[1]);
  } else {
    // รูปแบบ 2: "5 คน", "10 เซลส์", "5 SALES"
    const numberMatch = text.match(/(\d+)\s*(คน|เซลส์|SALES|SALESPERSON|อันดับ|RANK)/i);
    if (numberMatch) {
      limit = parseInt(numberMatch[1]);
    } else {
      // รูปแบบ 3: "แสดง 10", "SHOW 5"
      const showMatch = text.match(/(แสดง|SHOW|ดู|LIST)\s*(\d+)/i);
      if (showMatch) {
        limit = parseInt(showMatch[2]);
      }
    }
  }
  
  // ถ้ามีคำว่า "ทั้งหมด", "ALL", "ทุก" ให้แสดงทั้งหมด
  if (text.includes('ทั้งหมด') || text.includes('ALL') || text.includes('ทุก') || text.includes('EVERY')) {
    limit = 100;
  }
  
  console.log('✅ Sales performance query - sales_person:', salesPersonName, 'limit:', limit);
  return {
    action: 'sales_performance',
    sales_person_name: salesPersonName,
    time_period: timePeriod,
    limit: limit,
    text: rawText,
    session_id: sessionId
  };
}

// ============================================
// ถ้าไม่ใช่ทั้ง 7 แบบ
// ============================================
return {
  action: 'unknown',
  reply: '🤔 ไม่เข้าใจคำถามครับ ลองใช้รูปแบบเหล่านี้:\n\n' +
         '🔍 คำถามยอดนิยม:\n\n' +
         '📄 ดูข้อมูล Invoice:\n' +
         '  • "IV0303304" - ดูรายละเอียด invoice\n' +
         '  • "การ์เดียนอินดัสทรีส์ invoice" - ดู invoice ของลูกค้า\n\n' +
         '🏆 วิเคราะห์ยอดขาย:\n' +
         '  • "สินค้าขายดีที่สุด 6 เดือน" - สินค้าขายดี\n' +
         '  • "ศูนย์ไหนยอดขายเยอะสุดปีที่แล้ว" - ศูนย์ยอดเยอะ\n' +
         '  • "TOP 10 สินค้า 3 เดือน" - TOP สินค้า\n' +
         '  • "TOP 5 ศูนย์ยอดขาย 6 เดือน" - TOP ศูนย์\n\n' +
         '📊 ดูสถิติ:\n' +
         '  • "ยอด invoice แต่ละเดือน" - ยอดรายเดือน\n' +
         '  • "product แยกตามกลุ่ม 1 ปี" - แยกตามหมวดหมู่\n\n' +
         '━━━━━━━━━━━━━━━━━━━━━━━━\n' +
         '💡 เริ่มต้นลองถาม:\n' +
         '  • "สินค้าอะไรขายดีที่สุด" - ดูสินค้าขายดี\n' +
         '  • "ศูนย์ไหนยอดเยอะสุด" - ดูศูนย์ที่ขายดี\n' +
         '  • "ยอดขายรายเดือนปีนี้" - ดูแนวโน้มรายเดือน',
  text: rawText,
  session_id: sessionId
};
