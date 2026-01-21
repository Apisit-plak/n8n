# WHERE Builder - Code Node Mode

## ⚠️ สิ่งสำคัญ: Code Node Mode

### WHERE Builder ต้องใช้ "Run Once for Each Item" mode

**เหตุผล:**
- Parser ใช้ "Run Once for Each Item" mode และ return object เดียว
- Switch node ส่ง object เดียวไปยัง WHERE Builder
- WHERE Builder ต้อง return object เดียว (ไม่ใช่ array)
- SQL Query node ใช้ `$json.where_clause` โดยตรง

---

## ✅ โค้ดที่ถูกต้อง

```javascript
// Return ข้อมูลพร้อม where_clause
// สำหรับ "Run Once for Each Item" mode ต้อง return object เดียว
return {
  ...$json,
  where_clause: whereClause.trim(),
  date_condition: dateCondition
};
```

---

## ❌ โค้ดที่ผิด

```javascript
// ❌ ผิด - return array
return [{
  ...$json,
  where_clause: whereClause.trim(),
  date_condition: dateCondition
}];
```

**ปัญหาที่เกิด:**
- SQL Query node ไม่สามารถเข้าถึง `$json.where_clause` ได้
- n8n อาจแสดง error: "Code doesn't return a single object"

---

## 📋 Checklist สำหรับ WHERE Builder

- [ ] ตั้งค่า Code Node เป็น "Run Once for Each Item" mode
- [ ] Return object เดียว: `return { ... }` (ไม่ใช่ array)
- [ ] ตรวจสอบว่า `where_clause` ถูกสร้างถูกต้อง
- [ ] ตรวจสอบ OUTPUT ของ WHERE Builder node

---

## 🔍 วิธีตรวจสอบ

### 1. ตรวจสอบ Code Node Mode

1. เปิด WHERE Builder Code node
2. ดูที่ Settings tab
3. ตรวจสอบว่า Mode เป็น "Run Once for Each Item"

### 2. ตรวจสอบ OUTPUT

1. Execute WHERE Builder node
2. ดู OUTPUT ว่ามี `where_clause` หรือไม่
3. ตรวจสอบว่า `where_clause` มีค่า: `WHERE 1=1 AND ...`

### 3. ตรวจสอบ SQL Query Node

1. เปิด Execute SQL Query node
2. ตรวจสอบว่า `{{ $json.where_clause }}` ถูก evaluate หรือไม่
3. ดูที่ Query field ว่ามี `WHERE 1=1 AND ...` หรือไม่

---

## 📝 หมายเหตุ

- **Mode:** ต้องใช้ "Run Once for Each Item" mode
- **Return:** ต้อง return object เดียว (ไม่ใช่ array)
- **Output:** ต้องมี `where_clause` field
