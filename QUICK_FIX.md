# ⚠️ แก้ไข Respond to Webhook Node

## ปัญหา
Response Body ใน "Reply to user" node ยังตั้งค่าเป็น:
```json
{
  "myField": "value"
}
```

## วิธีแก้ไข

### ขั้นตอนที่ 1: เปิด "Reply to user" node
- คลิกที่ "Reply to user" node (Respond to Webhook)

### ขั้นตอนที่ 2: แก้ไข Response Body
ใน **Response Body** field ให้เปลี่ยนจาก:
```json
{
  "myField": "value"
}
```

เป็น (เลือกแบบใดแบบหนึ่ง):

**แบบที่ 1: ส่งเป็น JSON object (แนะนำ)**
```json
{
  "reply": "{{ $json.reply }}"
}
```

**แบบที่ 2: ส่งเป็น string โดยตรง**
```
{{ $json.reply }}
```

**⚠️ หมายเหตุ**: 
- ถ้าใช้แบบที่ 1: ตั้ง **Respond With** = `JSON`
- ถ้าใช้แบบที่ 2: ตั้ง **Respond With** = `String`

### ขั้นตอนที่ 3: ตรวจสอบการตั้งค่า
- **Respond With**: `JSON`
- **Response Code**: `200`
- **Response Body**: `{ "reply": "{{ $json.reply }}" }`

### ขั้นตอนที่ 4: Save และ Activate
- กด **Save** workflow
- เปิดสวิตช์ **Activate** ที่มุมบนขวา

## หมายเหตุ
- `{{ $json.reply }}` จะดึงค่าจาก JavaScript node ที่ return `reply`
- ถ้า JavaScript node return array `[{ reply: '...' }]` จะดึง `reply` จาก item แรก
- Chat interface จะรับ `reply` และแสดงผลได้ถูกต้อง

## ทดสอบ
1. เปิด chat interface ที่ http://localhost
2. ส่งข้อความ invoice number เช่น `IV0303304`
3. ควรจะได้รับ response ที่มีข้อมูล invoice กลับมา

