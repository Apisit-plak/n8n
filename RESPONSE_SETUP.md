# การตั้งค่า Response Body ใน n8n

## วิธีตั้งค่า Response Body เป็น `{{ $json.reply }}`

### ใน "Reply to user" (Respond to Webhook) Node:

#### วิธีที่ 1: ส่งเป็น JSON Object (แนะนำ) ✅

1. **Respond With**: เลือก `JSON`
2. **Response Body**: ใส่
   ```json
   {
     "reply": "{{ $json.reply }}"
   }
   ```
3. **Response Code**: `200`

**ผลลัพธ์ที่ส่งไป**: 
```json
{
  "reply": "ข้อมูล invoice หรือข้อความตอบกลับ"
}
```

#### วิธีที่ 2: ส่งเป็น String โดยตรง

1. **Respond With**: เลือก `String`
2. **Response Body**: ใส่
   ```
   {{ $json.reply }}
   ```
3. **Response Code**: `200`

**ผลลัพธ์ที่ส่งไป**: 
```
ข้อมูล invoice หรือข้อความตอบกลับ
```

## ระบบรองรับทั้งสองแบบ

### ✅ Server.js รองรับ:
- `data.reply` - จาก JSON object
- String โดยตรง - ถ้า n8n ส่ง string กลับมา
- Array with reply - ถ้า n8n ส่ง array ที่มี reply field

### ✅ Frontend (index.html) รองรับ:
- `data.response` - รองรับ response field
- `data.reply` - รองรับ reply field
- Fallback message - ถ้าไม่มีทั้งสอง

## ตัวอย่างการทำงาน

### ตัวอย่างที่ 1: n8n ส่ง JSON object
**n8n Response Body:**
```json
{
  "reply": "{{ $json.reply }}"
}
```

**JavaScript node return:**
```javascript
return [{ reply: 'Invoice: IV0303304\nลูกค้า: ...' }];
```

**ผลลัพธ์ที่ส่งไป chat:**
```json
{
  "reply": "Invoice: IV0303304\nลูกค้า: ..."
}
```

**Chat interface จะแสดง:**
```
Invoice: IV0303304
ลูกค้า: ...
```

### ตัวอย่างที่ 2: n8n ส่ง String โดยตรง
**n8n Response Body:**
```
{{ $json.reply }}
```

**JavaScript node return:**
```javascript
return [{ reply: 'Invoice: IV0303304\nลูกค้า: ...' }];
```

**ผลลัพธ์ที่ส่งไป chat:**
```
Invoice: IV0303304
ลูกค้า: ...
```

**Chat interface จะแสดง:**
```
Invoice: IV0303304
ลูกค้า: ...
```

## การแสดงผลใน Chat Interface

Chat interface จะ:
1. รับ response จาก n8n
2. ดึงค่า `reply` หรือ `response` 
3. แสดงผลในรูปแบบข้อความ
4. รองรับการขึ้นบรรทัดใหม่ (`\n`) ในข้อความ

## Troubleshooting

### ไม่แสดงผลใน chat
- ✅ ตรวจสอบว่า workflow ถูก activate แล้ว
- ✅ ตรวจสอบว่า Response Body ใช้ `{{ $json.reply }}` ถูกต้อง
- ✅ ตรวจสอบว่า JavaScript node return `reply` field
- ✅ ดู logs: `docker-compose logs -f chat-server`

### แสดงผลแต่ไม่มีข้อมูล
- ✅ ตรวจสอบว่า JavaScript node มี output `reply` 
- ✅ ตรวจสอบว่า `{{ $json.reply }}` ดึงค่าถูกต้อง
- ✅ Execute step ใน JavaScript node เพื่อดู output

### แสดงผลแต่ format ผิด
- ✅ ตรวจสอบว่า Response Body ตั้งค่าถูกต้อง
- ✅ ถ้าใช้ JSON object ต้องมี `{ "reply": "{{ $json.reply }}" }`
- ✅ ถ้าใช้ String ต้องเป็น `{{ $json.reply }}` โดยตรง

