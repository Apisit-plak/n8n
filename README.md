# Chat Interface สำหรับ n8n

แอปพลิเคชันแชทที่รับข้อความจากผู้ใช้ ส่งไปที่ n8n และแสดงผลตอบกลับ

## คุณสมบัติ

- 💬 หน้าจอแชทที่สวยงามและใช้งานง่าย
- 🔄 ส่งข้อความไปที่ n8n webhook
- 📨 รับและแสดงผลตอบกลับจาก n8n
- ⚡ Real-time messaging
- 🎨 UI ที่ทันสมัยและ responsive
- 🌐 ใช้ Nginx เป็น reverse proxy และ serve static files

## การติดตั้ง

### วิธีที่ 1: ใช้ Docker Compose (แนะนำ)

วิธีที่ง่ายที่สุดคือใช้ Docker Compose ซึ่งจะรันทั้ง n8n และ chat server ให้อัตโนมัติ:

1. ตรวจสอบว่ามี Docker และ Docker Compose ติดตั้งแล้ว:
```bash
docker --version
docker-compose --version
```

2. เริ่มต้นระบบทั้งหมด:
```bash
docker-compose up -d
```

3. รอให้ containers เริ่มทำงาน (ประมาณ 30-60 วินาที)

4. เปิดเบราว์เซอร์ไปที่:
   - **Chat Interface**: http://localhost (หรือ http://localhost:80)
     - หน้าเว็บจะถูก serve โดย Nginx
   - **n8n Interface**: http://localhost:5678
     - Username: `admin`
     - Password: `admin`

5. ดู logs:
```bash
docker-compose logs -f
```

6. หยุดระบบ:
```bash
docker-compose down
```

7. หยุดและลบ volumes (ลบข้อมูล n8n):
```bash
docker-compose down -v
```

### วิธีที่ 2: ติดตั้งแบบปกติ

1. ติดตั้ง dependencies:
```bash
npm install
```

2. ตั้งค่า n8n webhook URL:
   - เปิดไฟล์ `server.js`
   - แก้ไข `N8N_WEBHOOK_URL` ให้เป็น URL ของ n8n webhook ของคุณ
   - หรือตั้งค่าผ่าน environment variable:
   ```bash
   set N8N_WEBHOOK_URL=http://localhost:5678/webhook/your-webhook-id
   ```

3. เริ่มต้นเซิร์ฟเวอร์:
```bash
npm start
```

หรือใช้ nodemon สำหรับ development:
```bash
npm run dev
```

4. เปิดเบราว์เซอร์ไปที่:
```
http://localhost:3000
```

## การตั้งค่า n8n Workflow

ดูรายละเอียดเพิ่มเติมใน [N8N_SETUP.md](N8N_SETUP.md)

### ขั้นตอนพื้นฐาน:

1. สร้าง workflow ใหม่ใน n8n
2. เพิ่ม **Webhook** node เป็น trigger
   - HTTP Method: `POST`
   - Path: `/webhook-test/plak` (หรือ path ที่คุณต้องการ)
   - Fields to Set:
     - `text` (String) - รับข้อความจากผู้ใช้
     - `session_id` (String) - รับ session ID
3. เพิ่ม nodes อื่นๆ ตามต้องการ (เช่น Function, AI, HTTP Request, etc.)
4. เพิ่ม **Respond to Webhook** node เพื่อส่ง response กลับ
   - Response Body: 
     ```json
     {
       "response": "คำตอบของคุณ"
     }
     ```
   หรือส่งเป็น string ก็ได้
5. **Activate** workflow (เปิดสวิตช์ที่มุมบนขวา)
6. ตรวจสอบว่า webhook URL ตรงกับที่ตั้งค่าใน `server.js`

## ตัวอย่าง n8n Workflow Response

n8n สามารถส่ง response กลับมาในรูปแบบต่างๆ:

- **String**: `"Hello from n8n"`
- **Object**: `{ "response": "Hello from n8n" }`
- **Object with message**: `{ "message": "Hello from n8n" }`
- **Array**: `[{ "text": "Hello" }]`

แอปจะพยายามดึงข้อมูลจาก response หลายรูปแบบ

## Environment Variables

### Chat Server
- `PORT`: Port สำหรับเซิร์ฟเวอร์ (default: 3000)
- `N8N_WEBHOOK_URL`: URL ของ n8n webhook (default: http://n8n:5678/webhook/chat)

### n8n (ใน Docker Compose)
- `N8N_BASIC_AUTH_USER`: Username สำหรับ n8n (default: admin)
- `N8N_BASIC_AUTH_PASSWORD`: Password สำหรับ n8n (default: admin)
- `WEBHOOK_URL`: Base URL สำหรับ webhooks

**หมายเหตุ**: 
- เมื่อใช้ Docker Compose, chat server จะเชื่อมต่อกับ n8n ผ่าน internal network (`http://n8n:5678`) ไม่ใช่ `localhost`
- หน้าเว็บจะถูก serve โดย Nginx ที่ port 80 (http://localhost)
- API requests จะถูก proxy ผ่าน Nginx ไปที่ chat-server
- n8n workflows จะถูกเก็บใน Docker volume `n8n_data`

## โครงสร้างไฟล์

```
.
├── index.html                      # หน้าแชท UI
├── server.js                       # Express server (API only)
├── package.json                    # Dependencies
├── nginx.conf                      # Nginx configuration
├── Dockerfile                      # Docker image สำหรับ chat server
├── docker-compose.yml              # Docker Compose configuration
├── docker-compose.override.yml.example  # ตัวอย่าง override config
├── .dockerignore                   # Docker ignore file
└── README.md                       # เอกสารนี้
```

## การแก้ไขปัญหา

### Docker Compose

#### Containers ไม่เริ่มทำงาน
```bash
# ตรวจสอบสถานะ containers
docker-compose ps

# ดู logs
docker-compose logs

# ดู logs ของ service เฉพาะ
docker-compose logs chat-server
docker-compose logs n8n
```

#### เปลี่ยน username/password ของ n8n
สร้างไฟล์ `docker-compose.override.yml` (คัดลอกจาก `docker-compose.override.yml.example`) และแก้ไขค่า:
```yaml
services:
  n8n:
    environment:
      - N8N_BASIC_AUTH_USER=your_username
      - N8N_BASIC_AUTH_PASSWORD=your_password
```

#### เปลี่ยน webhook URL
แก้ไขใน `docker-compose.override.yml`:
```yaml
services:
  chat-server:
    environment:
      - N8N_WEBHOOK_URL=http://n8n:5678/webhook/your-custom-path
```

### ทั่วไป

#### ไม่สามารถเชื่อมต่อกับ n8n ได้
- ตรวจสอบว่า n8n ทำงานอยู่: `docker-compose ps`
- ตรวจสอบว่า webhook URL ถูกต้อง
- ตรวจสอบว่า n8n workflow ถูก activate แล้ว
- ดู logs: `docker-compose logs n8n`

#### ไม่ได้รับ response จาก n8n
- ตรวจสอบว่า n8n workflow ทำงานถูกต้อง
- ตรวจสอบว่า workflow ส่ง response กลับมา
- ดู console log: `docker-compose logs chat-server`
- ตรวจสอบ webhook path ใน n8n workflow ว่าตรงกับ `N8N_WEBHOOK_URL` หรือไม่

#### Port ถูกใช้งานแล้ว
```bash
# เปลี่ยน port ใน docker-compose.yml
services:
  chat-server:
    ports:
      - "3001:3000"  # เปลี่ยน 3000 เป็น 3001
```

## License

MIT

