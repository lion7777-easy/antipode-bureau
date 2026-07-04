const AMAP_KEY = 'd6846dea147b497922afd3f9b121b429';
        const AMAP_SECURITY = '5ee76779d43d2d8a89961f61ee26c810';
// ===== 天地图配置 =====
const TIANDITU_TK = '7da0bbd486e5a061e5329472bed5ba41';  // 你的浏览器端 Key
// ===== 搜索缓存（重复搜索同一城市秒开） =====
const searchCache = new Map();

// ===== 个人日限（100次/天） =====
function getTodayCount() {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('searchCount');
    if (!stored) return { date: today, count: 0 };
    try {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) return parsed;
        return { date: today, count: 0 };
    } catch { return { date: today, count: 0 }; }
}

function incrementTodayCount() {
    const data = getTodayCount();
    data.count += 1;
    localStorage.setItem('searchCount', JSON.stringify(data));
}
// ===== 双域名品牌识别与切换 =====
function detectBrand() {
    const host = window.location.hostname.toLowerCase();
    return host.includes('antipodalbureau') ? 'en' : 'zh';
}

function applyBranding() {
    const lang = detectBrand();
    const isEn = lang === 'en';
    
    // 标题
    document.title = isEn ? 'Antipodal Bureau | Cross the Core, Meet Your Far Side' : '对跖点漫游局 | 穿越地心，抵达你的另一端';
    
    // 主品牌 & 副品牌
    document.getElementById('brandMain').textContent = isEn ? 'Antipodal Bureau' : '对跖点漫游局';
    document.getElementById('brandSub').textContent = isEn ? '对跖点漫游局' : 'Antipodal Bureau';
    document.getElementById('subText').textContent = isEn ? 'Cross the core, meet your far side.' : '穿越地心，抵达你的另一端';
    
    // 底部版权
    document.getElementById('footerText').textContent = isEn ? 'Antipodal Bureau ｜ Data for reference only' : '对跖点漫游局 · Antipodal Bureau ｜ 地理数据仅供参考';
    
    // 礼物底部品牌
    document.getElementById('giftBrand').textContent = isEn ? '✦ Antipodal Bureau' : '✦ 对跖点漫游局';
    
    // Meta description
    const metaDesc = document.getElementById('metaDesc');
    if (metaDesc) {
        metaDesc.content = isEn ? 'Cross the core, meet your far side. Discover your antipode.' : '穿越地心，抵达你的另一端 | 探索你的对跖点';
    }
    // ===== 动态更新 Canonical 链接（SEO 优化） =====
    const canonical = document.getElementById('canonicalLink');
    if (canonical) {
        const base = isEn ? 'https://antipodalbureau.com' : 'https://duizhidian.com';
        canonical.href = base + window.location.pathname;
    }
    // 设置 html lang
    document.documentElement.lang = isEn ? 'en' : 'zh-CN';
}
 // ===== 设备类型锁定（防止QQ浏览器输入框焦点时切换布局） =====
        function lockDeviceType() {
            const body = document.getElementById('appBody');
            if (!body) return;
            
            // 判断是否为移动设备（屏幕宽度 < 768px 或 用户代理包含移动端标识）
            const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
            
            // 添加固定类名，后续所有样式都基于这个类名控制，不再依赖CSS媒体查询
            if (isMobile) {
                body.classList.add('is-mobile');
                body.classList.remove('is-desktop');
            } else {
                body.classList.add('is-desktop');
                body.classList.remove('is-mobile');
            }
            
            console.log(`📱 设备类型锁定: ${isMobile ? '移动端' : '桌面端'}`);
        }

        // 页面加载时锁定设备类型（立即执行，不等待DOMContentLoaded）
        lockDeviceType();

        // 窗口大小变化时不重新锁定（防止键盘弹出导致切换）
        // 但如果用户确实旋转了屏幕，手动刷新页面即可
       // ===== QQ浏览器特殊处理：消除底部白边 =====
function fixQQBrowser() {
    const ua = navigator.userAgent.toLowerCase();
    const isQQ = ua.includes('qqbrowser');
    if (!isQQ) return;

    // 添加专用类
    document.body.classList.add('qq-browser');

    // 等待页面渲染完成
    setTimeout(() => {
        const container = document.querySelector('.container');
        const body = document.body;
        if (container) {
            // 使用 margin-bottom 强制抬高底部内容
            container.style.marginBottom = '80px';
            // 把 body 的 padding-bottom 设为 0
            body.style.paddingBottom = '0';
            // 让 body 的 min-height 稍微增加，容纳底部空间
            body.style.minHeight = 'calc(100dvh + 80px)';
            // 强制重排
            window.dispatchEvent(new Event('resize'));
        }
        console.log('📱 QQ浏览器布局已优化（margin-bottom:80px）');
    }, 300);
}

        // 在DOMContentLoaded中调用
        document.addEventListener('DOMContentLoaded', function() {
            // ... 已有代码 ...
            fixQQBrowser();  // 添加这一行
        });
               // ===== 横屏检测（JS控制，避免QQ浏览器加载误判） =====
        let isInputActive = false; // 输入框是否处于焦点状态

        function checkOrientation() {
            const overlay = document.getElementById('landscapeOverlay');
            if (!overlay) return;
            
            // 如果输入框处于焦点状态，暂停检测（防止键盘弹出时误判）
            if (isInputActive) {
                overlay.style.display = 'none';
                document.body.style.overflow = '';
                return;
            }
            
            // 仅在移动端设备上检测横屏
            const body = document.getElementById('appBody');
            const isMobile = body?.classList.contains('is-mobile') || window.innerWidth < 768;
            
            if (!isMobile) {
                overlay.style.display = 'none';
                document.body.style.overflow = '';
                return;
            }
            
            // 使用更可靠的方向检测：优先使用 screen.orientation
            let isLandscape = false;
            if (window.screen && window.screen.orientation) {
                const type = window.screen.orientation.type;
                isLandscape = type === 'landscape-primary' || type === 'landscape-secondary';
            } else {
                // 降级方案：宽高比判断，并加入阈值防止键盘弹出误判
                const ratio = window.innerWidth / window.innerHeight;
                isLandscape = ratio > 1.2; // 只有明显横屏才触发
            }
            
            if (isLandscape) {
                overlay.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            } else {
                overlay.style.display = 'none';
                document.body.style.overflow = '';
            }
        }

        // 页面加载完成后检查横屏（延迟500ms，等待QQ浏览器稳定）
        document.addEventListener('DOMContentLoaded', function() {
            // 绑定输入框焦点事件
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('focus', function() {
                    isInputActive = true;
                    // 立即隐藏遮罩
                    const overlay = document.getElementById('landscapeOverlay');
                    if (overlay) {
                        overlay.style.display = 'none';
                        document.body.style.overflow = '';
                    }
                });
                searchInput.addEventListener('blur', function() {
                    isInputActive = false;
                    // 延迟重新检测，等待键盘收起
                    setTimeout(checkOrientation, 300);
                });
            }
            
            setTimeout(checkOrientation, 500);
        });

        // 窗口尺寸变化时检查横屏（但不重新锁定设备类型）
        window.addEventListener('resize', function() {
            // 输入框焦点时不检测
            if (!isInputActive) {
                checkOrientation();
            }
        });

        // 用户手动关闭横屏提示
        document.getElementById('dismissLandscapeBtn')?.addEventListener('click', function() {
            const overlay = document.getElementById('landscapeOverlay');
            if (overlay) {
                overlay.style.display = 'none';
                document.body.style.overflow = '';
            }
        });

        // ===== 搜索历史 =====
        const MAX_HISTORY = 10;
        const STORAGE_KEY = 'searchHistory';
// 格式化对跖点名称（中文 (英文)）
function formatAntipodeName(city) {
    if (city && city.antipode_name_en && city.antipode_name_en.trim()) {
        return `${city.antipode_name} (${city.antipode_name_en})`;
    }
    return city?.antipode_name || '地球另一端';
}
// 格式化城市名：中文 (英文)
function formatCityName(city) {
    if (city && city.name_en && city.name_en.trim()) {
        return `${city.name_cn} (${city.name_en})`;
    }
    return city?.name_cn || '你的城市';
}
        function getSearchHistory() {
            try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
        }
        function saveSearchHistory(history) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        }
        function addToHistory(keyword) {
    if (!keyword || !keyword.trim()) return;
    const clean = keyword.trim();
    let history = getSearchHistory();
    history = history.filter(item => item.toLowerCase() !== clean.toLowerCase());
    history.unshift(clean);
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    saveSearchHistory(history);
    updateHistoryList();

    // 发送搜索日志到服务器（包括未命中数据库的）
    fetch('/api/search-log', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'   // 新增这一行
    },
    body: JSON.stringify({ city_name: clean })
}).catch(() => {});
}
        function updateHistoryList() {
            const datalist = document.getElementById('historyList');
            if (!datalist) return;
            const history = getSearchHistory();
            datalist.innerHTML = '';
            if (history.length === 0) {
                const option = document.createElement('option');
                option.value = '暂无搜索历史';
                option.disabled = true;
                datalist.appendChild(option);
                return;
            }
            history.forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                datalist.appendChild(option);
            });
        }

        // ===== 隧道动画 =====
        let tunnelAnimationId = null;
        let tunnelRunning = false;
        let particles = [];
        let starField = [];

        function initParticles(width, height) {
            const count = 700;
            particles = [];
            const cx = width / 2;
            const cy = height / 2;
            const maxRadius = Math.min(width, height) * 0.45;
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const startRadius = maxRadius * (0.7 + Math.random() * 0.3);
                const speed = 2.5 + Math.random() * 1.8;
                const tailLength = startRadius * (0.45 + Math.random() * 0.3);
                const dashLength = 1 + Math.random() * 6;
                const gapLength = 2 + Math.random() * 12;
                const brightness = 0.3 + Math.random() * 0.4;
                const flickerPhase = Math.random() * Math.PI * 2;
                const flickerSpeed = 0.25 + Math.random() * 0.5;
                const flickerAmplitude = 0.3 + Math.random() * 0.5;
                particles.push({
                    angle, radius: startRadius, speed, brightness, startRadius,
                    tailLength, dashPattern: [dashLength, gapLength],
                    flickerPhase, flickerSpeed, flickerAmplitude,
                    x: cx + startRadius * Math.cos(angle),
                    y: cy + startRadius * Math.sin(angle)
                });
            }
            starField = [];
            for (let i = 0; i < 150; i++) {
                starField.push({
                    x: Math.random(), y: Math.random(),
                    size: 0.3 + Math.random() * 1.5,
                    brightness: 0.1 + Math.random() * 0.3
                });
            }
        }

        function drawTunnelParticles(canvas, ctx) {
            const w = canvas.width, h = canvas.height;
            const cx = w/2, cy = h/2;
            const maxRadius = Math.min(w, h) * 0.45;
            ctx.clearRect(0, 0, w, h);
            const now = performance.now();
            starField.forEach(star => {
                const x = star.x * w, y = star.y * h;
                const alpha = star.brightness * (0.5 + 0.5 * Math.sin(now * 0.0008 + star.x * 100));
                ctx.beginPath();
                ctx.arc(x, y, star.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(180, 200, 255, ${alpha * 0.3})`;
                ctx.fill();
            });
            const ringRadius = maxRadius * 1.05;
            const grad = ctx.createRadialGradient(cx, cy, ringRadius * 0.8, cx, cy, ringRadius);
            grad.addColorStop(0, 'rgba(232,146,58,0)');
            grad.addColorStop(0.7, 'rgba(232,146,58,0.01)');
            grad.addColorStop(1, 'rgba(232,146,58,0.04)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(now * 0.00015);
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(232,146,58,0.08)';
            ctx.lineWidth = 1;
            ctx.setLineDash([8, 16]);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
            const resetThreshold = 0.025;
            particles.forEach(p => {
                p.radius -= p.speed * 0.6;
                if (p.radius < p.startRadius * resetThreshold) {
                    p.radius = p.startRadius;
                    p.angle = Math.random() * Math.PI * 2;
                    p.startRadius = maxRadius * (0.7 + Math.random() * 0.3);
                    p.speed = 2.5 + Math.random() * 1.8;
                    p.tailLength = p.startRadius * (0.45 + Math.random() * 0.3);
                    p.dashPattern = [1 + Math.random() * 6, 2 + Math.random() * 12];
                    p.brightness = 0.3 + Math.random() * 0.4;
                }
                const angle = p.angle + now * 0.05;
                const x = cx + p.radius * Math.cos(angle);
                const y = cy + p.radius * Math.sin(angle);
                const dirX = Math.cos(angle), dirY = Math.sin(angle);
                const endX = x + dirX * p.tailLength;
                const endY = y + dirY * p.tailLength;
                const normalizedRadius = (p.radius - p.startRadius * resetThreshold) / (p.startRadius * (1 - resetThreshold));
                let alpha = p.brightness * Math.min(1, normalizedRadius * 1.2);
                const edgeFactor = Math.min(1, (p.radius / p.startRadius) * 1.3);
                alpha = alpha * edgeFactor * 0.7;
                const flicker = 1 + p.flickerAmplitude * Math.sin(now * 0.001 * p.flickerSpeed + p.flickerPhase);
                alpha = Math.max(0, Math.min(1, alpha * flicker));
                if (alpha < 0.005) return;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(endX, endY);
                ctx.lineWidth = 0.3 + Math.random() * 0.9;
                ctx.setLineDash(p.dashPattern);
                const grad2 = ctx.createLinearGradient(x, y, endX, endY);
                grad2.addColorStop(0, `rgba(232, 180, 100, ${alpha * 0.8})`);
                grad2.addColorStop(0.6, `rgba(200, 220, 255, ${alpha * 0.5})`);
                grad2.addColorStop(1, `rgba(245, 240, 232, ${alpha * 0.2})`);
                ctx.strokeStyle = grad2;
                ctx.lineCap = 'round';
                ctx.shadowColor = 'rgba(232,146,58,0.15)';
                ctx.shadowBlur = 2;
                ctx.stroke();
                ctx.restore();
            });
        }

        function startTunnelAnimation() {
            if (tunnelRunning) return;
            tunnelRunning = true;
            const canvas = document.getElementById('tunnelCanvas');
            const ctx = canvas.getContext('2d');
            const container = document.getElementById('blindboxOverlay');
            function resizeCanvas() {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
                initParticles(canvas.width, canvas.height);
            }
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
            const duration = 1500;
            let startTime = performance.now();
            function draw(now) {
                const elapsed = now - startTime;
                if (elapsed < duration) {
                    drawTunnelParticles(canvas, ctx);
                    tunnelAnimationId = requestAnimationFrame(draw);
                } else {
                    tunnelRunning = false;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    window._tunnelComplete = true;
                }
            }
            tunnelAnimationId = requestAnimationFrame(draw);
        }

        function stopTunnelAnimation() {
            if (tunnelAnimationId) { cancelAnimationFrame(tunnelAnimationId); tunnelAnimationId = null; }
            tunnelRunning = false;
            const canvas = document.getElementById('tunnelCanvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        // ===== 盲盒逻辑 =====
        let isBlindboxPlaying = false;

        function playBlindbox(callback) {
            if (isBlindboxPlaying) return;
            isBlindboxPlaying = true;
            document.getElementById('randomBtn').disabled = true;
            
            const overlay = document.getElementById('blindboxOverlay');
            const text = document.getElementById('blindboxText');
            const result = document.getElementById('blindboxResult');
            const nameEl = document.getElementById('blindboxName');
            const subEl = document.getElementById('blindboxSub');
            overlay.className = 'blindbox-overlay active';
            overlay.style.opacity = '1';
            result.classList.remove('show');
            text.style.display = 'block';
            text.innerHTML = '🌍 正在穿越地心 <span class="highlight">...</span>';
            nameEl.textContent = '';
            subEl.textContent = '';
            startTunnelAnimation();
            setTimeout(() => {
                stopTunnelAnimation();
                text.style.display = 'none';
                const spot = callback();
                nameEl.textContent = spot.name;
const antipodeDisplay = formatAntipodeName({ antipode_name: spot.antipodeName, antipode_name_en: spot.antipodeNameEn || '' });
subEl.textContent = `📍 对跖点：${antipodeDisplay}`;                result.classList.add('show');
                setTimeout(() => {
                    overlay.classList.add('fade-out');
                    setTimeout(() => {
                        overlay.className = 'blindbox-overlay';
                        overlay.style.opacity = '1';
                        isBlindboxPlaying = false;
                        document.getElementById('randomBtn').disabled = false;
                        performRandomTravel(spot);
                    }, 600);
                }, 1200);
            }, 1500);
        }

        function performRandomTravel(spot) {
            if (!spot) return;
            updateAll(spot.lat, spot.lng);
            addToHistory(spot.name);
            setTimeout(() => { showCityPopup(spot); }, 300);
        }

        // ===== 随机穿越 =====
        async function randomTravel() {
    window._currentGift = null;
            if (isBlindboxPlaying) return;
            try {
                const response = await fetch('/api/cities', {
    headers: { 'ngrok-skip-browser-warning': 'true' }
});
                const cities = await response.json();
                if (!cities || cities.length === 0) {
                    alert('暂无城市数据，请先在后台添加');
                    return;
                }
                const randomIndex = Math.floor(Math.random() * cities.length);
                const city = cities[randomIndex];
                const spot = {
                    name: city.name_cn,
                    nameEn: city.name_en || '',
                    lat: city.lat,
                    lng: city.lng,
                    antipodeName: city.antipode_name || '地球另一端',
                    antipodeNameEn: city.antipode_name_en || '',
                    funFact: city.poem || '「穿越地心，发现地球另一端的故事」',
                    originImage: city.origin_image || '',
                    antipodeImage: city.antipode_image || '',
                    id: city.id,
                    hasGift: city.gift_id ? true : false,
                    giftName: city.gift_name || '',
                    giftDesc: city.gift_description || '',
                    giftImage: city.gift_image_ripe || '',
                    giftHasGreen: city.gift_has_green || 0,
                    giftPoemRipe: city.gift_poem_ripe || '',
                    giftPoemGreen: city.gift_poem_green || ''
                };
                playBlindbox(() => spot);
            } catch (e) {
                console.error('随机穿越错误:', e);
                alert('加载失败，请稍后重试');
            }
        }

       // ===== 显示城市弹窗 =====
function showCityPopup(spot) {
    const popup = document.getElementById('randomPopup');
    const content = document.getElementById('popupContent');
    const fact = document.getElementById('popupFact');
    
    const originImg = spot.originImage ? `<img src="${spot.originImage}" alt="${spot.name}" onerror="this.style.display='none'">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:32px;background:rgba(0,0,0,0.05);border-radius:16px;">🌍</div>';
    const antipodeImg = spot.antipodeImage ? `<img src="${spot.antipodeImage}" alt="${spot.antipodeName}" onerror="this.style.display='none'">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:32px;background:rgba(0,0,0,0.05);border-radius:16px;">🌎</div>';
    
    // 格式化对跖点名称（中文 + 英文括号）
    content.innerHTML = `
        <div class="item">
            <div style="width:100%;aspect-ratio:1/1;border-radius:16px;overflow:hidden;background:rgba(0,0,0,0.03);">${originImg}</div>
            <div class="label origin">📍 ${spot.name} <span class="en">${spot.nameEn || ''}</span></div>
        </div>
        <div class="arrow">⬇️</div>
        <div class="item">
            <div style="width:100%;aspect-ratio:1/1;border-radius:16px;overflow:hidden;background:rgba(0,0,0,0.03);">${antipodeImg}</div>
            <div class="label antipode">🌎 ${spot.antipodeName} <span class="en">${spot.antipodeNameEn || ''}</span></div>
        </div>
    `;
    fact.textContent = `✨ ${spot.funFact || '穿越地心，发现地球另一端的故事'}`;
    popup.classList.add('active');
    document.getElementById('randomBtn').disabled = true;
}

        function hideRandomPopup() {
            document.getElementById('randomPopup').classList.remove('active');
            document.getElementById('randomBtn').disabled = false;
        }

        document.getElementById('randomPopup').addEventListener('click', function(e) {
            if (e.target === this) hideRandomPopup();
        });
        document.getElementById('popupCloseBtn').addEventListener('click', function(e) {
            e.stopPropagation();
            hideRandomPopup();
        });

        // ===== 地图与3D地球逻辑 =====
        let originMap = null, antipodeMap = null, placeSearch = null;
        let currentOrigin = { lat: 30.7448, lng: 109.4755 };
        let currentCityData = null;
        let earthFrame = null;
        let globeOverlayHidden = false;
        let globeOverlayStartTime = Date.now();

        function formatCoord(lat, lng) {
            if (lat === undefined || lng === undefined) return '—';
            const latDir = lat >= 0 ? '°N' : '°S';
            const lngDir = lng >= 0 ? '°E' : '°W';
            return `${Math.abs(lat).toFixed(4)}${latDir}, ${Math.abs(lng).toFixed(4)}${lngDir}`;
        }
// ===== 解析经纬度字符串（支持多种格式） =====
function parseCoordinate(input) {
    if (!input || typeof input !== 'string') return null;
    input = input.trim();
    // 按逗号或中文逗号或空格分割
    const parts = input.split(/[,，\s]+/).filter(s => s.length > 0);
    if (parts.length !== 2) return null;
    const latStr = parts[0];
    const lngStr = parts[1];
    
    // 用正则提取每个部分的数字和方向字母
    const pattern = /^\s*([-+]?\d*\.?\d+)\s*[°度]?\s*([NSEWnsew])?\s*$/;
    const latMatch = latStr.match(pattern);
    const lngMatch = lngStr.match(pattern);
    if (!latMatch || !lngMatch) return null;
    
    let lat = parseFloat(latMatch[1]);
    let lng = parseFloat(lngMatch[1]);
    const latDir = latMatch[2] ? latMatch[2].toUpperCase() : '';
    const lngDir = lngMatch[2] ? lngMatch[2].toUpperCase() : '';
    
    // 如果方向存在，则根据方向确定正负（忽略数字原有的符号）
    if (latDir === 'S') lat = -Math.abs(lat);
    else if (latDir === 'N') lat = Math.abs(lat);
    // 如果方向不存在，保留原符号（可能已有负号）
    if (lngDir === 'W') lng = -Math.abs(lng);
    else if (lngDir === 'E') lng = Math.abs(lng);
    
    // 验证范围
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
}
        function calculateAntipode(lat, lng) {
            let antiLng = lng + 180;
            if (antiLng > 180) antiLng -= 360;
            return { lat: -lat, lng: antiLng };
        }

        function createTeardropMarker(color) {
            var svg = `
                <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.4)); width: 36px; height: 36px;">
                    <path d="M18 32 C18 32, 8 22, 8 14 C8 6, 12 2, 18 2 C24 2, 28 6, 28 14 C28 22, 18 32, 18 32Z" fill="${color}" stroke="#f5f0e8" stroke-width="1.5"/>
                    <circle cx="14" cy="12" r="2.5" fill="rgba(245,240,232,0.8)"/>
                </svg>
            `;
            var container = document.createElement('div');
            container.innerHTML = svg;
            container.style.width = '36px';
            container.style.height = '36px';
            return new AMap.Marker({
                content: container,
                offset: new AMap.Pixel(-18, -32)
            });
        }

        function sendToEarth(lat, lng) {
            if (earthFrame && earthFrame.contentWindow) {
                earthFrame.contentWindow.postMessage({ originLat: lat, originLng: lng }, '*');
            }
        }

                function updateAll(originLat, originLng) {
            if (!originMap || !antipodeMap) return;
            const antipode = calculateAntipode(originLat, originLng);
            currentOrigin = { lat: originLat, lng: originLng };
            document.getElementById('originCoord').innerText = formatCoord(originLat, originLng);
            document.getElementById('antipodeCoord').innerText = formatCoord(antipode.lat, antipode.lng);

            originMap.clearMap();
            antipodeMap.clearMap();

            var orangeMarker = createTeardropMarker('#e8923a');
            orangeMarker.setPosition([originLng, originLat]);
            originMap.add(orangeMarker);

            var blueMarker = createTeardropMarker('#2898e8');
            blueMarker.setPosition([antipode.lng, antipode.lat]);
            antipodeMap.add(blueMarker);

            originMap.setCenter([originLng, originLat]);
            antipodeMap.setCenter([antipode.lng, antipode.lat]);

            originMap.render();
            antipodeMap.render();
            originMap.resize();
            antipodeMap.resize();

            // 更新 Three.js 地球（移动端）
            sendToEarth(originLat, originLng);

            // 更新 Cesium 地球（桌面端，如果已加载）
            if (window.__cesiumViewer && window.__cesiumModule) {
                const { updateCesiumEarth } = window.__cesiumModule;
                const originName = currentCityData?.name_cn || '你的城市';
                const antipodeName = currentCityData?.antipode_name || '地球另一端';
                updateCesiumEarth(
                    window.__cesiumViewer,
                    originLat, originLng, originName,
                    antipode.lat, antipode.lng, antipodeName
                );
            }
        }

              // ===== 搜索 =====
        // ===== 天地图地理编码（仅支持国内地址） =====
        async function searchWithTianDiTu(keyword) {
            try {
                const params = JSON.stringify({ keyWord: keyword });
                const url = `https://api.tianditu.gov.cn/geocoder?ds=${encodeURIComponent(params)}&tk=${TIANDITU_TK}`;
                const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
                const data = await response.json();
                if (data.status === '0' && data.location) {
                    return {
                        lat: parseFloat(data.location.lat),
                        lng: parseFloat(data.location.lon),
                        source: 'tianditu'
                    };
                }
                return null;
            } catch (e) {
                // 超时或网络错误，返回 null 降级
                return null;
            }
        }
// ===== 高德国内搜索（只接受境内坐标） =====
async function searchWithAmapDomestic(keyword) {
    try {
        const result = await new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('高德超时')), 3000);
            placeSearch.search(keyword, (status, result) => {
                clearTimeout(t);
                if (status === 'complete' && result.poiList && result.poiList.pois.length > 0) {
                    resolve(result);
                } else {
                    reject(new Error('高德未找到'));
                }
            });
        });
        const { lat, lng } = result.poiList.pois[0].location;
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        // 只接受中国境内坐标
        if (!isInChina(latNum, lngNum)) {
            console.log('⚠️ 高德返回境外坐标（国内搜索时拒绝）');
            return null;
        }
        return { lat: latNum, lng: lngNum };
    } catch (e) {
        // 超时或未找到，返回 null 降级
        return null;
    }
}
// ===== 通用搜索成功处理 =====
        async function handleSearchSuccess(lat, lng, keyword, cityData) {
            // 1. 更新地图
            updateAll(lat, lng);

            // 2. 添加到历史
            addToHistory(keyword);

           // 3. 触发礼物（基于地理坐标，不依赖 gift_id）
// 对于数据库城市，cityData 有完整信息；对于非数据库城市，传入一个包含名称的简单对象
const cityObj = cityData || { name_cn: keyword };
triggerGiftForLocation(lat, lng, cityObj);

            // 4. 存入缓存
            const poemHTML = document.getElementById('poemDisplay').innerHTML;
            searchCache.set(keyword.toLowerCase(), {
                cityData: currentCityData,
                lat: lat,
                lng: lng,
                poemHTML: poemHTML,
                cityName: keyword,
                giftData: { hasGift: true }   // 总是存在，用于触发逻辑（实际触发不依赖它）
            });

            // 5. 累加个人日限
            incrementTodayCount();
        }
        let isSearching = false;

        async function searchLocation(keyword, retryCount = 0) {
    window._currentGift = null;
    if (isSearching) return;
    if (!placeSearch) { alert('搜索服务初始化中，请稍后重试'); return; }
    if (!keyword.trim()) { alert('请输入地点名称'); return; }
    
    const searchKeyword = keyword.trim();

    // ===== L1: 检查缓存（重复搜索同一城市） =====
    const cacheKey = searchKeyword.toLowerCase();
    if (searchCache.has(cacheKey)) {
        console.log('✅ 命中缓存，秒开');
        const cached = searchCache.get(cacheKey);
        currentCityData = cached.cityData;
        updateAll(cached.lat, cached.lng);
        document.getElementById('poemDisplay').innerHTML = cached.poemHTML;
        addToHistory(cached.cityName);
        // 缓存命中时也始终触发物产
triggerGiftForLocation(cached.lat, cached.lng, cached.cityData);
        return;
    }

    // ===== L2: 检查个人日限（100次/天） =====
    const countData = getTodayCount();
    if (countData.count >= 100) {
        alert('局长已力竭，明天再为您服务。');
        return;
    }

   isSearching = true;
    document.getElementById('searchBtn').disabled = true;

    // ============================================================
    // 第一步：先查数据库（任何关键词都优先）
    // ============================================================
    try {
        const dbRes = await fetch(`/api/search?q=${encodeURIComponent(searchKeyword)}`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        const dbData = await dbRes.json();
        if (dbData && dbData.length > 0) {
            // 命中数据库，直接使用
            const city = dbData[0];
            currentCityData = city;
            updateAll(city.lat, city.lng);
            const displayCN = city.poem || DEFAULT_POEM_CN;
            const displayEN = city.poem_en || DEFAULT_POEM_EN;
            document.getElementById('poemDisplay').innerHTML = `${displayCN}<br>${displayEN}`;
            addToHistory(city.name_cn);
            await handleSearchSuccess(city.lat, city.lng, city.name_cn, city);
            isSearching = false;
            document.getElementById('searchBtn').disabled = false;
            showLoading(false);
            return;
        }
    } catch (e) {
        console.log('⚠️ 数据库查询失败，继续走地理编码:', e.message);
    }

    // ============================================================
    // 第二步：未命中数据库 → 走地理编码
    // ============================================================
    // ===== 优先尝试天地图（国内地址） =====
    const isChineseKeyword = /[\u4e00-\u9fa5]/.test(searchKeyword);
    if (isChineseKeyword) {
        // 1. 优先高德（国内精度最高）
        try {
            const amapResult = await searchWithAmapDomestic(searchKeyword);
            if (amapResult) {
                console.log('📍 高德命中（国内）:', searchKeyword, amapResult);
                // ---- 获取对跖点名称 ----
                let antipodeName = '地球另一端';
                let antipodeNameEn = '';
                try {
                    const anti = calculateAntipode(amapResult.lat, amapResult.lng);
                    const geoRes = await fetch(`/api/reverse-geocode?lng=${anti.lng}&lat=${anti.lat}`, {
                        headers: { 'ngrok-skip-browser-warning': 'true' }
                    });
                    const geoData = await geoRes.json();
                    if (geoData.success && geoData.name) {
                        antipodeName = geoData.name;
                        antipodeNameEn = geoData.nameEn || '';
                    }
                } catch (e) {
                    console.warn('获取对跖点名称失败:', e);
                }
                // ---- 构造临时城市数据 ----
const tempCityData = {
    lat: amapResult.lat,
    lng: amapResult.lng,
    name_cn: searchKeyword,
    name_en: nameEn,
    antipode_name: antipodeName,
    antipode_name_en: antipodeNameEn,
    poem: '「这一刻，你与地球背面，同频呼吸。」',
    poem_en: 'In this moment, you breathe in sync with the far side of the earth.',
    origin_image: '',
    antipode_image: ''
};
                currentCityData = tempCityData;
                await handleSearchSuccess(amapResult.lat, amapResult.lng, searchKeyword, tempCityData);
                isSearching = false;
                document.getElementById('searchBtn').disabled = false;
                showLoading(false);
                return;
            }
        } catch (e) {
            console.log('⚠️ 高德失败，降级到天地图');
        }
        // 2. 天地图作为备选
        try {
            const tianDiTuResult = await searchWithTianDiTu(searchKeyword);
            if (tianDiTuResult) {
                console.log('🌐 天地图命中（备选）:', searchKeyword, tianDiTuResult);
                let antipodeName = '地球另一端';
                let antipodeNameEn = '';
                try {
                    const anti = calculateAntipode(tianDiTuResult.lat, tianDiTuResult.lng);
                    const geoRes = await fetch(`/api/reverse-geocode?lng=${anti.lng}&lat=${anti.lat}`, {
                        headers: { 'ngrok-skip-browser-warning': 'true' }
                    });
                    const geoData = await geoRes.json();
                    if (geoData.success && geoData.name) {
                        antipodeName = geoData.name;
                        antipodeNameEn = geoData.nameEn || '';
                    }
                } catch (e) {
                    console.warn('获取对跖点名称失败:', e);
                }
                // ---- 构造临时城市数据 ----
const tempCityData = {
    lat: amapResult.lat,
    lng: amapResult.lng,
    name_cn: searchKeyword,
    name_en: nameEn,
    antipode_name: antipodeName,
    antipode_name_en: antipodeNameEn,
    poem: '「这一刻，你与地球背面，同频呼吸。」',
    poem_en: 'In this moment, you breathe in sync with the far side of the earth.',
    origin_image: '',
    antipode_image: ''
};
                currentCityData = tempCityData;
                await handleSearchSuccess(tianDiTuResult.lat, tianDiTuResult.lng, searchKeyword, tempCityData);
                isSearching = false;
                document.getElementById('searchBtn').disabled = false;
                showLoading(false);
                return;
            }
        } catch (e) {
            console.log('⚠️ 天地图失败，降级到竞赛');
        }
    } else {
        console.log('⚠️ 关键词非中文，跳过天地图');
    }

    // ===== 检测经纬度（支持多种格式） =====
    const coord = parseCoordinate(searchKeyword);
              if (coord) {
            const { lat, lng } = coord;
            console.log(`📍 经纬度定位: ${lat}, ${lng}`);
            const antipode = calculateAntipode(lat, lng);
            updateAll(lat, lng);
            const poemHTML = '「这一刻，你与地球背面，同频呼吸。」<br>In this moment, you breathe in sync with the far side of the earth.';
            document.getElementById('poemDisplay').innerHTML = poemHTML;

            addToHistory(searchKeyword);
            currentCityData = {
                lat,
                lng,
                name_cn: `📍 ${formatCoord(lat, lng)}`,
                name_en: nameEn,
                antipode_name: '地球另一端',
                antipode_name_en: '',
                poem: '「这一刻，你与地球背面，同频呼吸。」\nIn this moment, you breathe in sync with the far side of the earth.',
                origin_image: '',
                antipode_image: ''
            };

            // ===== 调用通用处理（缓存 + 日限） =====
            await handleSearchSuccess(lat, lng, searchKeyword, null);

            isSearching = false;
            document.getElementById('searchBtn').disabled = false;
            showLoading(false);
            return;
        }
            try {
                const results = await Promise.race([
    (async () => {
        // 新任务：尝试高德，非中文也接受境外坐标
        try {
            const result = await new Promise((resolve, reject) => {
                const t = setTimeout(() => reject(new Error('高德超时')), 3000);
                placeSearch.search(searchKeyword, (status, result) => {
                    clearTimeout(t);
                    if (status === 'complete' && result.poiList && result.poiList.pois.length > 0) {
                        resolve(result);
                    } else {
                        reject(new Error('高德未找到'));
                    }
                });
            });
            const { lat, lng } = result.poiList.pois[0].location;
            const latNum = parseFloat(lat);
            const lngNum = parseFloat(lng);
            
            const isChineseKeyword = /[\u4e00-\u9fa5]/.test(searchKeyword);
            if (!isChineseKeyword && isInChina(latNum, lngNum)) {
                console.log('⚠️ 非中文关键词，高德返回中国境内坐标，拒绝');
                throw new Error('高德返回境内坐标');
            }
            return { source: 'amap', lat: latNum, lng: lngNum };
        } catch (e) {
            console.log('高德失败:', e.message);
            throw e;
        }
    })(),
    (async () => {
        // OSM任务
        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchKeyword)}&format=json&limit=1&accept-language=zh`;
            const response = await fetch(url, {
                headers: { 'User-Agent': 'AntipodeBureau/1.0' },
                signal: AbortSignal.timeout(4000)
            });
            if (!response.ok) throw new Error('OSM请求失败');
            const data = await response.json();
            if (data && data.length > 0) {
                return { source: 'osm', lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            }
            throw new Error('OSM未找到');
        } catch (e) {
            console.log('OSM失败:', e.message);
            throw e;
        }
    })(),
    (async () => {
        // Photon任务
        try {
            const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchKeyword)}&limit=1`;
            const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
            if (!response.ok) throw new Error('Photon请求失败');
            const data = await response.json();
            if (data.features && data.features.length > 0) {
                const [lng, lat] = data.features[0].geometry.coordinates;
                return { source: 'photon', lat: parseFloat(lat), lng: parseFloat(lng) };
            }
            throw new Error('Photon未找到');
        } catch (e) {
            console.log('Photon失败:', e.message);
            throw e;
        }
    })()
]);

                                              const { lat, lng, source } = results;
                
                // ===== 优先查数据库（无论中文英文） =====
                let cityData = null;
                let cityName = searchKeyword;

                // 先尝试用原始关键词查数据库
              const isQuark = navigator.userAgent.toLowerCase().includes('quark');
const searchRes = await fetch(`/api/search?q=${encodeURIComponent(searchKeyword)}`, {
    headers: { 'ngrok-skip-browser-warning': 'true' },
    cache: isQuark ? 'no-cache' : 'default'  // 夸克强制无缓存
});
                const searchResult = await searchRes.json();
                if (searchResult && searchResult.length > 0) {
                    cityData = searchResult;
                    console.log(`✅ 直接命中数据库: ${searchResult[0].name_cn}`);
                }

                // 如果没命中，再走逆地理编码流程
                if (!cityData) {
                    try {
                        const revUrl = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${AMAP_KEY}&extensions=base`;
                        const revRes = await fetch(revUrl);
                        const revData = await revRes.json();
                        if (revData.status === '1' && revData.regeocode) {
                            cityName = revData.regeocode.addressComponent.city || revData.regeocode.addressComponent.district || searchKeyword;
                        }
                    } catch(e) {}
                    // 用逆地理编码得到的地名再次查询数据库（如果地名不同的话）
                    if (cityName !== searchKeyword) {
                        const cityRes = await fetch(`/api/search?q=${encodeURIComponent(cityName)}`, {
    headers: { 'ngrok-skip-browser-warning': 'true' },
    cache: isQuark ? 'no-cache' : 'default'
});
                        const cityData2 = await cityRes.json();
                        if (cityData2 && cityData2.length > 0) {
                            cityData = cityData2;
                        }
                    }
                }

 if (cityData && cityData.length > 0) {
                    const city = cityData[0];
                    currentCityData = city;
                    updateAll(city.lat, city.lng);
                    const displayCN = city.poem || DEFAULT_POEM_CN;
                    const displayEN = city.poem_en || DEFAULT_POEM_EN;
                    const poemHTML = `${displayCN}<br>${displayEN}`;
                    document.getElementById('poemDisplay').innerHTML = poemHTML;
                    addToHistory(cityName);

                    // ===== 调用通用处理（缓存 + 日限 + 礼物） =====
                    await handleSearchSuccess(city.lat, city.lng, cityName, city);
                } else {
                    const originalCityName = searchKeyword;
                    const antipode = calculateAntipode(lat, lng);
                    updateAll(lat, lng);
                    const poemHTML = '「这一刻，你与地球背面，同频呼吸。」<br>In this moment, you breathe in sync with the far side of the earth.';
                    document.getElementById('poemDisplay').innerHTML = poemHTML;
                    addToHistory(searchKeyword);

                    // ===== 获取对跖点名称 =====
                    let antipodeName = '地球另一端';
                    let antipodeNameEn = '';
                    try {
                        const geoRes = await fetch(`/api/reverse-geocode?lng=${antipode.lng}&lat=${antipode.lat}`, {
                            headers: { 'ngrok-skip-browser-warning': 'true' }
                        });
                        const geoData = await geoRes.json();
                        if (geoData.success && geoData.name) {
                            antipodeName = geoData.name;
                            antipodeNameEn = geoData.nameEn || '';
                        }
                    } catch (e) {
                        console.warn('获取对跖点名称失败:', e);
                    }

                    // ===== 城市名英文（拼音） =====
                    let nameEn = originalCityName;
                    if (/[\u4e00-\u9fa5]/.test(originalCityName)) {
                        try {
                            const pinyinRes = await fetch(`/api/get-pinyin?text=${encodeURIComponent(originalCityName)}`, {
                                headers: { 'ngrok-skip-browser-warning': 'true' }
                            });
                            const pinyinData = await pinyinRes.json();
                            if (pinyinData.success) {
                                nameEn = pinyinData.pinyin;
                            }
                        } catch (e) {
                            nameEn = originalCityName;
                        }
                    }

                    currentCityData = {
                        lat,
                        lng,
                        name_cn: originalCityName,
                        name_en: nameEn,
                        antipode_name: antipodeName,
                        antipode_name_en: antipodeNameEn,
                        poem: '「这一刻，你与地球背面，同频呼吸。」\nIn this moment, you breathe in sync with the far side of the earth.'
                    };

                    // ===== 调用通用处理（缓存 + 日限） =====
                    await handleSearchSuccess(lat, lng, originalCityName, null);
                }

          } catch (e) {
    console.log('❌ 搜索失败:', e.message);
    if (retryCount < 1) {
        console.log('🔄 搜索失败，自动重试...');
        isSearching = false;
        document.getElementById('searchBtn').disabled = false;
        showLoading(false);
        setTimeout(() => {
            searchLocation(keyword, retryCount + 1);
        }, 500);
        return;
    }
    alert(`未找到“${searchKeyword}”的相关结果，请检查拼写后重试`);
} finally {
    isSearching = false;
    document.getElementById('searchBtn').disabled = false;
    showLoading(false);
}
        }

        // ===== 定位 =====
        function getMyLocation() {
    window._currentGift = null;
            if (!navigator.geolocation) { alert('浏览器不支持定位'); return; }
            showLoading(true);
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    try {
                       const cityRes = await fetch(`/api/search?q=${latitude.toFixed(4)},${longitude.toFixed(4)}`, {
    headers: { 'ngrok-skip-browser-warning': 'true' }
});
                        const cityData = await cityRes.json();
                        if (cityData && cityData.length > 0) {
                            const city = cityData[0];
                            currentCityData = city;
                            updateAll(city.lat, city.lng);
                            const displayCN = city.poem || DEFAULT_POEM_CN;
const displayEN = city.poem_en || DEFAULT_POEM_EN;
document.getElementById('poemDisplay').innerHTML = `${displayCN}<br>${displayEN}`;
                            addToHistory(city.name_cn);
                                                      // ===== 物产触发逻辑（原点在中国即触发） =====
                           triggerGiftForLocation(city.lat, city.lng, city);
                        } else {
                            const antipode = calculateAntipode(latitude, longitude);
                            updateAll(latitude, longitude);
                            document.getElementById('poemDisplay').innerHTML = `${DEFAULT_POEM_CN}<br>${DEFAULT_POEM_EN}`;
                            // ===== 物产触发逻辑（原点在中国即触发） =====
                            triggerGiftForLocation(latitude, longitude, null);
                        }
                    } catch(e) {
                        const antipode = calculateAntipode(latitude, longitude);
                        updateAll(latitude, longitude);
                        document.getElementById('poemDisplay').innerHTML = `${DEFAULT_POEM_CN}<br>${DEFAULT_POEM_EN}`;
                    }
                    showLoading(false);
                },
                () => { alert('定位失败'); showLoading(false); }
            );
        }

        // ===== 礼物系统（增强版：带错误捕获） =====
        function showGift(city) {
            try {
                if (!city.gift_id) {
                    console.warn('showGift: 没有 gift_id，跳过');
                    return;
                }
                console.log('showGift 收到的 city:', city);
                console.log('city.gift_name_en:', city.gift_name_en);
                console.log('city.gift_description_en:', city.gift_description_en);

                const gift = {
                    id: city.gift_id,
                    name: city.gift_name || '一份礼物',
                    name_en: city.gift_name_en || '',
                    description: city.gift_description || '来自地球另一端的风物',
                    description_en: city.gift_description_en || '',
                    image: city.gift_image_ripe || '',
                    imageGreen: city.gift_image_green || '',
                    hasGreen: city.gift_has_green || 0,
                    poemRipe: city.gift_poem_ripe || '',
                    poemRipe_en: city.gift_poem_ripe_en || '',
                    poemGreen: city.gift_poem_green || '',
                    from: city.antipode_name || '地球另一端'
                };
                console.log('构造的 gift:', gift);

                let state = 'ripe';
                let image = gift.image;
                let poem = gift.poemRipe;
                let icon = '🎁';

                if (gift.hasGreen && Math.random() < 0.30) {
                    state = 'green';
                    image = gift.imageGreen || gift.image;
                    poem = gift.poemGreen || '还在努力生长，等你下次来会更美好';
                    icon = '🌱';
                }

                // 获取所有 DOM 元素（逐个检查是否存在）
                const elements = {
                    giftIcon: document.getElementById('giftIcon'),
                    giftName: document.getElementById('giftName'),
                    giftDesc: document.getElementById('giftDesc'),
                    giftFromPlace: document.getElementById('giftFromPlace'),
                    giftFromEn: document.getElementById('giftFromEn'),
                    giftImageContainer: document.getElementById('giftImageContainer'),
                    giftOverlay: document.getElementById('giftOverlay')
                };

                // 检查每个元素是否存在
                for (const [key, el] of Object.entries(elements)) {
                    if (!el) {
                        console.error(`❌ showGift: 找不到元素 #${key}`);
                        alert(`礼物显示异常，缺少 #${key}，请检查 HTML`);
                        return;
                    }
                }

                // 填充内容
                elements.giftIcon.textContent = icon;
                elements.giftName.textContent = gift.name;
                elements.giftDesc.textContent = poem || gift.description;

                // 底部产地信息
                elements.giftFromPlace.textContent = `——${gift.from}`;

                // 产地英文（带映射）
                const placeMap = {
                    '瓦尔德斯半岛': 'Península Valdés',
                    '阿根廷': 'Argentina',
                    '智利': 'Chile',
                    '太平洋': 'Pacific Ocean',
                    '大西洋': 'Atlantic Ocean',
                    '安第斯山脉': 'Andes Mountains',
                    '巴塔哥尼亚': 'Patagonia',
                    '潘帕斯草原': 'Pampas Grassland',
                    '布宜诺斯艾利斯': 'Buenos Aires',
                    '圣地亚哥': 'Santiago',
                };
                const fromEn = placeMap[gift.from] || gift.from;
                elements.giftFromEn.textContent = `A gentle breeze from the far side of the earth — ${fromEn}`;

                // 礼物图片
                const displayImage = image;
                if (displayImage) {
                    elements.giftImageContainer.innerHTML = `<img src="${displayImage}" alt="${gift.name}">`;
                } else {
                    elements.giftImageContainer.innerHTML = `<div class="placeholder">🎁</div>`;
                }

                console.log('准备存入 _currentGift 的 gift:', gift);
                window._currentGift = { ...gift, state, image, poem };

                // 显示弹窗
                elements.giftOverlay.classList.add('active');
                console.log('✅ 礼物弹窗已显示');
            } catch (e) {
                console.error('❌ showGift 执行出错:', e);
                alert('礼物加载失败，请重试');
            }
        }
        function closeGift() {
            document.getElementById('giftOverlay').classList.remove('active');
        }

        document.getElementById('giftCloseBtn').addEventListener('click', closeGift);
        document.getElementById('giftCloseBtn2').addEventListener('click', closeGift);
        document.getElementById('giftOverlay').addEventListener('click', function(e) {
            if (e.target === this) closeGift();
        });

        

        document.getElementById('giftShareBtn').addEventListener('click', function() {
            closeGift();
            setTimeout(() => {
                if (currentCityData) {
                    generateShareCard(currentCityData);
                }
            }, 300);
        });
       

// ===== 判断原点是否在中国 =====
function isInChina(lat, lng) {
    return lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135;
}
function getAntipodeRegion(antiLat, antiLng) {
    // ===== 1. 太平洋优先（南美西海岸外海） =====
    // 放宽到 -71°，覆盖更多海洋区域
    if (antiLng < -71.2 && antiLat > -55 && antiLat < -12) {
        return { type: 'ocean', region: 'pacific' };
    }
    // 太平洋宽泛区域（东经>120 或 西经<-80）
    if ((antiLng >= 120 && antiLng <= 180) || (antiLng >= -180 && antiLng < -80)) {
        return { type: 'ocean', region: 'pacific' };
    }

    // ===== 2. 南美洲陆地 =====
    const isSouthAmerica = antiLat > -55 && antiLat < 12 && antiLng > -82 && antiLng < -34;
    if (isSouthAmerica) {
        // 智利：经度范围 -72 到 -65（严格限定）
        if (antiLat > -55 && antiLat < -20 && antiLng >= -72 && antiLng < -65) {
            return { type: 'land', country: '智利' };
        }
        // 阿根廷：经度 -65 到 -55
        if (antiLat > -55 && antiLat < -20 && antiLng >= -65 && antiLng < -55) {
            return { type: 'land', country: '阿根廷' };
        }
        // ... 其他国家判断（秘鲁、巴西等）
        // 秘鲁/厄瓜多尔
        if (antiLat > -18 && antiLat < 0 && antiLng > -82 && antiLng < -68) {
            return { type: 'land', country: '秘鲁' };
        }
        // 巴西
        if (antiLat > -33 && antiLat < 5 && antiLng > -74 && antiLng < -34) {
            return { type: 'land', country: '巴西' };
        }
        // 玻利维亚
        if (antiLat > -23 && antiLat < -8 && antiLng > -70 && antiLng < -57) {
            return { type: 'land', country: '玻利维亚' };
        }
        // 巴拉圭
        if (antiLat > -27 && antiLat < -19 && antiLng > -63 && antiLng < -54) {
            return { type: 'land', country: '巴拉圭' };
        }
        // 乌拉圭
        if (antiLat > -35 && antiLat < -30 && antiLng > -58 && antiLng < -53) {
            return { type: 'land', country: '乌拉圭' };
        }
        // 默认南美洲 → 改为 '阿根廷'（确保匹配数据库）
        return { type: 'land', country: '阿根廷' };
    }

    // ===== 3. 大西洋 =====
    if (antiLng >= -75 && antiLng <= -10) {
        return { type: 'ocean', region: 'atlantic' };
    }

    // ===== 4. 印度洋 =====
    if (antiLng >= 30 && antiLng <= 120) {
        return { type: 'ocean', region: 'indian' };
    }

    // ===== 5. 非洲 =====
    if (antiLng >= -15 && antiLng <= 50 && antiLat > -35 && antiLat < 37) {
        return { type: 'land', country: '非洲' };
    }

    // ===== 6. 欧洲 =====
    if (antiLat > 35 && antiLat < 70 && antiLng > -10 && antiLng < 40) {
        return { type: 'land', country: '欧洲' };
    }

    // ===== 7. 亚洲 =====
    if (antiLat > 10 && antiLat < 75 && antiLng > 40 && antiLng < 180) {
        return { type: 'land', country: '亚洲' };
    }

    // ===== 8. 大洋洲 =====
    if (antiLat > -45 && antiLat < -10 && antiLng > 110 && antiLng < 180) {
        return { type: 'land', country: '大洋洲' };
    }

    // ===== 9. 兜底 =====
    return { type: 'ocean', region: 'pacific' };
}


// ===== 物产触发核心函数（基于地理坐标，不依赖数据库关联） =====
function triggerGiftForLocation(lat, lng, cityObj) {
    console.log('🔔 triggerGiftForLocation 被调用', { lat, lng, cityObj });
    // 1. 判断原点是否在中国
    if (!isInChina(lat, lng)) return;
    
    // 2. 计算对跖点
    const anti = calculateAntipode(lat, lng);
    const antiLat = anti.lat;
    const antiLng = anti.lng;
    
    // 3. 判断对跖点位置
    const region = getAntipodeRegion(antiLat, antiLng);
    
    // 4. 构建请求URL
    let url;
    if (region.type === 'land') {
        url = `/api/gifts/by-type?type=land&country=${encodeURIComponent(region.country)}`;
    } else {
        url = `/api/gifts/by-type?type=ocean&ocean_region=${region.region}`;
    }
    
    // 5. 请求物产并触发
   fetch(url, {
    headers: { 'ngrok-skip-browser-warning': 'true' }
})
    .then(res => res.json())
    .then(gifts => {
        if (gifts.length > 0 && Math.random() < 0.15) {
            const randomGift = gifts[Math.floor(Math.random() * gifts.length)];
            // 构造包含物产的 city 对象
            const giftCity = cityObj || {};
            giftCity.gift_id = randomGift.id;
            giftCity.gift_name = randomGift.name_cn;
            giftCity.gift_name_en = randomGift.name_en;
            giftCity.gift_description = randomGift.description;
            giftCity.gift_description_en = randomGift.description_en;
            giftCity.gift_image_ripe = randomGift.image_ripe; 
            giftCity.gift_poem_ripe = randomGift.poem_ripe;
            giftCity.gift_poem_ripe_en = randomGift.poem_ripe_en;
            giftCity.gift_has_green = randomGift.has_green;
            // 对跖点名称（用于显示来源）
            if (!giftCity.antipode_name) {
                giftCity.antipode_name = region.country || '地球另一端';
            }
            showGift(giftCity);
        }
    })
    .catch(() => {});
}
// ===== 获取主题底图 =====
function getThemeBg(city) {
    // 🎨 底图池 —— 把你的底图放在 public/images/share-bg/ 目录下
    const bgList = [
        '/images/share-bg/card01.png',
        '/images/share-bg/card02.png',
        '/images/share-bg/card03.png',
        '/images/share-bg/card04.png',
    ];
    
    // 每次随机选一张
    const index = Math.floor(Math.random() * bgList.length);
    return bgList[index];
}

async function generateShareCard(city) {
    if (!city) {
        alert('请先搜索一个城市');
        return;
    }

    const canvas = document.getElementById('shareCanvas');
    const ctx = canvas.getContext('2d');
    const W = 600, H = 800;
    canvas.width = W;
    canvas.height = H;

    // ===== 1. 绘制底图 =====
    let bgImage = null;
    try {
        const bgPath = getThemeBg(city);
        bgImage = await loadImage(bgPath);
    } catch (e) {
        console.warn('底图加载失败，使用渐变背景');
    }

    if (bgImage) {
        ctx.drawImage(bgImage, 0, 0, W, H);
    } else {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#f5f0e8');
        grad.addColorStop(0.5, '#e8e0d5');
        grad.addColorStop(1, '#d9cfc0');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }

    const textColor = '#1a2a4a';
    const accentColor = '#e8923a';

    // ===== 修改点1：新的默认诗句（中文 + 英文） =====
    const DEFAULT_POEM_CN = '「这一刻，你与地球背面，同频呼吸。」';
    const DEFAULT_POEM_EN = 'In this moment, you breathe in sync with the far side of the earth.';
    const DEFAULT_BOTTOM_CN = '穿越地心，抵达你的另一端';
    const DEFAULT_BOTTOM_EN = 'Cross the core, meet your far side.';

        // ===== 2. 顶部品牌区 =====
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = textColor;
    ctx.font = 'bold 28px "Noto Serif SC", "Noto Sans SC", serif';
    const brandMain = detectBrand() === 'en' ? 'Antipodal Bureau' : '对跖点漫游局';
ctx.fillText(brandMain, W/2, 20);   // 移除星标

    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.6;
    ctx.font = '400 16px "Noto Serif SC", "Noto Sans SC", serif';
   const brandSub = detectBrand() === 'en' ? '对跖点漫游局' : 'Antipodal Bureau';
ctx.fillText(brandSub, W/2, 60);
    ctx.globalAlpha = 1.0;
function drawTeardropOnCanvas(ctx, cx, cy, color, size) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.8);
    ctx.bezierCurveTo(
        cx + size * 0.5, cy + size * 0.2,
        cx + size * 0.6, cy - size * 0.1,
        cx + size * 0.3, cy - size * 0.5
    );
    ctx.bezierCurveTo(
        cx + size * 0.15, cy - size * 0.7,
        cx - size * 0.15, cy - size * 0.7,
        cx - size * 0.3, cy - size * 0.5
    );
    ctx.bezierCurveTo(
        cx - size * 0.6, cy - size * 0.1,
        cx - size * 0.5, cy + size * 0.2,
        cx, cy + size * 0.8
    );
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx - size * 0.2, cy - size * 0.3, size * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();

    ctx.restore();
}

    // ===== 3. 地图区域 =====
    const topMargin = 76;
    const gap = 12;
    const imgWidth = (W - 24 * 2 - gap) / 2;
    const imgHeight = imgWidth;
    const imgY = topMargin + 30;

    // ---- 3a. 加载地图图片 ----
    let originImg = null;
    let antipodeImg = null;

    if (city.origin_image) originImg = await loadImage(city.origin_image);
    if (city.antipode_image) antipodeImg = await loadImage(city.antipode_image);

        if (!originImg && city.lat && city.lng) {
        const size = Math.round(imgWidth);
        const ts = Date.now();
        originImg = await loadImage(`/api/static-map?lng=${city.lng}&lat=${city.lat}&size=${size}&zoom=3&color=0xE8923A&t=${ts}`);
    }

    let antiLat = city.antipode_lat;
    let antiLng = city.antipode_lng;
    if (!antiLat || !antiLng) {
        const anti = calculateAntipode(city.lat, city.lng);
        antiLat = anti.lat;
        antiLng = anti.lng;
    }
        if (!antipodeImg && antiLat && antiLng) {
        const size = Math.round(imgWidth);
        const ts = Date.now();
        antipodeImg = await loadImage(`/api/static-map?lng=${antiLng}&lat=${antiLat}&size=${size}&zoom=3&color=0x2898E8&t=${ts}`);
    }

         // ---- 3b. 地图标签 + 经纬度 ----
    const originCoordText = formatCoord(city.lat, city.lng);
    const antiCoordText = formatCoord(antiLat, antiLng);

    ctx.textBaseline = 'bottom';
    ctx.fillStyle = textColor;

    // 左侧：原始位置（左对齐，保持不变）
    ctx.textAlign = 'left';
    const leftX = 24;
    ctx.font = '500 16px "Noto Serif SC", "Noto Sans SC", serif';
    const leftLabel = '原始位置';
    const leftLabelWidth = ctx.measureText(leftLabel).width;
    ctx.fillText(leftLabel, leftX, imgY + 10);
    ctx.font = '400 14px "Noto Serif SC", "Noto Sans SC", serif';
    ctx.fillText(originCoordText, leftX + leftLabelWidth + 8, imgY + 10);

    // 右侧：对跖点（标签右对齐，坐标放在标签左侧，空一个字的距离）
    const rightX = 24 + imgWidth + gap;
    const rightEdge = rightX + imgWidth; // 右侧地图右边缘

    // 先测量“对跖点”标签宽度，用于计算坐标位置
    ctx.font = '500 16px "Noto Serif SC", "Noto Sans SC", serif';
    const rightLabel = '对跖点';
    const rightLabelWidth = ctx.measureText(rightLabel).width;

    // 绘制标签（右对齐）
    ctx.textAlign = 'right';
    ctx.fillText(rightLabel, rightEdge, imgY + 10);

    // 绘制坐标（右对齐，放在标签左侧，空一个字的距离）
    ctx.textAlign = 'right';
    ctx.font = '400 14px "Noto Serif SC", "Noto Sans SC", serif';
    // 一个字的距离估算为 8px（14px 字体下的空格宽度）
    const spaceWidth = 8;
    ctx.fillText(antiCoordText, rightEdge - rightLabelWidth - spaceWidth, imgY + 10);

    // ---- 3c. 邮票齿孔路径生成器 ----
    function createStampPath(rx, ry, rw, rh) {
        const tooth = 10;
        const cornerRadius = tooth;
        const cols = Math.max(6, Math.floor((rw - 2 * cornerRadius) / 24));
        const rows = Math.max(4, Math.floor((rh - 2 * cornerRadius) / 24));
        const stepX = (rw - 2 * cornerRadius) / cols;
        const stepY = (rh - 2 * cornerRadius) / rows;

        const path = new Path2D();
        path.moveTo(rx, ry + cornerRadius);
        path.arc(rx + cornerRadius, ry + cornerRadius, cornerRadius, Math.PI, -Math.PI / 2, false);

        for (let i = 0; i < cols; i++) {
            const cx = rx + cornerRadius + (i + 0.5) * stepX;
            path.lineTo(cx - tooth, ry);
            path.arc(cx, ry, tooth, Math.PI, 0, true);
        }
        path.arc(rx + rw - cornerRadius, ry + cornerRadius, cornerRadius, -Math.PI / 2, 0, false);

        for (let i = 0; i < rows; i++) {
            const cy = ry + cornerRadius + (i + 0.5) * stepY;
            path.lineTo(rx + rw, cy - tooth);
            path.arc(rx + rw, cy, tooth, -Math.PI / 2, Math.PI / 2, true);
        }
        path.arc(rx + rw - cornerRadius, ry + rh - cornerRadius, cornerRadius, 0, Math.PI / 2, false);

        for (let i = cols - 1; i >= 0; i--) {
            const cx = rx + cornerRadius + (i + 0.5) * stepX;
            path.lineTo(cx + tooth, ry + rh);
            path.arc(cx, ry + rh, tooth, 0, Math.PI, true);
        }
        path.arc(rx + cornerRadius, ry + rh - cornerRadius, cornerRadius, Math.PI / 2, Math.PI, false);

        for (let i = rows - 1; i >= 0; i--) {
            const cy = ry + cornerRadius + (i + 0.5) * stepY;
            path.lineTo(rx, cy + tooth);
            path.arc(rx, cy, tooth, Math.PI / 2, -Math.PI / 2, true);
        }
        path.closePath();
        return path;
    }

    // ---- 3d. 绘制两张邮票地图 ----
const x1 = 24;
const x2 = 24 + imgWidth + gap;
const y = typeof imgY !== 'undefined' ? imgY + 16 : 80;
const padding = 16;

[
    { img: originImg, x: x1, label: '📍 原始位置' },
    { img: antipodeImg, x: x2, label: '🌎 对跖点' }
].forEach((item) => {
    const rx = item.x;
    const ry = y;
    const rw = imgWidth;
    const rh = imgHeight;

    const stampPath = createStampPath(rx, ry, rw, rh);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#ffffff';
    ctx.fill(stampPath);
    ctx.restore();

    ctx.save();
    ctx.clip(stampPath);
    if (item.img) {
        // 1. 绘制地图
        ctx.drawImage(item.img, rx + padding, ry + padding, rw - padding * 2, rh - padding * 2);

        // 2. 绘制水滴标记（地图中心）
        const markerSize = Math.min(rw, rh) * 0.10;
        const color = item.label === '📍 原始位置' ? '#e8923a' : '#2898e8';
        drawTeardropOnCanvas(ctx, rx + rw / 2, ry + rh / 2, color, markerSize);
    } else {
        ctx.fillStyle = '#e8e0d6';
        ctx.fillRect(rx + padding, ry + padding, rw - padding * 2, rh - padding * 2);
        ctx.fillStyle = '#999';
        ctx.font = '14px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.label, rx + rw / 2, ry + rh / 2);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(160, 150, 140, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke(stampPath);
    ctx.restore();
});
    // ===== 绘制邮戳（横跨两张地图中间，像连接封条） =====
    try {
        const stampImg = await loadImage('/images/stamp.png');
        if (stampImg) {
            const stampSize = 150; // 邮戳大小，可调整
            
            // 计算横跨位置：左图右边缘 + 右图左边缘 的中间
            const leftEdge = x1 + imgWidth;   // 左图右边缘
            const rightEdge = x2;              // 右图左边缘
            const centerX = (leftEdge + rightEdge) / 2;  // 两张图的中间
            const centerY = y + imgHeight / 2;            // 垂直居中
            
            ctx.save();
            // 60% 透明度（0.6）
            ctx.globalAlpha = 0.6;
            // 略微旋转，模拟真实盖章
            ctx.translate(centerX, centerY);
            ctx.rotate(-6 * Math.PI / 180);
            ctx.drawImage(stampImg, -stampSize/2, -stampSize/2, stampSize, stampSize);
            ctx.restore();
        }
    } catch (e) {
        console.warn('邮戳加载失败:', e);
    }
    // ===== 4. 城市名 =====
    const titleY = y + imgHeight + 6;
    const cityNameEn = city.name_en || city.name_cn;
    const antiNameEn = city.antipode_name_en || '';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = textColor;
    ctx.font = '600 18px "Noto Serif SC", "Noto Sans SC", serif';
    ctx.fillText(`${city.name_cn}`, x1 + imgWidth / 2, titleY);
    ctx.fillText(`${city.antipode_name || '地球另一端'}`, x2 + imgWidth / 2, titleY);

    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.6;
    ctx.font = '400 16px "Noto Serif SC", "Noto Sans SC", serif';
    ctx.fillText(`(${cityNameEn})`, x1 + imgWidth / 2, titleY + 26);
    ctx.fillText(antiNameEn ? `(${antiNameEn})` : '', x2 + imgWidth / 2, titleY + 26);
    ctx.globalAlpha = 1.0;

                // ===== 5. 人文短句 =====
    const maxWidth = W - 48;
    const poemY = titleY + 78;
    const gift = window._currentGift;
    const hasGift = gift && gift.name;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // ---- 中文诗句 ----
    let poemCN = city.poem || DEFAULT_POEM_CN;

    // 如果 city.poem 是旧版（包含「此刻，你脚下的土地」），替换为新版
    if (poemCN.includes('「此刻，你脚下的土地，正与地球另一端悄然相连」')) {
        poemCN = DEFAULT_POEM_CN;
    }

    // 检查是否包含换行符（说明 poem 中嵌入了英文）
    const hasEmbeddedEN = poemCN.includes('\n');
    let lineY = poemY;

    if (hasEmbeddedEN) {
        // ---- 有嵌入英文：拆分成中文和英文分别绘制 ----
        const parts = poemCN.split('\n');
        const poemCNPart = parts[0] || DEFAULT_POEM_CN;
        const poemENPart = parts[1] || '';

        // 绘制中文
        ctx.fillStyle = textColor;
        ctx.globalAlpha = 0.8;
        ctx.font = 'italic 400 18px "Noto Serif SC", "Noto Sans SC", serif';
        const poemLines = wrapText(ctx, poemCNPart, maxWidth);
        poemLines.forEach(line => {
            ctx.fillText(line, W / 2, lineY);
            lineY += 30;
        });

        // 绘制英文（如果有）
        if (poemENPart && poemENPart.trim()) {
            ctx.fillStyle = textColor;
            ctx.globalAlpha = 0.5;
            ctx.font = 'italic 400 14px "Noto Serif SC", "Noto Sans SC", serif';
            const poemEnLines = wrapText(ctx, poemENPart, maxWidth);
            poemEnLines.forEach(line => {
                ctx.fillText(line, W / 2, lineY);
                lineY += 24;
            });
        }
        // 已显示嵌入的英文，标记不再单独显示英文
        var hasShownEmbeddedEN = true;
    } else {
        // ---- 没有嵌入英文：正常显示中文 ----
        ctx.fillStyle = textColor;
        ctx.globalAlpha = 0.8;
        ctx.font = 'italic 400 18px "Noto Serif SC", "Noto Sans SC", serif';
        const poemLines = wrapText(ctx, poemCN, maxWidth);
        poemLines.forEach(line => {
            ctx.fillText(line, W / 2, lineY);
            lineY += 30;
        });
        var hasShownEmbeddedEN = false;
    }

    // ---- 英文诗句（仅在无物产、且没有嵌入英文时单独显示） ----
    if (!hasGift && !hasShownEmbeddedEN) {
        let poemEN = city.poem_en || DEFAULT_POEM_EN;
        if (poemEN === 'Cross the core, meet your far side.') {
            poemEN = DEFAULT_POEM_EN;
        }
        if (poemEN && poemEN.trim()) {
            ctx.fillStyle = textColor;
            ctx.globalAlpha = 0.5;
            ctx.font = 'italic 400 14px "Noto Serif SC", "Noto Sans SC", serif';
            const poemEnLines = wrapText(ctx, poemEN, maxWidth);
            poemEnLines.forEach(line => {
                ctx.fillText(line, W / 2, lineY);
                lineY += 24;
            });
        }
    }
    ctx.globalAlpha = 1.0;

        // ===== 6. 物产区域 或 底部标语 =====
    let currentY = lineY + 12;
    const bottomBrandY = H - 44;
    // gift 和 hasGift 已在第 5 部分声明，直接使用

    if (hasGift) {
                // ---------- 计算布局 ----------
        const imgSize = 180;
        // 右图中心 X 坐标（对跖点地图中心）
        const rightMapCenterX = x2 + imgWidth / 2;
        const imgX = rightMapCenterX - imgSize / 2 + 16;  // 向右移动 16px（约两个中文字宽度）
        const imgY = currentY;
        const textX = 24;
        // 文字区域最大宽度（图片左侧 - 文字左侧 - 间距）
        const maxTextWidth = imgX - textX - 16;

        // ---------- 加载物产图片 ----------
        let productImg = null;
        if (gift.image) {
            productImg = await loadImage(gift.image);
        }

        // ---------- 绘制物产图片（右侧，无图框） ----------
if (productImg) {
    // 直接绘制图片，不带圆角裁剪和边框
    ctx.drawImage(productImg, imgX, imgY, imgSize, imgSize);
} else {
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, imgX, imgY, imgSize, imgSize, 12);
    ctx.fillStyle = 'rgba(26,42,74,0.05)';
    ctx.fill();
    ctx.fillStyle = 'rgba(26,42,74,0.15)';
    ctx.font = '40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎁', imgX + imgSize/2, imgY + imgSize/2);
    ctx.restore();
}

        // ---------- 绘制左侧文字信息 ----------
        let textY = imgY;
        const lineHeight = 28;

        // 第一行：礼物标语（18px，斜体）
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.8;
        ctx.font = 'italic 400 18px "Noto Serif SC", "Noto Sans SC", serif';
        const slogan = '✦ 来自地球另一端的风';
        ctx.fillText(slogan, textX, textY);

        // 第一行和第二行之间空一行
        let nameLineY = textY + lineHeight * 2;

        // 第二行：物产中文名（16px，斜体） + 英文名（14px，括号内）
        ctx.fillStyle = textColor;
        ctx.globalAlpha = 1.0;
        ctx.font = '600 16px "Noto Serif SC", "Noto Sans SC", serif';
        const nameText = gift.name || '一份礼物';
        ctx.fillText(nameText, textX, nameLineY);

        if (gift.name_en) {
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.5;
    ctx.font = '400 14px "Noto Serif SC", "Noto Sans SC", serif';
    const nameEnX = textX + ctx.measureText(nameText).width + 16;
    ctx.fillText(`(${gift.name_en})`, nameEnX, nameLineY + 1);
}
        ctx.globalAlpha = 1.0;

        // 第三行：物产文案中文（14px，斜体）
        let descLineY = nameLineY + lineHeight;
        ctx.fillStyle = textColor;
        ctx.globalAlpha = 0.7;
        ctx.font = 'italic 400 14px "Noto Serif SC", "Noto Sans SC", serif';
       const descCN = gift.poemRipe || gift.description || '来自地球另一端的风物';
        const descLines = wrapText(ctx, descCN, maxTextWidth);
        descLines.forEach((line, i) => {
            ctx.fillText(line, textX, descLineY + i * 22);
        });
        const descLinesCount = descLines.length;

        // 第四行：物产文案英文（13px，斜体，半透明）
        let enLineY = descLineY + descLinesCount * 22 + 4;
        const descEN = gift.poemRipe_en || gift.description_en || '';
        if (descEN && descEN.trim()) {
            ctx.fillStyle = textColor;
            ctx.globalAlpha = 0.4;
            ctx.font = 'italic 400 13px "Noto Serif SC", "Noto Sans SC", serif';
            const enLines = wrapText(ctx, descEN, maxTextWidth);
            enLines.forEach((line, i) => {
                ctx.fillText(line, textX, enLineY + i * 20);
            });
            currentY = enLineY + enLines.length * 20 + 20;
        } else {
            currentY = enLineY + 20;
        }

        // 如果文字总高度小于图片高度，以图片高度为准
        const totalTextHeight = currentY - imgY;
        if (totalTextHeight < imgSize) {
            currentY = imgY + imgSize + 16;
        }

    } else {
        // ---------- 无物产：显示底部标语 ----------
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = textColor;
        ctx.globalAlpha = 0.7;
        ctx.font = 'italic 600 18px "Noto Serif SC", "Noto Sans SC", serif';
        ctx.fillText(DEFAULT_BOTTOM_CN, W / 2, currentY);
        ctx.globalAlpha = 0.4;
        ctx.font = 'italic 400 14px "Noto Serif SC", "Noto Sans SC", serif';
        ctx.fillText(DEFAULT_BOTTOM_EN, W / 2, currentY + 28);
        ctx.globalAlpha = 1.0;
        currentY += 58;
    }

               // ===== 7. 底部账号 =====
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.6;

    // 第一行：小红书账号（保持原字体大小 16px）
    ctx.font = '400 16px "Noto Serif SC", "Noto Sans SC", serif';
    ctx.fillText('小红书 @对跖点漫游局，一起分享这次相遇。', W / 2, bottomBrandY + 8);

    // 第二行：域名（比第一行小 2px，即 14px，颜色稍淡）
    ctx.globalAlpha = 0.4;
    ctx.font = '400 14px "Noto Serif SC", "Noto Sans SC", serif';
    ctx.fillText('duizhidian.com', W / 2, bottomBrandY + 30);

    ctx.globalAlpha = 1.0;

    document.getElementById('shareOverlay').classList.add('active');
}
        function loadImage(src) {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = src;
            });
        }

        function roundRect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        }

        function wrapText(ctx, text, maxWidth) {
            if (!text) return [];
            const words = text.split('');
            const lines = [];
            let currentLine = '';
            for (const char of words) {
                const testLine = currentLine + char;
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && currentLine.length > 0) {
                    lines.push(currentLine);
                    currentLine = char;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);
            return lines;
        }
               
                      // ===== 分享卡按钮 =====
        document.getElementById('shareBtn').addEventListener('click', function() {
            if (currentCityData) {
                generateShareCard(currentCityData);
            } else {
                alert('请先搜索一个城市');
            }
        });

        document.getElementById('shareCloseBtn').addEventListener('click', function() {
            document.getElementById('shareOverlay').classList.remove('active');
        });
        document.getElementById('shareCloseBtn2').addEventListener('click', function() {
            document.getElementById('shareOverlay').classList.remove('active');
        });
        document.getElementById('shareOverlay').addEventListener('click', function(e) {
            if (e.target === this) {
                document.getElementById('shareOverlay').classList.remove('active');
            }
        });

                            // ===== shareDownloadBtn 保存图片（夸克浏览器兼容版） =====
        document.getElementById('shareDownloadBtn').addEventListener('click', function() {
            const canvas = document.getElementById('shareCanvas');
            const fileName = `对跖点分享卡_${currentCityData?.name_cn || '未知'}.png`;
            const btn = this;
            const originalText = btn.textContent;

            // 检测是否为夸克浏览器
            const isQuark = navigator.userAgent.toLowerCase().includes('quark');
            
            if (isQuark) {
                // 夸克浏览器：直接使用长按保存方案（绕开 toBlob）
                console.log('📱 检测到夸克浏览器，直接使用长按保存');
                btn.textContent = '⏳ 加载中...';
                btn.disabled = true;
                // 延迟一下让 UI 更新
                setTimeout(function() {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    showLongPressSave(canvas, fileName);
                }, 300);
                return;
            }

            // 非夸克浏览器：正常走 toBlob 流程
            let blobCalled = false;
            let timeoutId = null;

            btn.textContent = '⏳ 保存中...';
            btn.disabled = true;

            // 超时保护：如果 3 秒内 toBlob 未回调，直接降级为长按保存
            timeoutId = setTimeout(function() {
                if (!blobCalled) {
                    console.warn('toBlob 超时，降级为长按保存');
                    btn.textContent = originalText;
                    btn.disabled = false;
                    showLongPressSave(canvas, fileName);
                }
            }, 3000);

            canvas.toBlob(function(blob) {
                blobCalled = true;
                clearTimeout(timeoutId);

                btn.textContent = originalText;
                btn.disabled = false;

                if (!blob) {
                    showLongPressSave(canvas, fileName);
                    return;
                }

                try {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = fileName;
                    link.href = url;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(function() {
                        URL.revokeObjectURL(url);
                    }, 1000);
                } catch (e) {
                    console.warn('下载失败，降级为长按保存:', e.message);
                    showLongPressSave(canvas, fileName);
                }
            }, 'image/png');
        });

                                    // ===== 降级方案：夸克浏览器优化版 =====
        function showLongPressSave(canvas, fileName) {
            try {
                console.log('📸 执行长按保存降级方案');
                
                const isQuark = navigator.userAgent.toLowerCase().includes('quark');
                const previewContainer = document.getElementById('sharePreviewContainer');
                if (!previewContainer) {
                    console.error('预览容器不存在');
                    return;
                }

                // 夸克浏览器：尝试生成缩小版图片下载
                if (isQuark) {
                    console.log('📱 夸克浏览器：尝试缩小图片下载');
                    
                    // 缩小 Canvas 尺寸（原 600x800 → 400x533）
                    const scaledCanvas = document.createElement('canvas');
                    const scale = 0.67; // 缩小比例
                    scaledCanvas.width = Math.round(canvas.width * scale);
                    scaledCanvas.height = Math.round(canvas.height * scale);
                    const sCtx = scaledCanvas.getContext('2d');
                    sCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
                    
                    // 尝试生成数据 URL（夸克支持较小尺寸）
                    try {
                        const dataUrl = scaledCanvas.toDataURL('image/png');
                        if (dataUrl && dataUrl.length < 500000) { // 小于 500KB
                            // 下载缩小版图片
                            const link = document.createElement('a');
                            link.download = fileName.replace('.png', '_缩小版.png');
                            link.href = dataUrl;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            // 提示用户
                            const btn = document.getElementById('shareDownloadBtn');
                            if (btn) {
                                btn.textContent = '✅ 已保存（缩小版）';
                                btn.style.background = '#27ae60';
                                setTimeout(() => {
                                    btn.textContent = '💾 保存图片';
                                    btn.style.background = '#e8923a';
                                }, 3000);
                            }
                            console.log('✅ 夸克缩小版图片下载成功');
                            return;
                        }
                    } catch (e) {
                        console.warn('缩小版生成失败:', e.message);
                    }
                    
                    // 如果缩小版也失败，降级为截图引导（但提示更友好）
                    console.log('📱 缩小版失败，降级为截图引导');
                    showScreenshotGuide(canvas, previewContainer);
                    return;
                }

                // 非夸克：原逻辑（生成图片 + 长按引导）
                const dataUrl = canvas.toDataURL('image/png');
                if (!dataUrl || dataUrl === 'data:,') {
                    // 生成失败，降级截图
                    showScreenshotGuide(canvas, previewContainer);
                    return;
                }
                
                // 创建图片元素
                const img = document.createElement('img');
                img.src = dataUrl;
                img.style.width = '100%';
                img.style.height = 'auto';
                img.style.borderRadius = '12px';
                img.style.display = 'block';
                img.style.maxHeight = '65vh';
                img.style.objectFit = 'contain';

                const canvasEl = document.getElementById('shareCanvas');
                if (canvasEl) canvasEl.style.display = 'none';

                const wrapper = document.createElement('div');
                wrapper.style.width = '100%';
                wrapper.style.display = 'flex';
                wrapper.style.flexDirection = 'column';
                wrapper.style.alignItems = 'center';
                wrapper.style.padding = '4px 0';

                const hint = document.createElement('div');
                hint.style.cssText = `
                    text-align: center;
                    padding: 16px 0 10px 0;
                    font-size: 17px;
                    color: #1a2a4a;
                    font-weight: 600;
                    line-height: 1.6;
                `;
                hint.innerHTML = '👆 长按图片，选择「保存图片」';

                const subHint = document.createElement('div');
                subHint.style.cssText = `
                    text-align: center;
                    padding: 0 0 12px 0;
                    font-size: 13px;
                    color: rgba(26,42,74,0.4);
                    line-height: 1.5;
                `;
                subHint.textContent = '如果长按无反应，请尝试截图保存';

                const retryBtn = document.createElement('button');
                retryBtn.textContent = '🔄 重新尝试下载';
                retryBtn.style.cssText = `
                    margin: 4px 0 8px 0;
                    padding: 10px 28px;
                    background: #e8923a;
                    color: #fff;
                    border: none;
                    border-radius: 40px;
                    font-size: 15px;
                    font-weight: 500;
                    cursor: pointer;
                    width: 100%;
                    max-width: 280px;
                `;
                retryBtn.onclick = function(e) {
                    e.stopPropagation();
                    previewContainer.innerHTML = '';
                    const canvasEl2 = document.getElementById('shareCanvas');
                    if (canvasEl2) canvasEl2.style.display = 'block';
                    const btn = document.getElementById('shareDownloadBtn');
                    btn.textContent = '💾 保存图片';
                    btn.style.background = '#e8923a';
                    document.getElementById('shareDownloadBtn').click();
                };

                wrapper.appendChild(img);
                wrapper.appendChild(hint);
                wrapper.appendChild(subHint);
                wrapper.appendChild(retryBtn);

                previewContainer.innerHTML = '';
                previewContainer.appendChild(wrapper);

                const btn = document.getElementById('shareDownloadBtn');
                if (btn) {
                    btn.textContent = '📸 长按图片保存';
                    btn.style.background = '#27ae60';
                }

                console.log('✅ 长按保存降级方案已生效');
            } catch (e) {
                console.error('降级方案执行失败:', e.message);
                alert('保存失败，请尝试截图保存');
            }
        }

        // ===== 截图引导辅助函数（夸克及通用降级） =====
        function showScreenshotGuide(canvas, previewContainer) {
            try {
                // 显示 Canvas（保留原始尺寸）
                const canvasEl = document.getElementById('shareCanvas');
                canvasEl.style.display = 'block';
                canvasEl.style.width = '100%';
                canvasEl.style.height = 'auto';
                canvasEl.style.borderRadius = '12px';
                
                // 清空预览容器，放入 Canvas
                previewContainer.innerHTML = '';
                previewContainer.appendChild(canvasEl);
                
                // 构建提示信息（引导用户截图）
                const wrapper = document.createElement('div');
                wrapper.style.width = '100%';
                wrapper.style.display = 'flex';
                wrapper.style.flexDirection = 'column';
                wrapper.style.alignItems = 'center';
                wrapper.style.padding = '4px 0';
                
                const hint = document.createElement('div');
                hint.style.cssText = `
                    text-align: center;
                    padding: 16px 0 10px 0;
                    font-size: 18px;
                    color: #e8923a;
                    font-weight: 700;
                    line-height: 1.6;
                `;
                hint.textContent = '📸 请使用手机截图保存此图片';
                
                const subHint = document.createElement('div');
                subHint.style.cssText = `
                    text-align: center;
                    padding: 0 0 12px 0;
                    font-size: 14px;
                    color: rgba(26,42,74,0.5);
                    line-height: 1.6;
                    max-width: 90%;
                `;
                subHint.textContent = '由于浏览器限制，请使用手机「截图」功能保存（音量下+电源键）';
                
                // 提示用户只截取图片区域（加一个边框）
                const tip = document.createElement('div');
                tip.style.cssText = `
                    text-align: center;
                    padding: 0 0 12px 0;
                    font-size: 13px;
                    color: rgba(26,42,74,0.3);
                    line-height: 1.4;
                `;
                tip.textContent = '提示：截图时请尽量只截取图片区域，避免边框';
                
                const confirmBtn = document.createElement('button');
                confirmBtn.textContent = '✅ 我已截图保存';
                confirmBtn.style.cssText = `
                    margin: 4px 0 12px 0;
                    padding: 10px 28px;
                    background: #27ae60;
                    color: #fff;
                    border: none;
                    border-radius: 40px;
                    font-size: 15px;
                    font-weight: 500;
                    cursor: pointer;
                    width: 100%;
                    max-width: 280px;
                `;
                confirmBtn.onclick = function() {
                    document.getElementById('shareOverlay').classList.remove('active');
                    const canvasEl2 = document.getElementById('shareCanvas');
                    if (canvasEl2) canvasEl2.style.display = 'block';
                    const btn = document.getElementById('shareDownloadBtn');
                    btn.textContent = '💾 保存图片';
                    btn.style.background = '#e8923a';
                };
                
                wrapper.appendChild(hint);
                wrapper.appendChild(subHint);
                wrapper.appendChild(tip);
                wrapper.appendChild(confirmBtn);
                
                // 将提示插入到 Canvas 后面
                canvasEl.parentNode.insertBefore(wrapper, canvasEl.nextSibling);
                
                // 更新按钮
                const btn = document.getElementById('shareDownloadBtn');
                if (btn) {
                    btn.textContent = '📸 截图保存';
                    btn.style.background = '#27ae60';
                }
                
                console.log('✅ 截图引导已生效');
            } catch (e) {
                console.error('截图引导失败:', e.message);
                alert('保存失败，请尝试截图保存');
            }
        }
        // ===== 排行榜 =====
        async function loadRanking() {
            const overlay = document.getElementById('rankingOverlay');
            const list = document.getElementById('rankingList');
            overlay.classList.add('active');
            list.innerHTML = '<li style="text-align:center;color:rgba(245,240,232,0.3);padding:20px;">加载中...</li>';
            try {
                const response = await fetch('/api/ranking', {
    headers: { 'ngrok-skip-browser-warning': 'true' }
});
                const data = await response.json();
                if (data && data.length > 0) {
                    list.innerHTML = data.map((item, index) => `
                        <li>
                            <span class="rank">${index + 1}</span>
                            <span class="city">${item.city_name}</span>
                            <span class="count">${item.count} 次</span>
                        </li>
                    `).join('');
                } else {
                    list.innerHTML = '<li style="text-align:center;color:rgba(245,240,232,0.3);padding:20px;">暂无数据，快去探索吧</li>';
                }
            } catch(e) {
                list.innerHTML = '<li style="text-align:center;color:rgba(245,240,232,0.3);padding:20px;">加载失败</li>';
            }
        }

        function closeRanking() {
            document.getElementById('rankingOverlay').classList.remove('active');
        }

        document.getElementById('rankingBtn').addEventListener('click', loadRanking);
        document.getElementById('rankingCloseBtn').addEventListener('click', closeRanking);
        document.getElementById('rankingOverlay').addEventListener('click', function(e) {
            if (e.target === this) closeRanking();
        });

        // ============================================================
        // 地图初始化 - 为每个地图独立创建图层（修复左侧白图）
        // ============================================================
        function initMaps() {
            if (!window.AMap) {
                console.warn('AMap未加载');
                return;
            }

                       // 为左侧地图独立创建图层
            var satelliteLeft = new AMap.TileLayer.Satellite({
                zIndex: 1,
                crossOrigin: 'anonymous'
            });
            var roadNetLeft = new AMap.TileLayer.RoadNet({ zIndex: 10 });

            // ----- 左侧地图（原始位置）-----
            originMap = new AMap.Map('originMap', {
                zoom: 4,
                center: [109.4755, 30.7448],
                viewMode: '2D',
                renderOptions: {
                    canvas: {
                        allowReadPixels: true
                    }
                }
            });
            originMap.add(satelliteLeft);
            originMap.add(roadNetLeft);
            originMap.render();
            originMap.resize();

            // 为右侧地图独立创建图层
            var satelliteRight = new AMap.TileLayer.Satellite({
                zIndex: 1,
                crossOrigin: 'anonymous'
            });
            var roadNetRight = new AMap.TileLayer.RoadNet({ zIndex: 10 });

            // ----- 右侧地图（对跖点）-----
            antipodeMap = new AMap.Map('antipodeMap', {
                zoom: 4,
                center: [-70.5245, -30.7448],
                viewMode: '2D',
                renderOptions: {
                    canvas: {
                        allowReadPixels: true
                    }
                }
            });
            antipodeMap.add(satelliteRight);
            antipodeMap.add(roadNetRight);
            antipodeMap.render();
            antipodeMap.resize();

            // 添加边界
            addWorldBoundary(originMap);
            addWorldBoundary(antipodeMap);
            addChinaProvinceBoundary(originMap);
            addChinaProvinceBoundary(antipodeMap);

            // 初始标记
            var initOrange = createTeardropMarker('#e8923a');
            initOrange.setPosition([109.4755, 30.7448]);
            originMap.add(initOrange);

            var initBlue = createTeardropMarker('#2898e8');
            initBlue.setPosition([-70.5245, -30.7448]);
            antipodeMap.add(initBlue);

            // PlaceSearch
            AMap.plugin(['AMap.PlaceSearch'], function() {
                placeSearch = new AMap.PlaceSearch({
                    city: '全国',
                    type: '风景名胜|地名地址信息',
                    pageSize: 1,
                    extensions: 'base'
                });
                console.log('✅ PlaceSearch 初始化完成');
            });

            earthFrame = document.getElementById('earthFrame');
            setTimeout(function() { hideGlobeOverlay(); }, 8000);
            setTimeout(function() { sendToEarth(currentOrigin.lat, currentOrigin.lng); }, 1000);
        }

        function addWorldBoundary(map) {
            if (!map || !AMap.DistrictLayer) return;
            try {
                map.add(new AMap.DistrictLayer.World({
                    zIndex: 5,
                    borderColor: '#e8923a',
                    borderWeight: 1.5,
                    styles: { fill: '', 'nation-stroke': '#e8923a', 'coastline-stroke': '#e8923a' }
                }));
            } catch(e) {}
        }

        function addChinaProvinceBoundary(map) {
            if (!map || !AMap.DistrictLayer) return;
            try {
                map.add(new AMap.DistrictLayer.Province({
                    zIndex: 5,
                    borderColor: '#2898e8',
                    borderWeight: 1,
                    fillColor: null,
                    styles: { fill: '' }
                }));
            } catch(e) {}
        }

        function showLoading(show) {
            document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
        }

        // ===== 3D地球遮罩 =====
        function hideGlobeOverlay() {
            if (globeOverlayHidden) return;
            var overlay = document.getElementById('globeOverlay');
            if (!overlay) return;
            var elapsed = Date.now() - globeOverlayStartTime;
            var remaining = Math.max(0, 3000 - elapsed);
            setTimeout(function() {
                overlay.classList.add('hidden');
                globeOverlayHidden = true;
                setTimeout(function() { overlay.style.display = 'none'; }, 1000);
            }, remaining);
        }

        // ===== 常量 =====
        var DEFAULT_POEM = '「这一刻，你与地球背面，同频呼吸。」\nIn this moment, you breathe in sync with the far side of the earth.';
const DEFAULT_POEM_CN = '「这一刻，你与地球背面，同频呼吸。」';
const DEFAULT_POEM_EN = 'In this moment, you breathe in sync with the far side of the earth.';

                // ===== 初始化 =====
       document.addEventListener('DOMContentLoaded', function() {
            applyBranding();
            fixQQBrowser();  // 新增这一行，放在applyBranding之后
            document.getElementById('searchBtn').onclick = function() {
                searchLocation(document.getElementById('searchInput').value.trim());
            };
            document.getElementById('locationBtn').onclick = getMyLocation;
            document.getElementById('randomBtn').onclick = randomTravel;
            document.getElementById('rankingBtn').onclick = loadRanking;
            document.getElementById('searchInput').addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    var keyword = this.value.trim();
                    if (keyword) searchLocation(keyword);
                }
            });
            updateHistoryList();

           // ===== 太阳/月亮切换（Cesium 版本） =====
const dayNightToggle = document.getElementById('dayNightToggle');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

if (dayNightToggle) {
    dayNightToggle.addEventListener('click', function() {
        // 判断当前状态：太阳可见 → 切换到夜间
        const isNight = sunIcon.style.display !== 'none';
        const newMode = isNight; // true = 夜间, false = 日间
        
        // 切换图标
        sunIcon.style.display = isNight ? 'none' : 'block';
        moonIcon.style.display = isNight ? 'block' : 'none';
        this.title = isNight ? '切换到日间模式' : '切换到夜间模式';

        // 调用 Cesium 的日夜切换
        if (window.__toggleCesiumDayNight) {
            // 注意：window.__cesiumViewer 必须已存在
            window.__toggleCesiumDayNight(window.__cesiumViewer, newMode);
            console.log(`🌓 Cesium 切换至 ${newMode ? '夜间' : '日间'}`);
        } else {
            console.warn('Cesium 未就绪，无法切换日夜');
        }
    });
}
            // 高德地图加载
            window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY };
            var script = document.createElement('script');
            script.src = 'https://webapi.amap.com/maps?v=2.0&key=' + AMAP_KEY;
            script.async = true;
            script.onload = initMaps;
            script.onerror = function() { alert('高德地图加载失败，请检查网络'); };
            document.head.appendChild(script);
        });

        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'globe-ready') {
                hideGlobeOverlay();
            }
        });

              console.log('🌍 对跖点漫游局 v16.0 已加载（独立图层修复左侧）');

               // ================================================================
        // ===== 桌面端 Cesium 加载（与 Three.js 互不干扰） =====
        // ================================================================
        (async function loadCesiumIfNeeded() {
            // 检测是否为桌面端
            const isDesktop = window.innerWidth > 1024 && !('ontouchstart' in window);
            if (!isDesktop) {
                console.log('📱 移动端：保持 Three.js 地球');
                // 确保 Three.js 显示
                document.getElementById('threeControls').style.display = 'block';
                document.getElementById('globeOverlay').style.display = 'block';
                document.getElementById('earthFrame').style.display = 'block';
                document.getElementById('cesiumContainer').style.display = 'none';
                return;
            }

            try {
                // 动态导入 cesium-earth.js（使用相对路径）
                const module = await import('./cesium-earth.js');
                const { shouldUseCesium, initCesiumEarth, updateCesiumEarth, cesiumViewer } = module;

                if (!shouldUseCesium()) {
                    console.log('📱 非桌面端，跳过 Cesium');
                    // 确保 Three.js 显示
                    document.getElementById('threeControls').style.display = 'block';
                    document.getElementById('globeOverlay').style.display = 'block';
                    document.getElementById('earthFrame').style.display = 'block';
                    document.getElementById('cesiumContainer').style.display = 'none';
                    return;
                }

                console.log('🖥️ 桌面端：加载 Cesium 地球（Three.js 作为背景）');

               // ===== 桌面端：Cesium 完全替代 Three.js =====
document.getElementById('cesiumContainer').style.display = 'block';
document.getElementById('cesiumContainer').style.position = 'absolute';
document.getElementById('cesiumContainer').style.top = '0';
document.getElementById('cesiumContainer').style.left = '0';
document.getElementById('cesiumContainer').style.width = '100%';
document.getElementById('cesiumContainer').style.height = '100%';
document.getElementById('cesiumContainer').style.zIndex = '15';

// ===== 隐藏 Three.js 相关元素 =====
document.getElementById('earthFrame').style.display = 'none';      // 隐藏 iframe
document.getElementById('threeControls').style.display = 'none';   // 隐藏日/夜切换
document.getElementById('globeOverlay').style.display = 'none';    // 隐藏遮罩

                // 2. 初始化 Cesium 地球
                const viewer = await initCesiumEarth('cesiumContainer');
                if (viewer) {
window.__cesiumViewer = viewer;
window.__cesiumModule = module; // 已有
// 新增：暴露 toggleDayNight 到全局
window.__toggleCesiumDayNight = module.toggleDayNight;
                    // 显示全屏按钮
                    document.getElementById('cesiumFullscreenBtn').style.display = 'block';

                    // 3. 设置初始位置
                    const initLat = 30.7448;
                    const initLng = 109.4755;
                    const anti = calculateAntipode(initLat, initLng);
                    updateCesiumEarth(
                        viewer,
                        initLat, initLng, '中国·恩施',
                        anti.lat, anti.lng, '南美洲'
                    );

                    // 4. 全屏按钮事件（优化卡顿版）
const fullscreenBtn = document.getElementById('cesiumFullscreenBtn');
if (fullscreenBtn) {
    // 移除旧监听，防止重复绑定
    fullscreenBtn.removeEventListener('click', fullscreenBtn._clickHandler);
    fullscreenBtn._clickHandler = function() {
        const container = document.getElementById('cesiumContainer');
        const viewer = window.__cesiumViewer;
        if (!viewer) return;

        // 进入全屏前：降低渲染质量，减少卡顿
        viewer.scene.maximumRenderTime = 1 / 20;

        if (!document.fullscreenElement) {
            // 进入全屏
            const requestFullscreen = container.requestFullscreen || container.webkitRequestFullscreen || container.msRequestFullscreen;
            if (requestFullscreen) {
                requestFullscreen.call(container).catch(() => {});
            }
            setTimeout(() => {
                viewer.scene.maximumRenderTime = 1 / 30;
                viewer.resize();
                viewer.scene.requestRender();
                setTimeout(() => {
                    viewer.resize();
                    viewer.scene.requestRender();
                }, 100);
            }, 300);
        } else {
            // 退出全屏
            const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
            if (exitFullscreen) {
                exitFullscreen.call(document).catch(() => {});
            }
            setTimeout(() => {
                viewer.scene.maximumRenderTime = 1 / 30;
                viewer.resize();
                viewer.scene.requestRender();
                setTimeout(() => {
                    viewer.resize();
                    viewer.scene.requestRender();
                }, 100);
            }, 300);
        }
    };
    fullscreenBtn.addEventListener('click', fullscreenBtn._clickHandler);
}
                    console.log('✅ Cesium 地球已就绪（Three.js 在底层）');
                } else {
                    // 初始化失败，隐藏 Cesium 容器
                    console.warn('Cesium 初始化失败，回退到 Three.js');
                    document.getElementById('cesiumContainer').style.display = 'none';
                    document.getElementById('cesiumContainer').style.zIndex = 'auto';
                    // 确保 Three.js 正常显示
                    document.getElementById('threeControls').style.display = 'block';
                    document.getElementById('globeOverlay').style.display = 'block';
                    document.getElementById('earthFrame').style.display = 'block';
                }
            } catch (e) {
                console.warn('Cesium 加载失败，回退到 Three.js:', e);
                // 确保 Three.js 正常显示
                document.getElementById('cesiumContainer').style.display = 'none';
                document.getElementById('cesiumContainer').style.zIndex = 'auto';
                document.getElementById('threeControls').style.display = 'block';
                document.getElementById('globeOverlay').style.display = 'block';
                document.getElementById('earthFrame').style.display = 'block';
            }
        })();