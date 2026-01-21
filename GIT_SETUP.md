# คู่มือการติดตั้งและเชื่อมต่อ Git

## 📋 ขั้นตอนการติดตั้ง Git

### 1. ดาวน์โหลด Git

**Windows:**
- ไปที่: https://git-scm.com/download/win
- ดาวน์โหลด Git for Windows
- ติดตั้งตามขั้นตอน (แนะนำให้เลือก "Add Git to PATH")

**ตรวจสอบการติดตั้ง:**
```powershell
git --version
```

---

## 🔧 ขั้นตอนการเชื่อมต่อ Git Repository

### วิธีที่ 1: สร้าง Repository ใหม่ (Local)

#### 1. Initialize Git Repository

```powershell
cd C:\Users\thewi\Desktop\n8n\n8n
git init
```

#### 2. เพิ่มไฟล์ทั้งหมด

```powershell
git add .
```

#### 3. Commit ครั้งแรก

```powershell
git commit -m "Initial commit: n8n chat interface with message parser"
```

---

### วิธีที่ 2: เชื่อมต่อกับ GitHub/GitLab (Remote Repository)

#### 1. สร้าง Repository บน GitHub/GitLab

- ไปที่ GitHub: https://github.com/new
- หรือ GitLab: https://gitlab.com/projects/new
- สร้าง repository ใหม่ (ตั้งชื่อ เช่น `n8n-chat-interface`)

#### 2. Initialize และเชื่อมต่อ

```powershell
# ไปที่โฟลเดอร์โปรเจกต์
cd C:\Users\thewi\Desktop\n8n\n8n

# Initialize Git (ถ้ายังไม่ได้ทำ)
git init

# เพิ่มไฟล์ทั้งหมด
git add .

# Commit ครั้งแรก
git commit -m "Initial commit: n8n chat interface with message parser"

# เพิ่ม Remote Repository
# สำหรับ GitHub:
git remote add origin https://github.com/YOUR_USERNAME/n8n-chat-interface.git

# หรือสำหรับ GitLab:
# git remote add origin https://gitlab.com/YOUR_USERNAME/n8n-chat-interface.git

# ตั้งค่า branch เป็น main
git branch -M main

# Push ไปยัง Remote
git push -u origin main
```

---

## 🔐 การตั้งค่า Authentication

### สำหรับ HTTPS (แนะนำสำหรับผู้เริ่มต้น)

#### GitHub:
1. ไปที่: https://github.com/settings/tokens
2. สร้าง Personal Access Token (Classic)
3. เลือก scopes: `repo` (full control)
4. Copy token
5. เมื่อ push จะถาม username และ password:
   - Username: GitHub username ของคุณ
   - Password: ใช้ Personal Access Token (ไม่ใช่ password จริง)

#### GitLab:
1. ไปที่: https://gitlab.com/-/user_settings/personal_access_tokens
2. สร้าง Personal Access Token
3. เลือก scopes: `write_repository`
4. Copy token
5. ใช้ token แทน password เมื่อ push

---

### สำหรับ SSH (แนะนำสำหรับผู้ใช้ขั้นสูง)

#### 1. สร้าง SSH Key

```powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
```

#### 2. เพิ่ม SSH Key ไปยัง GitHub/GitLab

**GitHub:**
- Copy public key: `cat ~/.ssh/id_ed25519.pub`
- ไปที่: https://github.com/settings/keys
- เพิ่ม SSH Key

**GitLab:**
- Copy public key: `cat ~/.ssh/id_ed25519.pub`
- ไปที่: https://gitlab.com/-/profile/keys
- เพิ่ม SSH Key

#### 3. เปลี่ยน Remote URL เป็น SSH

```powershell
# GitHub
git remote set-url origin git@github.com:YOUR_USERNAME/n8n-chat-interface.git

# GitLab
git remote set-url origin git@gitlab.com:YOUR_USERNAME/n8n-chat-interface.git
```

---

## 📝 คำสั่ง Git ที่ใช้บ่อย

### การตรวจสอบสถานะ

```powershell
# ดูสถานะไฟล์
git status

# ดูประวัติ commit
git log

# ดู remote repository
git remote -v
```

### การเพิ่มและ Commit

```powershell
# เพิ่มไฟล์ทั้งหมด
git add .

# เพิ่มไฟล์เฉพาะ
git add filename.js

# Commit
git commit -m "Your commit message"

# Push ไปยัง Remote
git push
```

### การดึงข้อมูล

```powershell
# ดึงข้อมูลจาก Remote
git pull

# ดึงข้อมูลจาก Remote (ไม่ merge)
git fetch
```

### การจัดการ Branch

```powershell
# สร้าง branch ใหม่
git branch new-branch-name

# เปลี่ยน branch
git checkout branch-name

# สร้างและเปลี่ยน branch พร้อมกัน
git checkout -b new-branch-name

# ดู branch ทั้งหมด
git branch
```

---

## 🚫 ไฟล์ที่ถูก ignore (จาก .gitignore)

ไฟล์ต่อไปนี้จะไม่ถูก commit:

- `node_modules/` - Dependencies
- `.env` - Environment variables (ข้อมูลสำคัญ!)
- `*.log` - Log files
- `.DS_Store` - macOS system files
- `npm-debug.log` - npm debug logs

---

## ⚠️ สิ่งสำคัญ

### 1. อย่า Commit ข้อมูลสำคัญ

- `.env` file (มี API keys, database credentials)
- Database passwords
- Personal Access Tokens
- Private keys

### 2. ใช้ .env.example

สร้างไฟล์ `.env.example` เพื่อแสดงโครงสร้าง environment variables:

```env
# .env.example
N8N_WEBHOOK_URL=http://localhost:5678/webhook/xxx
PORT=3000
DATABASE_URL=your_database_url
```

### 3. Commit Message ที่ดี

ใช้ commit message ที่อธิบายการเปลี่ยนแปลง:

```powershell
# ❌ ไม่ดี
git commit -m "fix"

# ✅ ดี
git commit -m "Fix: WHERE Builder return object instead of array"

# ✅ ดีมาก
git commit -m "Fix: WHERE Builder return object for 'Run Once for Each Item' mode

- Changed return statement from array to object
- Fixes issue where SQL Query node cannot access where_clause
- Updated documentation in WHERE_BUILDER_MODE.md"
```

---

## 🔄 Workflow แนะนำ

### 1. ก่อนเริ่มทำงาน

```powershell
git pull
```

### 2. ระหว่างทำงาน

```powershell
# ตรวจสอบสถานะ
git status

# เพิ่มไฟล์ที่แก้ไข
git add .

# Commit
git commit -m "Description of changes"

# Push
git push
```

### 3. สร้าง Branch สำหรับ Feature ใหม่

```powershell
# สร้าง branch ใหม่
git checkout -b feature/new-feature

# ทำงานใน branch นี้
# ... make changes ...

# Commit และ Push
git add .
git commit -m "Add new feature"
git push -u origin feature/new-feature

# กลับไป main branch
git checkout main
```

---

## 📚 ทรัพยากรเพิ่มเติม

- **Git Documentation:** https://git-scm.com/doc
- **GitHub Guides:** https://guides.github.com/
- **GitLab Documentation:** https://docs.gitlab.com/
- **Git Cheat Sheet:** https://education.github.com/git-cheat-sheet-education.pdf

---

## 🆘 แก้ไขปัญหา

### ปัญหา: "git is not recognized"

**แก้ไข:**
1. ติดตั้ง Git for Windows
2. ตรวจสอบว่า Git อยู่ใน PATH
3. Restart PowerShell/Terminal

### ปัญหา: "Permission denied (publickey)"

**แก้ไข:**
1. ตรวจสอบว่า SSH key ถูกเพิ่มไปยัง GitHub/GitLab แล้ว
2. ใช้ HTTPS แทน SSH (ถ้ายังไม่สะดวก)

### ปัญหา: "Failed to push some refs"

**แก้ไข:**
```powershell
# ดึงข้อมูลจาก Remote ก่อน
git pull --rebase

# แล้ว push อีกครั้ง
git push
```

---

## ✅ Checklist

- [ ] ติดตั้ง Git
- [ ] ตั้งค่า Git config (name, email)
- [ ] Initialize repository (`git init`)
- [ ] สร้าง `.env.example` (ถ้ายังไม่มี)
- [ ] Commit ครั้งแรก
- [ ] สร้าง Remote repository (GitHub/GitLab)
- [ ] เชื่อมต่อ Remote (`git remote add origin`)
- [ ] Push ครั้งแรก (`git push -u origin main`)

---

## 📝 ตัวอย่างการตั้งค่า Git Config

```powershell
# ตั้งค่า username
git config --global user.name "Your Name"

# ตั้งค่า email
git config --global user.email "your.email@example.com"

# ตรวจสอบการตั้งค่า
git config --list
```
