const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// n8n webhook URL - เปลี่ยนเป็น URL ของ n8n webhook ของคุณ
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8n.premium.co.th/webhook-test/plak';

// Middleware
app.use(cors());
app.use(express.json());
// ไม่ serve static files แล้ว เพราะใช้ Nginx แทน

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
        // n8n อาจจะส่ง response กลับมาในรูปแบบต่างๆ ขึ้นอยู่กับการตั้งค่า workflow
        let responseText = '';
        
        if (typeof n8nResponse.data === 'string') {
            responseText = n8nResponse.data;
        } else if (n8nResponse.data && n8nResponse.data.response) {
            responseText = n8nResponse.data.response;
        } else if (n8nResponse.data && n8nResponse.data.reply) {
            // รองรับ reply field ที่ n8n ส่งมา
            responseText = n8nResponse.data.reply;
        } else if (n8nResponse.data && n8nResponse.data.message) {
            responseText = n8nResponse.data.message;
        } else if (n8nResponse.data && Array.isArray(n8nResponse.data) && n8nResponse.data.length > 0) {
            // ถ้า n8n ส่ง array กลับมา และ array มี reply field
            const firstItem = n8nResponse.data[0];
            if (firstItem && firstItem.reply) {
                responseText = firstItem.reply;
            } else if (firstItem && firstItem.response) {
                responseText = firstItem.response;
            } else {
                responseText = JSON.stringify(n8nResponse.data, null, 2);
            }
        } else {
            responseText = JSON.stringify(n8nResponse.data);
        }

        console.log('n8n response:', responseText);

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
            return res.status(error.response.status || 500).json({ 
                error: `n8n returned error: ${error.response.status} - ${JSON.stringify(error.response.data)}` 
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

