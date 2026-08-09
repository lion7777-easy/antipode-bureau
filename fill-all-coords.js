// fill-all-coords.js
// 功能：
// 1. 补全原点坐标（lat=0 或 lng=0 的城市，用高德 API 查询）
// 2. 将所有对跖点坐标恢复为数学计算值（作为基线）
// 3. 对非海洋地名的对跖点，用 OpenCage 查询真实坐标并更新
// 4. 海洋地名对跖点保留数学值，不查询

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'antipode.db');
const AMAP_KEY = '7d290d0879a55c759b7de4d661281bed';    // 高德 Web 服务 Key
const OPENCAGE_KEY = '5f7347363c3142a0ab346704999f59a6'; // OpenCage Key

// ---- 判断是否为海洋地名 ----
function isOceanName(name) {
    if (!name) return false;
    const oceanKeywords = ['海洋', '太平洋', '大西洋', '印度洋', '北冰洋', '南太平洋', '北大西洋', '南大西洋', '西太平洋', '东太平洋', '洋', 'Ocean', 'Pacific', 'Atlantic', 'Indian', 'Arctic'];
    return oceanKeywords.some(keyword => name.includes(keyword));
}

// ---- 高德地理编码（用于补全原点坐标，仅限中国地名） ----
async function getCoordsFromAmap(placeName) {
    if (!placeName) return null;
    const url = `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(placeName)}&key=${AMAP_KEY}`;
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
            const loc = data.geocodes[0].location.split(',');
            return { lng: parseFloat(loc[0]), lat: parseFloat(loc[1]) };
        }
        return null;
    } catch (e) {
        console.warn(`⚠️ 高德查询失败: ${placeName}`, e.message);
        return null;
    }
}

// ---- OpenCage 地理编码（用于对跖点坐标，国际地名） ----
async function getCoordsFromOpenCage(placeName) {
    if (!placeName) return null;
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(placeName)}&key=${OPENCAGE_KEY}&limit=1&language=en`;
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.status.code === 200 && data.results && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry;
            return { lat, lng };
        }
        return null;
    } catch (e) {
        console.warn(`⚠️ OpenCage 查询失败: ${placeName}`, e.message);
        return null;
    }
}

// ---- 主函数 ----
async function main() {
    console.log('🚀 开始执行城市坐标全面补全...');
    const db = new sqlite3.Database(DB_PATH);

    // ==================== 第一步：补全原点坐标 ====================
    console.log('\n📌 第一步：补全缺失的原点坐标');
    const missingOrigin = await new Promise((resolve, reject) => {
        db.all(
            `SELECT id, name_cn, name_en, lat, lng FROM cities WHERE (lat = 0 OR lng = 0) AND is_active = 1`,
            (err, rows) => { if (err) reject(err); else resolve(rows); }
        );
    });

    if (missingOrigin.length === 0) {
        console.log('✅ 所有城市原点坐标完整');
    } else {
        console.log(`📊 发现 ${missingOrigin.length} 个坐标缺失的城市`);
        for (const city of missingOrigin) {
            const name = city.name_en || city.name_cn;
            console.log(`🔍 查询: ${city.name_cn} (${name})`);
            const coord = await getCoordsFromAmap(name);
            if (coord) {
                await new Promise((resolve, reject) => {
                    db.run(
                        `UPDATE cities SET lat = ?, lng = ? WHERE id = ?`,
                        [coord.lat, coord.lng, city.id],
                        (err) => { if (err) reject(err); else resolve(); }
                    );
                });
                console.log(`✅ 更新成功: ${city.name_cn} → (${coord.lat}, ${coord.lng})`);
            } else {
                console.warn(`❌ 未找到坐标: ${city.name_cn}`);
            }
            await new Promise(r => setTimeout(r, 500));
        }
    }

    // ==================== 第二步：恢复所有对跖点为数学计算值 ====================
    console.log('\n📌 第二步：将所有对跖点坐标恢复为数学计算值（基线）');
    await new Promise((resolve, reject) => {
        db.run(
            `UPDATE cities SET antipode_lat = -lat, antipode_lng = CASE WHEN lng + 180 > 180 THEN lng + 180 - 360 ELSE lng + 180 END WHERE is_active = 1`,
            (err) => { if (err) reject(err); else resolve(); }
        );
    });
    console.log('✅ 已重置为数学值');

    // ==================== 第三步：用 OpenCage 补全非海洋地名的真实坐标 ====================
    console.log('\n📌 第三步：为陆地对跖点查询真实坐标（跳过海洋）');
    const cities = await new Promise((resolve, reject) => {
        db.all(
            `SELECT id, name_cn, name_en, antipode_name, antipode_name_en, lat, lng, antipode_lat, antipode_lng FROM cities WHERE is_active = 1`,
            (err, rows) => { if (err) reject(err); else resolve(rows); }
        );
    });

    let successCount = 0;
    let skipOceanCount = 0;
    let failCount = 0;

    for (const city of cities) {
        // 优先英文名，其次中文名
        const name = city.antipode_name_en || city.antipode_name || city.name_en || city.name_cn;
        console.log(`🔍 [${city.id}] ${city.name_cn} → 对跖点: ${name}`);

        if (!name || name.trim() === '') {
            console.warn(`⚠️ 跳过（无名称）`);
            failCount++;
            continue;
        }

        // 检查是否为海洋地名
        if (isOceanName(name)) {
            console.log(`🌊 海洋区域，保留数学值`);
            skipOceanCount++;
            continue;
        }

        const coords = await getCoordsFromOpenCage(name);
        if (coords) {
            await new Promise((resolve, reject) => {
                db.run(
                    `UPDATE cities SET antipode_lat = ?, antipode_lng = ? WHERE id = ?`,
                    [coords.lat, coords.lng, city.id],
                    (err) => { if (err) reject(err); else resolve(); }
                );
            });
            console.log(`✅ 更新成功: ${city.name_cn} → (${coords.lat}, ${coords.lng})`);
            successCount++;
        } else {
            console.warn(`❌ 未找到坐标，保留数学值`);
            failCount++;
        }
        // 延迟 0.8 秒，避免 OpenCage 限速
        await new Promise(r => setTimeout(r, 800));
    }

    db.close();

    // ==================== 统计结果 ====================
    console.log('\n📊 执行完成统计:');
    console.log(`- 原点坐标补全: ${missingOrigin.length} 个处理`);
    console.log(`- 对跖点真实坐标更新成功: ${successCount} 个`);
    console.log(`- 海洋区域跳过: ${skipOceanCount} 个`);
    console.log(`- 查询失败保留数学值: ${failCount} 个`);
    console.log('✅ 所有任务完成！');
}

main().catch(console.error);