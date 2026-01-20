# 🚀 Quick Start Guide

## เริ่มต้นใช้งานด้วย Docker Compose

### ขั้นตอนที่ 1: เริ่มต้นระบบ

```bash
docker-compose up -d
```

คำสั่งนี้จะ:
- ดาวน์โหลดและรัน n8n container
- Build และรัน chat server container
- สร้าง network และ volumes ที่จำเป็น

### ขั้นตอนที่ 2: รอให้ระบบพร้อม

รอประมาณ 30-60 วินาที เพื่อให้ containers เริ่มทำงาน

ตรวจสอบสถานะ:
```bash
docker-compose ps
```

ดู logs:
```bash
docker-compose logs -f
```

### ขั้นตอนที่ 3: เข้าถึงแอปพลิเคชัน

- **Chat Interface**: http://localhost (หรือ http://localhost:80)
  - หน้าเว็บจะถูก serve โดย Nginx
- **n8n Interface**: http://localhost:5678
  - Username: `admin`
  - Password: `admin`

### ขั้นตอนที่ 4: สร้าง n8n Workflow

1. เปิด n8n ที่ http://localhost:5678
2. สร้าง workflow ใหม่
3. เพิ่ม **Webhook** node:
   - Method: `POST`
   - Path: `/webhook/chat` (หรือ path ที่คุณต้องการ)
   - Response Mode: `Last Node`
4. เพิ่ม nodes อื่นๆ ตามต้องการ (เช่น Function, HTTP Request, AI, etc.)
5. เพิ่ม **Respond to Webhook** node หรือส่ง response กลับในรูปแบบ:
   ```json
   {
     "response": "คำตอบของคุณ"
   }
   ```
6. **Activate** workflow (เปิดสวิตช์ที่มุมบนขวา)

### ขั้นตอนที่ 5: ทดสอบ

1. เปิด Chat Interface ที่ http://localhost
2. พิมพ์ข้อความและส่ง
3. ดู response จาก n8n

## คำสั่งที่มีประโยชน์

### ดู logs
```bash
# ทั้งหมด
docker-compose logs -f

# เฉพาะ chat-server
docker-compose logs -f chat-server

# เฉพาะ nginx
docker-compose logs -f nginx

# เฉพาะ n8n
docker-compose logs -f n8n
```

### หยุดระบบ
```bash
docker-compose down
```

### หยุดและลบข้อมูลทั้งหมด (รวม n8n workflows)
```bash
docker-compose down -v
```

### รีสตาร์ท containers
```bash
docker-compose restart
```

### Rebuild chat-server (หลังจากแก้ไข code)
```bash
docker-compose up -d --build chat-server
```

### ตรวจสอบสถานะ
```bash
docker-compose ps
```

## การแก้ไขปัญหา

### Port ถูกใช้งานแล้ว

แก้ไข `docker-compose.yml`:
```yaml
services:
  nginx:
    ports:
      - "8080:80"  # เปลี่ยนเป็น port อื่น (เช่น 8080)
```

### เปลี่ยน webhook path

1. แก้ไขใน n8n workflow (webhook path)
2. สร้างไฟล์ `docker-compose.override.yml`:
```yaml
services:
  chat-server:
    environment:
      - N8N_WEBHOOK_URL=http://n8n:5678/webhook/your-path
```

### เปลี่ยน username/password ของ n8n

สร้างไฟล์ `docker-compose.override.yml`:
```yaml
services:
  n8n:
    environment:
      - N8N_BASIC_AUTH_USER=your_username
      - N8N_BASIC_AUTH_PASSWORD=your_password
```

## หมายเหตุสำคัญ

- เมื่อใช้ Docker Compose, chat server จะเชื่อมต่อกับ n8n ผ่าน internal network (`http://n8n:5678`) ไม่ใช่ `localhost`
- n8n workflows จะถูกเก็บใน Docker volume `n8n_data`
- ข้อมูล workflows จะไม่หายเมื่อ restart containers แต่จะหายเมื่อใช้ `docker-compose down -v`

