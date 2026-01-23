// n8n Code Node - SQL WHERE Clause Builder
// ใช้สำหรับสร้าง WHERE clause แบบ dynamic ตาม time_period

// รับข้อมูลจาก parser
const timePeriod = $json.time_period;
const action = $json.action;

// สร้าง WHERE clause
let whereClause = 'WHERE 1=1';
let dateCondition = '';

if (timePeriod && timePeriod.period) {
  const period = timePeriod.period;
  const value = timePeriod.value;
  
  switch(period) {
    case 'this_year':
      dateCondition = "AND YEAR(h.inv_posting_date) = YEAR(CURDATE())";
      break;
      
    case 'last_year':
      dateCondition = "AND YEAR(h.inv_posting_date) = YEAR(CURDATE()) - 1";
      break;
      
    case 'this_month':
      dateCondition = "AND YEAR(h.inv_posting_date) = YEAR(CURDATE()) AND MONTH(h.inv_posting_date) = MONTH(CURDATE())";
      break;
      
    case 'last_month':
      dateCondition = "AND YEAR(h.inv_posting_date) = YEAR(CURDATE()) AND MONTH(h.inv_posting_date) = MONTH(CURDATE()) - 1";
      break;
      
    case 'month':
      if (value) {
        dateCondition = `AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL ${value} MONTH)`;
      } else {
        dateCondition = "AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)";
      }
      break;
      
    case 'year':
      if (value) {
        dateCondition = `AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL ${value} YEAR)`;
      } else {
        dateCondition = "AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";
      }
      break;
      
    case 'week':
      if (value) {
        dateCondition = `AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL ${value} WEEK)`;
      } else {
        dateCondition = "AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL 1 WEEK)";
      }
      break;
      
    case 'day':
      if (value) {
        dateCondition = `AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL ${value} DAY)`;
      } else {
        dateCondition = "AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
      }
      break;
      
    case 'today':
      dateCondition = "AND DATE(h.inv_posting_date) = CURDATE()";
      break;
      
    case 'yesterday':
      dateCondition = "AND DATE(h.inv_posting_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)";
      break;
      
    case 'date':
      if (timePeriod.year && timePeriod.month) {
        dateCondition = `AND YEAR(h.inv_posting_date) = ${timePeriod.year} AND MONTH(h.inv_posting_date) = ${timePeriod.month}`;
      } else if (timePeriod.year) {
        dateCondition = `AND YEAR(h.inv_posting_date) = ${timePeriod.year}`;
      }
      break;
  }
}

// สำหรับ monthly_sales ถ้าไม่มี time_period ให้ใช้ 12 เดือนล่าสุด
if (action === 'monthly_sales' && !timePeriod) {
  dateCondition = "AND h.inv_posting_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)";
}

whereClause += ' ' + dateCondition;

// เพิ่ม item filter (สำหรับ top_items)
let itemFilterCondition = '';
if ($json.item_filter && action === 'top_items') {
  // ใช้ LIKE เพื่อค้นหาในชื่อสินค้า
  const filterText = $json.item_filter.replace(/'/g, "''"); // escape single quotes
  itemFilterCondition = `AND (l.inv_line_description LIKE '%${filterText}%' OR l.inv_line_item_no LIKE '%${filterText}%')`;
  whereClause += ' ' + itemFilterCondition;
}

// Return ข้อมูลพร้อม where_clause
// สำหรับ "Run Once for Each Item" mode ต้อง return object เดียว
return {
  ...$json,
  where_clause: whereClause.trim(),
  date_condition: dateCondition,
  item_filter_condition: itemFilterCondition
};
