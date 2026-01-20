# คู่มือการตั้งค่า n8n Workflow

## Nodes ที่ต้องใช้ใน n8n Workflow

### 1. Webhook Node (Trigger)
**หน้าที่**: รับข้อมูลจาก chat interface

**การตั้งค่า**:
- **HTTP Method**: `POST`
- **Path**: `/webhook-test/plak` (หรือ path ที่คุณต้องการ)
- **Response Mode**: `Last Node` หรือ `Using 'Respond to Webhook' Node`

**Fields to Set** (ตามที่คุณตั้งค่าไว้):
- `text` (String) - **Value**: `{{ $json.text }}` ⚠️ ต้องใช้ `$json.text` ไม่ใช่ `$json`
- `session_id` (String) - **Value**: `{{ $json.session_id }}` ⚠️ ต้องใช้ `$json.session_id` ไม่ใช่ `$`

**⚠️ ข้อผิดพลาดที่พบบ่อย:**
- ❌ `text: {{ $json }}` → จะได้ทั้ง JSON object เป็น string
- ✅ `text: {{ $json.text }}` → จะได้เฉพาะข้อความ
- ❌ `session_id: {{ $ }}` → Error: invalid syntax
- ✅ `session_id: {{ $json.session_id }}` → จะได้ session ID

### 2. Function Node หรือ Code Node (Optional)
**หน้าที่**: ประมวลผลข้อมูลหรือเพิ่ม logic

**ตัวอย่าง**:
```javascript
// รับข้อมูลจาก webhook
const text = $input.item.json.text;
const sessionId = $input.item.json.session_id;

// ประมวลผลหรือเพิ่ม logic
const processedData = {
  message: text,
  session: sessionId,
  timestamp: new Date().toISOString()
};

return { json: processedData };
```

### 3. AI Node หรือ HTTP Request Node (Optional)
**หน้าที่**: เรียก AI service หรือ API อื่นๆ

**ตัวอย่าง HTTP Request**:
- Method: `POST`
- URL: `https://api.example.com/chat`
- Body: ใช้ข้อมูลจาก node ก่อนหน้า

### 4. Respond to Webhook Node (สำคัญ! ⚠️ ต้องมี)
**หน้าที่**: ส่ง response กลับไปที่ chat interface

**⚠️ ต้องต่อจาก JavaScript node หรือ node สุดท้ายใน workflow**

**การตั้งค่า**:
- **Respond With**: `JSON` (หรือ `String` ถ้าต้องการส่งเป็น string)
- **Response Code**: `200`
- **Response Body**: 
  
  **⚠️ สำคัญ: ต้องแก้ไข Response Body ให้ถูกต้อง**
  
  **ถ้า JavaScript node return `reply` (ตามที่คุณใช้):**
  ```json
  {
    "reply": "{{ $json.reply }}"
  }
  ```
  
  หรือส่งเป็น string โดยตรง:
  ```
  {{ $json.reply }}
  ```
  
  **ถ้า JavaScript node return `response`:**
  ```json
  {
    "response": "{{ $json.response }}"
  }
  ```
  
  **❌ ผิด:**
  ```json
  {
    "myField": "value"
  }
  ```
  ต้องแก้เป็น `{{ $json.reply }}` หรือ `{ "reply": "{{ $json.reply }}" }`

## ตัวอย่าง Workflow Structure

### แบบง่าย (Simple):
```
[Webhook] → [JavaScript/Code] → [Respond to Webhook]
```

### แบบมี AI/API:
```
[Webhook] → [Function/Code] → [AI/HTTP Request] → [Respond to Webhook]
```

### ⚠️ หมายเหตุสำคัญ:
- **ต้องมี Respond to Webhook node เป็น node สุดท้าย**
- **ถ้าไม่มี Respond to Webhook, chat interface จะไม่ได้รับ response**

## ตัวอย่าง Response Formats

n8n สามารถส่ง response กลับมาในรูปแบบต่างๆ:

### 1. JSON Object (response)
```json
{
  "response": "สวัสดีครับ! มีอะไรให้ช่วยไหมครับ?"
}
```

### 1.1. JSON Object (reply) - รองรับทั้งสองแบบ
```json
{
  "reply": "สวัสดีครับ! มีอะไรให้ช่วยไหมครับ?"
}
```

### 2. JSON Object with message
```json
{
  "message": "สวัสดีครับ! มีอะไรให้ช่วยไหมครับ?"
}
```

### 3. String
```
สวัสดีครับ! มีอะไรให้ช่วยไหมครับ?
```

### 4. Array
```json
[
  {
    "text": "สวัสดีครับ!",
    "type": "greeting"
  }
]
```

## ข้อมูลที่ Webhook จะได้รับ

เมื่อ chat interface ส่งข้อมูลมา n8n จะได้รับ:

```json
{
  "text": "ข้อความที่ผู้ใช้พิมพ์",
  "session_id": "u_001"
}
```

คุณสามารถเข้าถึงข้อมูลนี้ใน n8n ได้ผ่าน:
- `{{ $json.text }}` - ข้อความ
- `{{ $json.session_id }}` - Session ID

## ⚠️ การตั้งค่า Fields to Set ที่ถูกต้อง

ใน Webhook node หรือ node อื่นๆ ที่ต้องการดึงข้อมูล:

### ✅ ถูกต้อง:
- **Field Name**: `text`
- **Type**: `String`
- **Value**: `{{ $json.text }}`

- **Field Name**: `session_id`
- **Type**: `String`
- **Value**: `{{ $json.session_id }}`

### ❌ ผิดพลาด:
- `text: {{ $json }}` → จะได้ทั้ง JSON object เป็น string `'{"text":"Hello","session_id":"u_001"}'`
- `session_id: {{ $ }}` → Error: invalid syntax

### 📝 หมายเหตุ:
- `{{ $json }}` = ทั้ง JSON object
- `{{ $json.text }}` = เฉพาะ property `text`
- `{{ $json.session_id }}` = เฉพาะ property `session_id`

## ตัวอย่าง Workflow ที่สมบูรณ์

### Simple Echo Workflow
1. **Webhook Node**
   - Path: `/webhook-test/plak`
   - Method: `POST`

2. **Respond to Webhook Node**
   - Response Body: `{{ $json.text }}` (echo ข้อความกลับ)

### AI Chat Workflow
1. **Webhook Node**
   - Path: `/webhook-test/plak`
   - Method: `POST`

2. **HTTP Request Node** (เรียก AI API)
   - Method: `POST`
   - URL: `https://api.openai.com/v1/chat/completions`
   - Body: 
     ```json
     {
       "model": "gpt-3.5-turbo",
       "messages": [
         {
           "role": "user",
           "content": "{{ $json.text }}"
         }
       ]
     }
     ```

3. **Function Node** (ประมวลผล response)
   ```javascript
   return {
     json: {
       response: $input.item.json.choices[0].message.content
     }
   };
   ```

4. **Respond to Webhook Node**
   - Response Body: `{{ $json.response }}`

## หมายเหตุสำคัญ

1. **ต้อง Activate Workflow** - เปิดสวิตช์ที่มุมบนขวาของ workflow
2. **Webhook URL** - ตรวจสอบให้แน่ใจว่า URL ตรงกับที่ตั้งค่าใน `server.js`
3. **Response Format** - Chat interface จะพยายามดึง response จากหลายรูปแบบ
4. **Error Handling** - ถ้า workflow มี error, n8n จะส่ง error response กลับมา

## การทดสอบ

1. เปิด n8n ที่ http://localhost:5678
2. สร้าง workflow ตามตัวอย่างข้างต้น
3. Activate workflow
4. ทดสอบจาก chat interface ที่ http://localhost

## Troubleshooting

### ไม่ได้รับ response
- ตรวจสอบว่า workflow ถูก activate แล้ว
- ตรวจสอบว่า Respond to Webhook node ถูกตั้งค่าถูกต้อง
- ดู logs ใน n8n execution history

### ได้ error response
- ตรวจสอบว่า webhook path ถูกต้อง
- ตรวจสอบว่า fields (text, session_id) ถูกส่งมาถูกต้อง
- ดู error details ใน n8n execution history

