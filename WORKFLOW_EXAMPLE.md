# ตัวอย่าง n8n Workflow สำหรับ Chat Interface

## Workflow Structure ที่ถูกต้อง

```
[Webhook] → [JavaScript Node] → [Respond to Webhook]
```

## Step-by-Step Setup

### 1. Webhook Node
- **HTTP Method**: `POST`
- **Path**: `/webhook-test/plak`
- **Response Mode**: `Using 'Respond to Webhook' Node`

**Fields to Set**:
- `text`: `{{ $json.text }}`
- `session_id`: `{{ $json.session_id }}`

### 2. JavaScript Node (หรือ Code Node)
**Code**:
```javascript
// รับข้อมูลจาก webhook
const text = $input.item.json.text;
const sessionId = $input.item.json.session_id;

// ประมวลผลหรือเพิ่ม logic
// ตัวอย่าง: ตรวจสอบ invoice number
if (!text || text.trim() === '') {
  return [{ reply: 'กรุณาระบุเลข invoice เช่น IV0303304' }];
}

// หรือ return response ตามที่ต้องการ
return [{ reply: `คุณส่งข้อความ: ${text}, Session: ${sessionId}` }];
```

**Output**: 
```json
{
  "reply": "กรุณาระบุเลข invoice เช่น IV0303304"
}
```

### 3. Respond to Webhook Node ⚠️ (ต้องมี!)
**การตั้งค่า**:
- **Response Code**: `200`
- **Response Body**: 
  ```json
  {{ $json.reply }}
  ```
  
  หรือถ้าต้องการส่งเป็น JSON object:
  ```json
  {
    "reply": "{{ $json.reply }}"
  }
  ```

## ตัวอย่าง Workflow ที่สมบูรณ์

### ตัวอย่างที่ 1: Query Top 10 Invoices
```
[Webhook] 
  ↓
[If: ตรวจสอบคำสั่ง "top" หรือ "อันดับ"]
  ↓ (true)
[Execute SQL Query: SELECT TOP 10 ... ORDER BY total_amount DESC]
  ↓
[JavaScript: จัดรูปแบบผลลัพธ์]
  ↓
[Respond to Webhook: {{ $json.reply }}]
```

### ตัวอย่างที่ 2: Simple Echo
```
[Webhook] 
  ↓
[JavaScript: return [{ reply: $json.text }]]
  ↓
[Respond to Webhook: {{ $json.reply }}]
```

### ตัวอย่างที่ 2: ตรวจสอบ Invoice
```
[Webhook] 
  ↓
[JavaScript: ตรวจสอบ invoice และ return reply]
  ↓
[Respond to Webhook: {{ $json.reply }}]
```

### ตัวอย่างที่ 3: เรียก AI/API
```
[Webhook] 
  ↓
[HTTP Request: เรียก AI API]
  ↓
[JavaScript: ประมวลผล response]
  ↓
[Respond to Webhook: {{ $json.reply }}]
```

## ⚠️ ข้อผิดพลาดที่พบบ่อย

### ❌ ผิด: ไม่มี Respond to Webhook
```
[Webhook] → [JavaScript] → (ไม่มี node ต่อ)
```
**ผลลัพธ์**: Chat interface จะไม่ได้รับ response

### ✅ ถูก: มี Respond to Webhook
```
[Webhook] → [JavaScript] → [Respond to Webhook]
```
**ผลลัพธ์**: Chat interface จะได้รับ response

## การทดสอบ Workflow

1. **Activate Workflow** - เปิดสวิตช์ที่มุมบนขวา
2. **Execute Step** - ทดสอบแต่ละ node ด้วยปุ่ม "Execute step"
3. **ดู Output** - ตรวจสอบ output ของแต่ละ node
4. **ทดสอบจาก Chat** - ส่งข้อความจาก http://localhost

## Troubleshooting

### ไม่ได้รับ response ใน chat
- ✅ ตรวจสอบว่า workflow ถูก activate แล้ว
- ✅ ตรวจสอบว่ามี Respond to Webhook node
- ✅ ตรวจสอบว่า Response Body ตั้งค่าถูกต้อง: `{{ $json.reply }}`
- ✅ ดู execution history ใน n8n

### ได้ error response
- ✅ ตรวจสอบว่า JavaScript node return ข้อมูลถูกต้อง
- ✅ ตรวจสอบว่า Response Body ใช้ expression ถูกต้อง
- ✅ ดู error details ใน n8n execution history

