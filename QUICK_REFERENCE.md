# Quick Reference - ต้องใช้อันไหน?

## 📋 สำหรับคำถาม: "อยากได้ รายการสินค้าที่ ขายดี เดือนนี้"

### ✅ ต้องใช้:

1. **Parser** → `action: 'top_items'`, `time_period: { period: 'this_month' }`
2. **Switch Node** → Route ไปยัง `top_items`
3. **WHERE Builder** → สร้าง `where_clause` (✅ มีแล้ว)
4. **Execute SQL Query - Top Items** → ใช้ **Query 3 (top_items)**

---

## 📝 SQL Query ที่ต้องใช้ (Query 3 - top_items)

```sql
SELECT
  l.inv_line_item_no           AS item_no,
  l.inv_line_description       AS item_description,
  SUM(l.inv_line_amount)      AS total_amount,
  SUM(l.inv_line_amount_vat)  AS total_amount_vat,
  SUM(l.inv_line_amount) + SUM(l.inv_line_amount_vat) AS net_amount,
  SUM(l.inv_line_quantity)    AS total_quantity,
  COUNT(DISTINCT l.inv_line_inv_no) AS invoice_count,
  COUNT(DISTINCT h.inv_department) AS department_count,
  AVG(l.inv_line_amount)       AS avg_amount,
  GROUP_CONCAT(DISTINCT h.inv_department_name ORDER BY h.inv_department_name SEPARATOR ', ') AS top_departments
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
{{ $json.where_clause }}
AND l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
AND l.inv_line_inv_no IS NOT NULL
GROUP BY 
  l.inv_line_item_no,
  l.inv_line_description
HAVING COUNT(DISTINCT l.inv_line_inv_no) > 0
ORDER BY total_amount DESC
LIMIT {{ $json.limit ? $json.limit : 10 }}
```

---

## ⚠️ ปัญหา: "No output data returned"

### วิธีแก้ไข:

#### 1. ตรวจสอบว่า SQL Query สมบูรณ์หรือไม่

**ต้องมีส่วนต่อไปนี้ครบถ้วน:**
- ✅ SELECT (มีแล้ว)
- ✅ FROM (มีแล้ว)
- ✅ LEFT JOIN (มีแล้ว)
- ✅ WHERE (ใช้ `{{ $json.where_clause }}`)
- ✅ AND conditions (มีแล้ว)
- ✅ GROUP BY (มีแล้ว)
- ✅ HAVING (มีแล้ว)
- ✅ ORDER BY (มีแล้ว)
- ✅ LIMIT (มีแล้ว)

#### 2. ทดสอบด้วย Query แบบ Static

แทนที่ `{{ $json.where_clause }}` ด้วย:

```sql
WHERE 1=1
AND YEAR(h.inv_posting_date) = YEAR(CURDATE())
AND MONTH(h.inv_posting_date) = MONTH(CURDATE())
```

#### 3. ตรวจสอบว่ามีข้อมูลในเดือนนี้หรือไม่

```sql
SELECT
  COUNT(*) AS total_records,
  COUNT(DISTINCT l.inv_line_item_no) AS unique_items,
  COUNT(DISTINCT l.inv_line_inv_no) AS unique_invoices,
  MIN(h.inv_posting_date) AS earliest_date,
  MAX(h.inv_posting_date) AS latest_date
FROM data_warehouse.service_posted_invoice_line l
LEFT JOIN data_warehouse.service_posted_invoice_header h
  ON h.inv_no = l.inv_line_inv_no
WHERE YEAR(h.inv_posting_date) = YEAR(CURDATE())
AND MONTH(h.inv_posting_date) = MONTH(CURDATE())
AND l.inv_line_item_no IS NOT NULL
AND l.inv_line_item_no != ''
```

---

## 📊 Mapping Action → SQL Query

| คำถาม | Action | SQL Query | WHERE Builder? |
|-------|--------|-----------|----------------|
| "IV0303304" | `invoice_detail` | Query 1 | ❌ |
| "การ์เดียนอินดัสทรีส์ invoice" | `customer_invoices` | Query 2 | ❌ |
| "TOP 10 สินค้า 6 เดือน" | `top_items` | **Query 3** | ✅ |
| "ศูนย์ไหนยอดขายเยอะสุด" | `top_center` | Query 4 | ✅ |
| "ยอด invoice แต่ละเดือน" | `monthly_sales` | Query 5 | ✅ |
| "product แยกตามกลุ่ม" | `product_group_sales` | Query 6 | ✅ |

---

## ✅ Checklist

- [ ] ใช้ Query 3 (top_items) ✅
- [ ] ใช้ WHERE Builder ✅ (มีแล้ว)
- [ ] เปิด Expression mode (`{{ }}`) ✅
- [ ] SQL query สมบูรณ์ (มี GROUP BY, HAVING, ORDER BY, LIMIT) ✅
- [ ] ทดสอบว่ามีข้อมูลในเดือนนี้หรือไม่ ⚠️ (ต้องตรวจสอบ)

---

## 🔍 Debug Steps

1. **ตรวจสอบ Expression:**
   - ดู OUTPUT ของ WHERE Builder ว่ามี `where_clause` หรือไม่ ✅ (มีแล้ว)
   - ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่

2. **ทดสอบข้อมูล:**
   - ใช้ Test Query 3 เพื่อตรวจสอบว่ามีข้อมูลในเดือนนี้หรือไม่
   - ถ้าไม่มีข้อมูล → ลองใช้ 12 เดือนล่าสุดแทน

3. **ตรวจสอบ SQL Query:**
   - ตรวจสอบว่า SQL query สมบูรณ์ (มี GROUP BY, HAVING, ORDER BY, LIMIT)
   - ทดสอบด้วย Query แบบ static ก่อน
