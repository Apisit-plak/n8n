const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// n8n webhook URL - เปลี่ยนเป็น URL ของ n8n webhook ของคุณ
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8n.premium.co.th/webhook/invoice';

// Middleware
app.use(cors({
    origin: '*', // หรือระบุ origin ที่เฉพาะเจาะจง
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static files (index.html)
app.use(express.static(path.join(__dirname)));

// Handle OPTIONS preflight requests
app.options('/api/chat', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
});

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Chat API endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'กรุณาส่งข้อความมา' });
        }

        console.log('Received message:', message);

        // Generate or get session ID (ใช้ session ID เดิมหรือสร้างใหม่)
        // สามารถส่ง session_id จาก frontend หรือใช้ค่าคงที่
        const sessionId = req.body.session_id || 'u_001';

        // Send message to n8n webhook ในรูปแบบที่ n8n ต้องการ
        // n8n ต้องการ: text และ session_id
        const n8nResponse = await axios.post(N8N_WEBHOOK_URL, {
            text: message,  // เปลี่ยนจาก message เป็น text
            session_id: sessionId  // เพิ่ม session_id
        }, {
            timeout: 30000, // 30 seconds timeout
            headers: {
                'Content-Type': 'application/json'
            },
            // สำหรับ HTTPS ที่อาจมีปัญหา SSL certificate
            httpsAgent: new https.Agent({
                rejectUnauthorized: false // ใช้เฉพาะถ้า certificate มีปัญหา
            })
        });

        // Extract response from n8n
        // n8n ส่ง response กลับมาเป็น { "reply": "..." } จาก Respond to Webhook node
        let responseText = '';
        
        console.log('Raw n8n response data:', JSON.stringify(n8nResponse.data, null, 2));
        
        // ตรวจสอบ reply field ก่อน (เพราะ n8n ใช้ {{ $json.reply }} ใน Respond to Webhook)
        if (n8nResponse.data && typeof n8nResponse.data === 'object') {
            if (n8nResponse.data.reply !== undefined && n8nResponse.data.reply !== null) {
                const replyValue = String(n8nResponse.data.reply);
                
                // ตรวจสอบว่า n8n ส่ง expression string กลับมาแทนค่าจริง (ไม่ได้ evaluate)
                if (replyValue.trim() === '{{ $json.reply }}' || replyValue.includes('{{ $json')) {
                    console.warn('⚠️ n8n ส่ง expression string กลับมา แสดงว่า expression ไม่ได้ถูก evaluate');
                    return res.status(500).json({ 
                        error: 'n8n workflow ยังไม่ได้ evaluate expression\n\n' +
                               'วิธีแก้ไข:\n' +
                               '1. เปิด "Respond to Webhook" node ใน n8n\n' +
                               '2. ตรวจสอบว่า Response Body ใช้ expression mode (คลิกที่ไอคอน = หรือ {{ }})\n' +
                               '3. ใช้ expression: {{ $json.reply }} (ไม่ใช่ string literal)\n' +
                               '4. หรือใช้: {{ $json.reply }} ใน Expression Editor\n\n' +
                               'หมายเหตุ: ถ้าเห็น "{{ $json.reply }}" เป็นข้อความ แสดงว่าไม่ได้ evaluate'
                    });
                }
                
                // n8n ส่งมาเป็น { "reply": "ข้อความ..." } ที่ถูกต้อง
                responseText = replyValue;
            } else if (Array.isArray(n8nResponse.data) && n8nResponse.data.length > 0) {
                // ถ้า n8n ส่ง array กลับมา
                const firstItem = n8nResponse.data[0];
                if (firstItem && typeof firstItem === 'object' && firstItem.reply !== undefined) {
                    responseText = String(firstItem.reply);
                } else {
                    responseText = JSON.stringify(n8nResponse.data, null, 2);
                }
            } else if (n8nResponse.data.response !== undefined) {
                responseText = String(n8nResponse.data.response);
            } else if (n8nResponse.data.message !== undefined) {
                responseText = String(n8nResponse.data.message);
            } else if (typeof n8nResponse.data === 'string') {
                responseText = n8nResponse.data;
            } else {
                responseText = JSON.stringify(n8nResponse.data, null, 2);
            }
        } else if (typeof n8nResponse.data === 'string') {
            responseText = n8nResponse.data;
        } else {
            responseText = JSON.stringify(n8nResponse.data);
        }

        console.log('Extracted response text:', responseText);

        res.json({ 
            response: responseText,
            success: true 
        });

    } catch (error) {
        console.error('Error communicating with n8n:', error.message);
        console.error('Error details:', {
            code: error.code,
            response: error.response?.data,
            status: error.response?.status,
            url: N8N_WEBHOOK_URL
        });
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: 'ไม่สามารถเชื่อมต่อกับ n8n ได้ กรุณาตรวจสอบว่า n8n ทำงานอยู่และ URL ถูกต้อง' 
            });
        }
        
        if (error.code === 'ETIMEDOUT') {
            return res.status(504).json({ 
                error: 'n8n ใช้เวลาตอบสนองนานเกินไป' 
            });
        }

        if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'CERT_HAS_EXPIRED' || error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
            return res.status(500).json({ 
                error: 'ปัญหา SSL Certificate: ' + error.message 
            });
        }

        // ถ้ามี response จาก n8n แต่มี error
        if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data;
            
            // จัดการ error แต่ละประเภท
            if (status === 404 && errorData?.message?.includes('webhook') && errorData?.message?.includes('not registered')) {
                // Webhook ไม่ได้ activate หรือ workflow ไม่ได้เปิด
                return res.status(503).json({ 
                    error: '⚠️ ระบบกำลังปรับปรุง กรุณาลองใหม่อีกครั้งในอีกสักครู่\n\n' +
                           '💡 หรือติดต่อผู้ดูแลระบบ'
                });
            }
            
            if (status === 500) {
                // n8n internal error
                return res.status(500).json({ 
                    error: '⚠️ เกิดข้อผิดพลาดในระบบ\n\n' +
                           'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ'
                });
            }
            
            // Error อื่นๆ - แสดงข้อความทั่วไป
            return res.status(status || 500).json({ 
                error: '⚠️ เกิดข้อผิดพลาดในการประมวลผล\n\n' +
                       'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ'
            });
        }

        res.status(500).json({ 
            error: 'เกิดข้อผิดพลาดในการสื่อสารกับ n8n: ' + error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 n8n webhook URL: ${N8N_WEBHOOK_URL}`);
    console.log(`\n💡 หมายเหตุ: ตรวจสอบให้แน่ใจว่า N8N_WEBHOOK_URL ถูกต้อง`);
});

