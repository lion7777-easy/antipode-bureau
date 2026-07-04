// ============================================================
// 对跖点漫游局 - 后端服务器（图片直接存储于 cities 表）
// ============================================================
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const https = require('https');  

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'data', 'antipode.db');

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

function getDB() {
    return new sqlite3.Database(DB_PATH);
}

// ===== 数据库迁移：增加图片字段 =====
function migrate() {
    const db = getDB();
    db.all("PRAGMA table_info(cities)", (err, rows) => {
        if (err) { console.error('❌ 检查表结构失败:', err.message); db.close(); return; }
        const cols = rows.map(r => r.name);
        const additions = [];
        if (!cols.includes('antipode_name_en')) {
            additions.push("ALTER TABLE cities ADD COLUMN antipode_name_en TEXT");
        }
        if (!cols.includes('origin_image')) {
            additions.push("ALTER TABLE cities ADD COLUMN origin_image TEXT");
        }
        if (!cols.includes('antipode_image')) {
            additions.push("ALTER TABLE cities ADD COLUMN antipode_image TEXT");
        }
        if (additions.length === 0) {
            console.log('ℹ️ 所有必需字段已存在');
            db.close();
            return;
        }
        additions.forEach(sql => {
            db.run(sql, err2 => {
                if (err2) console.error('❌ 添加列失败:', err2.message);
                else console.log('✅ 列添加成功:', sql);
            });
        });
        db.close();
    });
}

// ===== API =====
app.get('/api/cities', (req, res) => {
    const db = getDB();
    db.all(`SELECT * FROM cities WHERE is_active = 1 ORDER BY name_cn`, (err, rows) => {
        db.close();
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

app.get('/api/cities/:id', (req, res) => {
    const db = getDB();
    const query = `
        SELECT c.*, c.poem_en,
       g.id as gift_id, g.name_cn as gift_name, g.name_en as gift_name_en,
       g.description as gift_description, g.description_en as gift_description_en,
       g.image_ripe as gift_image_ripe, g.image_green as gift_image_green,
       g.poem_ripe as gift_poem_ripe, g.poem_green as gift_poem_green,
       g.poem_ripe_en as gift_poem_ripe_en, g.poem_green_en as gift_poem_green_en,
       g.has_green as gift_has_green,
       g.trigger_type as gift_trigger_type
        FROM cities c
        LEFT JOIN city_gifts cg ON c.id = cg.city_id
        LEFT JOIN gifts g ON cg.gift_id = g.id
        WHERE c.id = ?
    `;
    db.get(query, [req.params.id], (err, row) => {
        db.close();
        if (err) res.status(500).json({ error: err.message });
        else if (!row) res.status(404).json({ error: '城市不存在' });
        else res.json(row);
    });
});


// ===== 搜索接口 =====
app.get('/api/search', (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    const db = getDB();
    const query = `
        SELECT c.*, c.poem_en,
       g.id as gift_id, g.name_cn as gift_name, g.name_en as gift_name_en,
       g.description as gift_description, g.description_en as gift_description_en,
       g.image_ripe as gift_image_ripe, g.image_green as gift_image_green,
       g.poem_ripe as gift_poem_ripe, g.poem_green as gift_poem_green,
       g.poem_ripe_en as gift_poem_ripe_en, g.poem_green_en as gift_poem_green_en,
       g.has_green as gift_has_green,
       g.trigger_type as gift_trigger_type
        FROM cities c
        LEFT JOIN city_gifts cg ON c.id = cg.city_id
        LEFT JOIN gifts g ON cg.gift_id = g.id
        WHERE c.name_cn LIKE ? OR c.name_en LIKE ? OR c.antipode_name LIKE ?
        LIMIT 5
    `;
    const searchTerm = '%' + q + '%';
    db.all(query, [searchTerm, searchTerm, searchTerm], (err, rows) => {
        db.close();
        if (err) res.status(500).json({ error: err.message });
        else {
            if (rows.length > 0) {
                const logDb = getDB();
                logDb.run('INSERT INTO search_logs (city_name, city_id) VALUES (?, ?)',
                    [rows[0].name_cn, rows[0].id]);
                logDb.close();
            }
            res.json(rows);
        }
    });
});
app.get('/api/gifts', (req, res) => {
    const db = getDB();
    db.all('SELECT id, name_cn, name_en, description, description_en, country, category, image_ripe, image_green, poem_ripe, poem_ripe_en, poem_green, poem_green_en, has_green, trigger_type, ocean_region, is_active, created_at FROM gifts WHERE is_active = 1', (err, rows) => {
        db.close();
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});
app.get('/api/ranking', (req, res) => {
    const db = getDB();
    db.all(`
        SELECT city_name, COUNT(*) as count
        FROM search_logs
        WHERE city_name IS NOT NULL
        GROUP BY city_name ORDER BY count DESC LIMIT 10
    `, (err, rows) => {
        db.close();
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});
// ===== Cesium Token 接口 =====
const CESIUM_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4YmU1NTk4ZS0zN2ZjLTQ2YmMtYjdmYi1hMzJjY2Q2NzY0MzYiLCJpZCI6NDUwMjk2LCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODI3MjQ0ODZ9.9fmQKUr0rolilIYn51RTKvYODfV7-Jgj5itHFt1OoBk';

app.get('/api/cesium-token', (req, res) => {
    res.json({ token: CESIUM_TOKEN });
});
// ===== 搜索日志（不依赖数据库，所有搜索都记录） =====
app.post('/api/search-log', (req, res) => {
    const { city_name } = req.body;
    if (!city_name) return res.status(400).json({ error: '缺少城市名' });
    const db = getDB();
    db.run('INSERT INTO search_logs (city_name) VALUES (?)', [city_name], function(err) {
        db.close();
        if (err) res.status(500).json({ error: err.message });
        else res.json({ success: true });
    });
});
// ===== 移动端地理编码接口（高德代理） =====
app.get('/api/geocode', async (req, res) => {
const AMAP_KEY = 'd6846dea147b497922afd3f9b121b429';
    const { address } = req.query;
    if (!address) {
        return res.status(400).json({ success: false, error: '缺少 address 参数' });
    }

    try {
        const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${AMAP_KEY}`;
        const https = require('https');
        const response = await new Promise((resolve, reject) => {
            https.get(url, (resp) => {
                let data = '';
                resp.on('data', chunk => { data += chunk; });
                resp.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', (e) => {
                reject(e);
            });
        });

        if (response.status === '1' && response.geocodes && response.geocodes.length > 0) {
            const location = response.geocodes[0].location;
            const [lng, lat] = location.split(',').map(Number);
            return res.json({
                success: true,
                location: { lat, lng },
                formatted_address: response.geocodes[0].formatted_address
            });
        } else {
            return res.json({ success: false, error: '高德未找到该地址' });
        }
    } catch (error) {
        console.error('地理编码请求失败:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});
// ===== 静态地图代理接口（天地图官方正确版） =====
// ===== 在文件顶部添加 canvas 依赖（如果尚未安装） =====
// 需要先安装: npm install canvas
const { createCanvas, loadImage } = require('canvas');

app.get('/api/static-map', async (req, res) => {
    const { lng, lat, size = '270', zoom = '3', color = 'red' } = req.query;
    if (!lng || !lat) {
        return res.status(400).json({ error: '缺少经纬度参数' });
    }

    const https = require('https');
    const tk = '7da0bbd486e5a061e5329472bed5ba41';
    
    // 解析颜色（支持两种格式：#e8923a 或 0xE8923A）
    let markerColor = '#ff0000'; // 默认红色
    if (color) {
        let hex = color.replace('0x', '#');
        if (hex.startsWith('#')) {
            markerColor = hex;
        } else {
            markerColor = '#' + color;
        }
    }
    
    // 天地图静态图 URL（不加 markers，我们自己画）
    const tdtUrl = `https://api.tianditu.gov.cn/staticimage?center=${lng},${lat}&zoom=${zoom}&width=${size}&height=${size}&layer=img&tk=${tk}`;

    try {
        // 1. 获取天地图底图
        const imageBuffer = await new Promise((resolve, reject) => {
            https.get(tdtUrl, (tdtRes) => {
                const chunks = [];
                tdtRes.on('data', chunk => chunks.push(chunk));
                tdtRes.on('end', () => resolve(Buffer.concat(chunks)));
                tdtRes.on('error', reject);
            }).on('error', reject);
        });

        // 2. 用 canvas 加载图片
        const img = await loadImage(imageBuffer);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // 3. 计算标记位置（天地图静态图中心就是经纬度位置）
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

               // 4. 绘制水滴标记（使用自定义颜色，尖端朝下，尾部圆钝）
        const size_px = 28; // 标记大小
        
        // 绘制水滴形状
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.beginPath();
        // 水滴路径：尖端朝下（指向南方），尾部圆润（上方）
        ctx.moveTo(cx, cy + size_px * 0.8);                       // 尖端位置（下方）
        ctx.bezierCurveTo(
            cx + size_px * 0.5, cy + size_px * 0.2,               // 右下控制点
            cx + size_px * 0.6, cy - size_px * 0.1,               // 右上控制点
            cx + size_px * 0.3, cy - size_px * 0.5                // 上右控制点
        );
        ctx.bezierCurveTo(
            cx + size_px * 0.15, cy - size_px * 0.7,              // 顶部右侧
            cx - size_px * 0.15, cy - size_px * 0.7,              // 顶部左侧（对称）
            cx - size_px * 0.3, cy - size_px * 0.5                // 上左控制点
        );
        ctx.bezierCurveTo(
            cx - size_px * 0.6, cy - size_px * 0.1,               // 左上控制点
            cx - size_px * 0.5, cy + size_px * 0.2,               // 左下控制点
            cx, cy + size_px * 0.8                                // 回到尖端
        );
        ctx.closePath();
        
        // 填充颜色
        ctx.fillStyle = markerColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        // 高光点（移到上方圆润区域）
        ctx.beginPath();
        ctx.arc(cx - size_px * 0.2, cy - size_px * 0.3, size_px * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();
        
        ctx.restore();

        // 5. 输出图片
        res.setHeader('Content-Type', 'image/png');
        res.send(canvas.toBuffer('image/png'));

    } catch (err) {
        console.error('生成静态地图失败:', err.message);
        res.status(500).end();
    }
});
// ===== 逆地理编码代理接口（天地图 + 双重兜底） =====
app.get('/api/reverse-geocode', (req, res) => {
    const { lng, lat } = req.query;
    if (!lng || !lat) {
        return res.status(400).json({ error: '缺少经纬度参数' });
    }

    const https = require('https');
    const tk = '76b0999164f9285ceb1ff3a6ce53b5cd';
    // type=reverse 是逆地理编码（坐标转地址）
    const postStr = JSON.stringify({
        lon: parseFloat(lng),
        lat: parseFloat(lat),
        ver: 1
    });
    const tdtUrl = `https://api.tianditu.gov.cn/geocoder?type=reverse&postStr=${encodeURIComponent(postStr)}&tk=${tk}`;

    https.get(tdtUrl, (tdtRes) => {
        let data = '';
        tdtRes.on('data', chunk => { data += chunk; });
        tdtRes.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.status === '0' && json.result?.addressComponent) {
    const comp = json.result.addressComponent;
    // 中文名称：省 > 市 > 国家 > 岛屿
    let name = comp.province || comp.city || comp.country || comp.island || '';
    let nameEn = comp.province_en || comp.city_en || comp.country_en || comp.island_en || '';

    // 拼接完整名称：国家 + 省/市
    let fullName = comp.country || '';
    if (comp.province && comp.province !== comp.country) {
        fullName += comp.province;
    } else if (!comp.province && comp.city && comp.city !== comp.country) {
        fullName += comp.city;
    } else if (!comp.province && !comp.city && comp.country) {
        fullName = comp.country;
    }
    let fullNameEn = comp.country_en || '';
    if (comp.province_en && comp.province_en !== comp.country_en) {
        fullNameEn += ' ' + comp.province_en;
    } else if (!comp.province_en && comp.city_en && comp.city_en !== comp.country_en) {
        fullNameEn += ' ' + comp.city_en;
    } else if (!comp.province_en && !comp.city_en && comp.country_en) {
        fullNameEn = comp.country_en;
    }

    // ========== 新增：南美西海岸校验修正 ==========
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    // 判断坐标是否落在南美洲陆地范围内
    const isInSouthAmerica = latNum > -55 && latNum < 12 && lngNum > -82 && lngNum < -34;
    // 如果在南美陆地范围内，但API返回了海洋名称 → 强制用兜底修正
    if (isInSouthAmerica) {
        const oceanNames = ['太平洋', '大西洋', '印度洋', '北冰洋'];
        const isOceanResult = oceanNames.includes(fullName.trim());
        if (isOceanResult || !fullName || fullName === '未知') {
            const fallback = getApproximateName(latNum, lngNum);
            return res.json({ success: true, name: fallback.name, nameEn: fallback.nameEn });
        }
    }
    // =============================================

    if (!fullName || fullName === '未知') {
        const fallback = getApproximateName(latNum, lngNum);
        return res.json({ success: true, name: fallback.name, nameEn: fallback.nameEn });
    }
    return res.json({ success: true, name: fullName.trim(), nameEn: fullNameEn.trim() });
}
                const fallback = getApproximateName(parseFloat(lat), parseFloat(lng));
                res.json({ success: true, name: fallback.name, nameEn: fallback.nameEn });
            } catch (e) {
                console.error('逆地理编码解析失败:', e.message);
                const fallback = getApproximateName(parseFloat(lat), parseFloat(lng));
                res.json({ success: true, name: fallback.name, nameEn: fallback.nameEn });
            }
        });
    }).on('error', (err) => {
        console.error('逆地理编码请求失败:', err.message);
        const fallback = getApproximateName(parseFloat(lat), parseFloat(lng));
        res.json({ success: true, name: fallback.name, nameEn: fallback.nameEn });
    });
});
// ===== 拼音生成接口（后端调用pinyin库） =====
app.get('/api/get-pinyin', (req, res) => {
    const { text } = req.query;
    if (!text) return res.json({ success: false, pinyin: text });

    try {
        const pinyin = require('pinyin');
        const result = pinyin(text, {
            style: pinyin.STYLE_NORMAL,
            separator: ''
        });
        // 首字母大写格式：xi chong → Xichong
        const pinyinStr = result
            .map(item => item[0].charAt(0).toUpperCase() + item[0].slice(1).toLowerCase())
            .join('');
        res.json({ success: true, pinyin: pinyinStr });
    } catch (e) {
        console.error('拼音生成失败:', e.message);
        res.json({ success: false, pinyin: text });
    }
});
// ===== 图片上传 =====
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '没有上传文件' });
    }
    res.json({ success: true, imagePath: '/uploads/' + req.file.filename });
});

// ===== 物产列表接口（按类型筛选） =====
app.get('/api/gifts/by-type', (req, res) => {
    const { type, ocean_region, country } = req.query;
    if (!type) {
        return res.status(400).json({ error: '缺少 type 参数' });
    }
    const db = getDB();
    let sql = 'SELECT * FROM gifts WHERE trigger_type = ? AND is_active = 1';
    const params = [type];
    
    // 陆地物产按国家筛选
    if (country) {
        sql += ' AND country = ?';
        params.push(country);
    }
    // 海洋物产按区域筛选
    if (ocean_region) {
        sql += ' AND (ocean_region = ? OR ocean_region = "both")';
        params.push(ocean_region);
    }
    
    db.all(sql, params, (err, rows) => {
        db.close();
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});
// ===== 管理后台 API =====
app.post('/api/admin/cities', (req, res) => {
    const { 
        name_cn, name_en, lat, lng, 
        antipode_name, antipode_name_en, 
        antipode_lat, antipode_lng, 
        category, precision_level, deviation_km, 
        poem, poem_en, 
        origin_image, antipode_image 
    } = req.body;
    const db = getDB();
    db.run(
        `INSERT INTO cities (
            name_cn, name_en, lat, lng, 
            antipode_name, antipode_name_en, 
            antipode_lat, antipode_lng, 
            category, precision_level, deviation_km, 
            poem, poem_en, 
            origin_image, antipode_image
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            name_cn, name_en, lat, lng, 
            antipode_name, antipode_name_en, 
            antipode_lat, antipode_lng, 
            category, precision_level, deviation_km, 
            poem, poem_en, 
            origin_image, antipode_image
        ],
        function(err) {
            db.close();
            if (err) {
                console.error('插入城市失败:', err.message);
                res.status(500).json({ error: '插入失败: ' + err.message });
            } else {
                res.json({ success: true, id: this.lastID });
            }
        }
    );
});

app.put('/api/admin/cities/:id', (req, res) => {
    const { name_cn, name_en, lat, lng, antipode_name, antipode_name_en,
            antipode_lat, antipode_lng, category, precision_level, deviation_km,
            poem, poem_en,origin_image, antipode_image } = req.body;
    const db = getDB();
    db.run(
   `UPDATE cities SET name_cn=?, name_en=?, lat=?, lng=?,
 antipode_name=?, antipode_name_en=?, antipode_lat=?, antipode_lng=?,
 category=?, precision_level=?, deviation_km=?, poem=?, poem_en=?,
 origin_image=?, antipode_image=?, updated_at=CURRENT_TIMESTAMP
 WHERE id=?`,
    [name_cn, name_en, lat, lng, antipode_name, antipode_name_en,
     antipode_lat, antipode_lng, category, precision_level, deviation_km,
     poem, poem_en, origin_image, antipode_image, req.params.id],
    function(err) {
            db.close();
            if (err) res.status(500).json({ error: err.message });
            else res.json({ success: true });
        }
    );
});

app.delete('/api/admin/cities/:id', (req, res) => {
    const db = getDB();
    db.run('DELETE FROM cities WHERE id=?', [req.params.id], function(err) {
        db.close();
        if (err) res.status(500).json({ error: err.message });
        else res.json({ success: true });
    });
});

// 物产管理（保持不变）
app.post('/api/admin/gifts', (req, res) => {
    const { name_cn, name_en, description, description_en, country, category, image_ripe, image_green, poem_ripe, poem_ripe_en, poem_green, poem_green_en, has_green, trigger_type, ocean_region } = req.body;
    const db = getDB();
    db.run(
        `INSERT INTO gifts (name_cn, name_en, description, description_en, country, category, image_ripe, image_green, poem_ripe, poem_ripe_en, poem_green, poem_green_en, has_green, trigger_type, ocean_region)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name_cn, name_en, description, description_en, country, category, image_ripe, image_green, poem_ripe, poem_ripe_en, poem_green, poem_green_en, has_green || 0, trigger_type || 'land', ocean_region || 'both'],
        function(err) {
            db.close();
            if (err) res.status(500).json({ error: err.message });
            else res.json({ success: true, id: this.lastID });
        }
    );
});

app.put('/api/admin/gifts/:id', (req, res) => {
    const { name_cn, name_en, description, description_en, country, category, image_ripe, image_green, poem_ripe, poem_ripe_en, poem_green, poem_green_en, has_green, trigger_type, ocean_region } = req.body;
    const db = getDB();
    db.run(
        `UPDATE gifts SET name_cn=?, name_en=?, description=?, description_en=?, country=?, category=?, image_ripe=?, image_green=?, poem_ripe=?, poem_ripe_en=?, poem_green=?, poem_green_en=?, has_green=?, trigger_type=?, ocean_region=?
         WHERE id=?`,
        [name_cn, name_en, description, description_en, country, category, image_ripe, image_green, poem_ripe, poem_ripe_en, poem_green, poem_green_en, has_green || 0, trigger_type || 'land', ocean_region || 'both', req.params.id],
        function(err) {
            db.close();
            if (err) res.status(500).json({ error: err.message });
            else res.json({ success: true });
        }
    );
});

app.delete('/api/admin/gifts/:id', (req, res) => {
    const db = getDB();
    db.run('DELETE FROM gifts WHERE id=?', [req.params.id], function(err) {
        db.close();
        if (err) res.status(500).json({ error: err.message });
        else res.json({ success: true });
    });
});

app.post('/api/admin/city-gifts', (req, res) => {
    const { city_id, gift_id } = req.body;
    const db = getDB();
    db.run('INSERT OR IGNORE INTO city_gifts (city_id, gift_id) VALUES (?, ?)',
        [city_id, gift_id], function(err) {
            db.close();
            if (err) res.status(500).json({ error: err.message });
            else res.json({ success: true });
        });
});

app.delete('/api/admin/city-gifts', (req, res) => {
    const { city_id, gift_id } = req.body;
    const db = getDB();
    db.run('DELETE FROM city_gifts WHERE city_id=? AND gift_id=?',
        [city_id, gift_id], function(err) {
            db.close();
            if (err) res.status(500).json({ error: err.message });
            else res.json({ success: true });
        });
});
// ===== 修正版：粗略大洲/海洋判断（兜底用，返回中英文） =====
function getApproximateName(lat, lng) {
    // 极区优先判断
    if (lat > 75) return { name: '北冰洋', nameEn: 'Arctic Ocean' };
    if (lat < -60) return { name: '南极洲', nameEn: 'Antarctica' };

    // ===== 太平洋优先判断（针对南美洲西海岸外海） =====
    // 经度小于 -72 且在南美洲西海岸纬度范围内 → 太平洋
    if (lng < -72 && lat > -55 && lat < -12) {
        return { name: '太平洋', nameEn: 'Pacific Ocean' };
    }

    // ===== 南美洲陆地 =====
    if (lat > -55 && lat < 12 && lng > -82 && lng < -34) {
        // 智利：纬度 -55 到 -20，经度 -72 到 -65（严格限定，避免误判海洋）
        if (lat > -55 && lat < -20 && lng >= -72 && lng < -65) {
            return { name: '智利', nameEn: 'Chile' };
        }
        // 阿根廷：纬度 -55 到 -20，经度 -65 到 -55
        if (lat > -55 && lat < -20 && lng >= -65 && lng < -55) {
            return { name: '阿根廷', nameEn: 'Argentina' };
        }
        // 赤道附近：巴西/哥伦比亚/委内瑞拉/厄瓜多尔
        if (lat >= -20 && lat < 12 && lng > -82 && lng < -50) {
            return { name: '南美洲（巴西/哥伦比亚）', nameEn: 'South America (Brazil/Colombia)' };
        }
        return { name: '南美洲', nameEn: 'South America' };
    }

    // ===== 其他太平洋区域（东经120°以东，或西经82°以西） =====
    if ((lng >= 120 && lng <= 180) || (lng >= -180 && lng < -82)) {
        return { name: '太平洋', nameEn: 'Pacific Ocean' };
    }

    // ===== 大西洋 =====
    if (lng >= -75 && lng <= -10) {
        if (!(lat > -55 && lat < 12 && lng > -82 && lng < -34)) {
            return { name: '大西洋', nameEn: 'Atlantic Ocean' };
        }
        return { name: '南美洲', nameEn: 'South America' };
    }

    // ===== 印度洋 =====
    if (lng >= 30 && lng <= 120 && lat < 30) {
        if (lat > -35 && lat < 30 && lng > 15 && lng < 52) {
            return { name: '非洲', nameEn: 'Africa' };
        }
        return { name: '印度洋', nameEn: 'Indian Ocean' };
    }

    // ===== 非洲 =====
    if (lng >= -15 && lng <= 50 && lat > -35 && lat < 37) {
        return { name: '非洲', nameEn: 'Africa' };
    }

    // ===== 南美洲二次校验（备用） =====
    if (lat > -55 && lat < 12 && lng > -82 && lng < -34) {
        return { name: '南美洲', nameEn: 'South America' };
    }

    // ===== 欧洲 =====
    if (lat > 35 && lat < 70 && lng > -10 && lng < 40) {
        return { name: '欧洲', nameEn: 'Europe' };
    }

    // ===== 亚洲 =====
    if (lat > 10 && lat < 75 && lng > 40 && lng < 180) {
        return { name: '亚洲', nameEn: 'Asia' };
    }

    // ===== 大洋洲 =====
    if (lat > -45 && lat < -10 && lng > 110 && lng < 180) {
        return { name: '大洋洲', nameEn: 'Oceania' };
    }

    return { name: '地球另一端', nameEn: 'The Other Side of the Earth' };
}
// 启动
migrate();
app.listen(PORT, () => {
    console.log(`🚀 对跖点漫游局 服务器已启动`);
    console.log(`📍 http://localhost:${PORT}`);
});