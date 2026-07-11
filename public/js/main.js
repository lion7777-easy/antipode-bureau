
const AMAP_KEY = 'd6846dea147b497922afd3f9b121b429';
const AMAP_SECURITY = '5ee76779d43d2d8a89961f61ee26c810';
// ===== 天地图配置 =====
const TIANDITU_TK = '7da0bbd486e5a061e5329472bed5ba41';

// ================================================================
// ===== 分享卡视觉主题配置 =====
// ================================================================

const VISUAL_THEMES = {
    pampas: {
        id: 'pampas',
        name: '潘帕斯草原',
        bgImage: '/images/share-bg/themes/theme_pampas.png',
        landColor: '#A8B997',
        seaColor: '#F2D9C5',
        lineColor: '#C8B8A0',
    },
    andes: {
        id: 'andes',
        name: '安第斯山脉',
        bgImage: '/images/share-bg/themes/theme_andes.png',
        landColor: '#79A0B4',
        seaColor: '#D8E2E8',
        lineColor: '#B0C0D0',
    },
    patagonia: {
        id: 'patagonia',
        name: '巴塔哥尼亚',
        bgImage: '/images/share-bg/themes/theme_patagonia.png',
        landColor: '#79A0B4',
        seaColor: '#E6F0F7',
        lineColor: '#C0D0D8',
    },
    northernChile: {
        id: 'northernChile',
        name: '北智利沙漠',
        bgImage: '/images/share-bg/themes/theme_northern_chile.png',
        landColor: '#D97C5E',
        seaColor: '#FAF5E6',
        lineColor: '#D4B890',
    },
    // 太平洋海岸（暂时保留，未来可启用）
    // pacificCoast: {
    //     id: 'pacificCoast',
    //     name: '太平洋海岸',
    //     bgImage: '/images/share-bg/themes/theme_pacific_coast.png',
    //     landColor: '#84A9C2',
    //     seaColor: '#FCF6E9',
    //     lineColor: '#B8C8D0',
    // },
    amazon: {
        id: 'amazon',
        name: '亚马孙雨林',
        bgImage: '/images/share-bg/themes/theme_amazon.png',
        landColor: '#83A879',
        seaColor: '#D9E2D3',
        lineColor: '#B8C8B0',
    },
    ocean: {
        id: 'ocean',
        name: '海洋',
        bgImage: '/images/share-bg/themes/theme_ocean.png',
        landColor: '#FFFFFF',
        seaColor: '#63829C',
        lineColor: '#A0B8C8',
    }
};

/**
 * 天气大区 → 视觉主题 映射函数
 * @param {string} weatherZone - 天气大区名称（如 '中智利', '潘帕斯' 等）
 * @returns {string} 视觉主题 ID
 */
function getVisualTheme(weatherZone) {
    // ---- 先尝试直接匹配 id（如 'centralChile'） ----
    const idMap = {
        'northernChile': 'northernChile',
        'centralChile': 'andes',
        'southernChile': 'patagonia',
        'pampas': 'pampas',
        'mendoza': 'andes',
        'patagonia': 'patagonia',
        'amazon': 'amazon',       // 新增
        'pacific': 'ocean',
        'atlantic': 'ocean',
        'indian': 'ocean',
    };
    if (idMap[weatherZone]) {
        return idMap[weatherZone];
    }
    
    // ---- 兜底：用中文名匹配 ----
    const nameMap = {
        '北智利': 'northernChile',
        '中智利': 'andes',
        '南智利': 'patagonia',
        '潘帕斯': 'pampas',
        '门多萨': 'andes',
        '巴塔哥尼亚': 'patagonia',
        '大西洋': 'ocean',
        '太平洋': 'ocean',
        '印度洋': 'ocean',
        '非洲': 'fallback',
        '欧洲': 'fallback',
        '亚洲': 'fallback',
        '大洋洲': 'fallback',
    };
    return nameMap[weatherZone] || 'fallback';
}

// ===== 搜索缓存（重复搜索同一城市秒开） =====
const searchCache = new Map();
// ================================================================
// ===== 工具函数 =====
// ================================================================

// ---- 对跖点计算 ----
function calculateAntipode(lat, lng) {
    let antiLng = lng + 180;
    if (antiLng > 180) antiLng -= 360;
    return { lat: -lat, lng: antiLng };
}
// ================================================================
// ===== 天气模块 =====
// ================================================================

// ---- 天气缓存 ----
const WEATHER_CACHE_KEY = 'weatherCache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 分钟

function getWeatherCacheKey(lat, lng) {
    const date = new Date().toISOString().slice(0, 10);
    return `${lat.toFixed(4)}_${lng.toFixed(4)}_${date}`;
}

function getCachedWeather(lat, lng) {
    try {
        const cache = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || '{}');
        const key = getWeatherCacheKey(lat, lng);
        const entry = cache[key];
        if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
            return entry.data;
        }
        return null;
    } catch { return null; }
}

function setCachedWeather(lat, lng, data) {
    try {
        const cache = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || '{}');
        const key = getWeatherCacheKey(lat, lng);
        cache[key] = { data, timestamp: Date.now() };
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache));
    } catch {}
}

// ---- 获取天气 ----
async function fetchWeather(lat, lng) {
    // 1. 检查缓存
    const cached = getCachedWeather(lat, lng);
    if (cached) return cached;

    // 2. 请求 API
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=auto`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('天气请求失败');
        const data = await response.json();
        const weather = data.current_weather;
        setCachedWeather(lat, lng, weather);
        return weather;
    } catch (e) {
        console.warn('天气获取失败:', e);
        return null;
    }
}

// ---- 天气代码转文字和图标 ----
function getWeatherInfo(weatherCode) {
    const map = {
        0: { text: '晴天', icon: '☀️' },
        1: { text: '晴间多云', icon: '🌤️' },
        2: { text: '多云', icon: '⛅' },
        3: { text: '阴天', icon: '☁️' },
        45: { text: '雾', icon: '🌫️' },
        48: { text: '雾', icon: '🌫️' },
        51: { text: '小毛毛雨', icon: '🌦️' },
        53: { text: '毛毛雨', icon: '🌦️' },
        55: { text: '大毛毛雨', icon: '🌧️' },
        61: { text: '小雨', icon: '🌧️' },
        63: { text: '中雨', icon: '🌧️' },
        65: { text: '大雨', icon: '🌧️' },
        71: { text: '小雪', icon: '❄️' },
        73: { text: '中雪', icon: '❄️' },
        75: { text: '大雪', icon: '❄️' },
        80: { text: '阵雨', icon: '🌦️' },
        81: { text: '中阵雨', icon: '🌧️' },
        82: { text: '大阵雨', icon: '⛈️' },
        95: { text: '雷暴', icon: '⛈️' },
        96: { text: '雷暴', icon: '⛈️' },
        99: { text: '雷暴', icon: '⛈️' },
    };
    return map[weatherCode] || { text: '未知', icon: '🌍' };
}

// ---- 获取两地天气 ----
async function fetchBothWeather(originLat, originLng) {
    const antipode = calculateAntipode(originLat, originLng);
    const [originWeather, antipodeWeather] = await Promise.all([
        fetchWeather(originLat, originLng),
        fetchWeather(antipode.lat, antipode.lng)
    ]);
    return { originWeather, antipodeWeather, antiLat: antipode.lat, antiLng: antipode.lng };
}

// ---- 更新地图天气浮层 ----
function updateWeatherFloating(originWeather, antipodeWeather) {
    // 🔧 先清除所有旧浮层，避免残留（解决快速搜索时天气显示错乱）
    document.querySelectorAll('.weather-floating').forEach(el => el.remove());
    
    // 原始位置地图
    const originContainer = document.getElementById('originMap');
    if (originContainer) {
        // 移除旧浮层（保留以防万一）
        const oldOrigin = originContainer.querySelector('.weather-floating');
        
        if (originWeather) {
            const info = getWeatherInfo(originWeather.weathercode);
            const el = document.createElement('div');
            el.className = 'weather-floating show';
            el.innerHTML = `${info.icon} <span class="temp">${Math.round(originWeather.temperature)}°C</span>`;
            originContainer.style.position = 'relative';
            originContainer.appendChild(el);
        }
    }
    
    // 对跖点地图
    const antipodeContainer = document.getElementById('antipodeMap');
    if (antipodeContainer) {
        const oldAnti = antipodeContainer.querySelector('.weather-floating');
        
        if (antipodeWeather) {
            const info = getWeatherInfo(antipodeWeather.weathercode);
            const el = document.createElement('div');
            el.className = 'weather-floating show';
            el.innerHTML = `${info.icon} <span class="temp">${Math.round(antipodeWeather.temperature)}°C</span>`;
            antipodeContainer.style.position = 'relative';
            antipodeContainer.appendChild(el);
        }
    }
}

// ---- 生成天气对比文案（用于分享卡） ----
function generateWeatherCaption(originWeather, antipodeWeather) {
    if (!originWeather || !antipodeWeather) return null;
    
    const originInfo = getWeatherInfo(originWeather.weathercode);
    const antiInfo = getWeatherInfo(antipodeWeather.weathercode);
    const originTemp = Math.round(originWeather.temperature);
    const antiTemp = Math.round(antipodeWeather.temperature);
    
    // 根据温差生成不同文案
    const diff = Math.abs(originTemp - antiTemp);
    let tone = '';
    if (diff > 15) tone = '天壤之别';
    else if (diff > 8) tone = '别样风情';
    else if (diff > 3) tone = '微妙不同';
    else tone = '同频呼吸';
    
    return {
        originIcon: originInfo.icon,
        antiIcon: antiInfo.icon,
        originTemp,
        antiTemp,
        caption: `此刻，你这里 ${originInfo.icon} ${originTemp}°C，而地球另一端 ${antiInfo.icon} ${antiTemp}°C，${tone}。`,
        simple: `${originInfo.icon} ${originTemp}°C  ↔  ${antiInfo.icon} ${antiTemp}°C`
    };
}

// ================================================================
// ===== 非数据库城市诗句系统（八大区 + 天气反差） =====
// ================================================================

let regionPoems = null;        // 大区通用短句
let weatherContrasts = null;   // 天气反差文案

// ---- 加载文案数据 ----
async function loadPoemData() {
    try {
        const [regionRes, contrastRes] = await Promise.all([
            fetch('/data/region_poems.json'),
            fetch('/data/weather_contrasts.json')
        ]);
        regionPoems = await regionRes.json();
        weatherContrasts = await contrastRes.json();
        console.log('✅ 文案数据加载完成:', Object.keys(regionPoems).length, '个大区');
    } catch (e) {
        console.warn('⚠️ 文案数据加载失败，使用降级文案:', e.message);
        // 降级：硬编码默认文案
        regionPoems = getFallbackRegionPoems();
        weatherContrasts = getFallbackWeatherContrasts();
    }
}

// ---- 降级文案（当 JSON 加载失败时使用） ----
function getFallbackRegionPoems() {
    return {
        northernChile: {
            poems: [
                { cn: '阿塔卡马的星空，正从地球另一端凝视着你。', en: 'The stars of Atacama are gazing at you from the far side of the earth.' }
            ]
        },
        centralChile: {
            poems: [
                { cn: '安第斯的雪水，正流过你脚下这片土地的背面。', en: 'The snowmelt of the Andes is flowing on the other side of the earth beneath you.' }
            ]
        },
        // ... 其他大区至少保留一条
    };
}

function getFallbackWeatherContrasts() {
    return {
        northernChile: {
            '晴→雨': { cn: '阿塔卡马的晴空，正从地心为你接住另一端的雨。', en: 'The clear sky of Atacama is catching the rain from the other side through the core.' }
        }
        // ... 至少保留一条
    };
}

// ---- 获取天气类型标签（用于匹配反差文案） ----
function getWeatherType(code) {
    if (code === 0 || code === 1) return '晴';
    if (code === 2 || code === 3) return '多云';
    if (code === 45 || code === 48) return '雾';
    if (code >= 51 && code <= 55) return '毛毛雨';
    if (code >= 61 && code <= 65) return '雨';
    if (code >= 71 && code <= 75) return '雪';   // ✅ 雪单独返回
    if (code >= 80 && code <= 82) return '雨';
    if (code >= 95 && code <= 99) return '雷暴';
    return '未知';
}

// ---- 判断是否触发天气反差 ----
function shouldTriggerWeatherContrast(originWeather, antipodeWeather) {
    if (!originWeather || !antipodeWeather) return false;

    const originType = getWeatherType(originWeather.weathercode);
    const antiType = getWeatherType(antipodeWeather.weathercode);
    const originTemp = Math.round(originWeather.temperature);
    const antiTemp = Math.round(antipodeWeather.temperature);
    const tempDiff = Math.abs(originTemp - antiTemp);

    // ===== 第一类：天气类型强反差 =====
 
   const isOriginSunny = ['晴'].includes(originType);
const isAntiSunny = ['晴'].includes(antiType);  // 恢复这一行
const isOriginRainy = ['雨', '雪', '雷暴'].includes(originType);
const isAntiRainy = ['雨', '雪', '雷暴'].includes(antiType);

if ((isOriginSunny && isAntiRainy) || (isOriginRainy && isAntiSunny)) {
    return true;
}

    // 多云 ↔ 大雨/大雪/雷暴：弱触发（可选）
    const isOriginCloudy = originType === '多云';
    const isAntiCloudy = antiType === '多云';
    
    // 🔧 修复：分别取两侧天气码进行判断
    const originCode = originWeather.weathercode;
    const antiCode = antipodeWeather.weathercode;
    const isOriginHeavyRain = [63, 65, 80, 81, 82].includes(originCode);
    const isOriginHeavySnow = [73, 75].includes(originCode);
    const isAntiHeavyRain = [63, 65, 80, 81, 82].includes(antiCode);
    const isAntiHeavySnow = [73, 75].includes(antiCode);

    // 条件1：原点多云 → 对跖点有大雨/大雪/雷暴
    // 条件2：对跖点多云 → 原点有大雨/大雪/雷暴
    if ((isOriginCloudy && (isAntiHeavyRain || isAntiHeavySnow || antiType === '雷暴')) ||
        (isAntiCloudy && (isOriginHeavyRain || isOriginHeavySnow || originType === '雷暴'))) {
        return true;
    }

  // ===== 第二类：温度强反差（收紧条件） =====
// 条件 A：原点酷暑（>35℃），且比对跖点高至少 20℃
if (originTemp > 35 && originTemp - antiTemp >= 20) {
    return true;
}
// 条件 B：原点严寒（<5℃），且比对跖点低至少 20℃
if (originTemp < 5 && antiTemp - originTemp >= 20) {
    return true;
}

    return false;
}

// ---- 获取反差类型键名（用于匹配 weather_contrasts.json） ----
function getContrastKey(originWeather, antipodeWeather) {
    const originType = getWeatherType(originWeather.weathercode);
    const antiType = getWeatherType(antipodeWeather.weathercode);
    const originTemp = Math.round(originWeather.temperature);
    const antiTemp = Math.round(antipodeWeather.temperature);

    // ===== 第一优先：雪的强反差 =====
    // 下雪→未下雪：原点下雪，对跖点不下雪
    if (originType === '雪' && antiType !== '雪') {
        return '下雪→未下雪';
    }
    // 未下雪→下雪：原点不下雪，对跖点下雪
    if (originType !== '雪' && antiType === '雪') {
        return '未下雪→下雪';
    }

    // ===== 第二优先：天气类型反差（晴/雨/雷暴等） =====
    if (originType !== antiType) {
        // 雨和雷暴统一归为"雨"
        const oType = ['雨', '雷暴'].includes(originType) ? '雨' : originType;
        const aType = ['雨', '雷暴'].includes(antiType) ? '雨' : antiType;
        // 如果归一化后相同，不生成天气反差 key，让温度反差兜底
        if (oType !== aType) {
            return `${oType}→${aType}`;
        }
    }

    // ===== 第三优先：温度强反差（≥12°C） =====
    if (originTemp >= antiTemp + 12) {
        return '高温→低温';
    }
    if (antiTemp >= originTemp + 12) {
        return '低温→高温';
    }

    return null;
}
/**
 * 应用天气反差到诗句（如果有触发）
 * @param {Object} cityData - 城市数据对象（必须包含 lat, lng, poem, poem_en）
 * @param {Object|null} originWeather - 原点天气
 * @param {Object|null} antipodeWeather - 对跖点天气
 * @returns {Object} { poemCN, poemEN }
 */
/**
 * 应用天气反差到诗句（如果有触发）
 * @param {Object} cityData - 城市数据对象（必须包含 lat, lng, poem, poem_en）
 * @param {Object|null} originWeather - 原点天气
 * @param {Object|null} antipodeWeather - 对跖点天气
 * @returns {Object} { poemCN, poemEN }
 */
function applyWeatherPoem(cityData, originWeather, antipodeWeather) {
    let poemCN = cityData.poem || DEFAULT_POEM_CN;
    let poemEN = cityData.poem_en || DEFAULT_POEM_EN;

    if (!originWeather || !antipodeWeather) {
        return { poemCN, poemEN };
    }

    const shouldTrigger = shouldTriggerWeatherContrast(originWeather, antipodeWeather);
    if (shouldTrigger) {
        const anti = calculateAntipode(cityData.lat, cityData.lng);
        // ✅ 改用 window.getRegion 获取大区ID，与 weatherContrasts 的键对齐
        const regionInfo = window.getRegion ? window.getRegion(anti.lat, anti.lng) : null;
        const regionId = regionInfo?.id || null;
        const contrastKey = getContrastKey(originWeather, antipodeWeather);
        
        if (regionId && contrastKey && weatherContrasts && weatherContrasts[regionId] && weatherContrasts[regionId][contrastKey]) {
            const match = weatherContrasts[regionId][contrastKey];
            poemCN = match.cn;
            poemEN = match.en;
        } else if (contrastKey) {
            console.warn(`⚠️ 未找到反差文案: 大区=${regionId}, key=${contrastKey}`);
        }
    }

    return { poemCN, poemEN };
}
// ---- 主入口：获取非数据库城市的诗句 ----
function getPoemForNonDbCity(cityName, originLat, originLng, originWeather, antipodeWeather) {
    const anti = calculateAntipode(originLat, originLng);
    
    // ---- 获取大区信息（用于八大区通用短句） ----
    const regionInfo = window.getRegion ? window.getRegion(anti.lat, anti.lng) : null;
    
    // ---- 获取国家信息（用于天气反差匹配） ----
    const countryInfo = getAntipodeRegion(anti.lat, anti.lng);
    const countryName = countryInfo?.country || null;
    
    if (!regionInfo && !countryName) {
        return {
        cn: DEFAULT_POEM_CN,
        en: DEFAULT_POEM_EN
    };
    }

    // 2. 判断是否触发天气反差
    const shouldTrigger = shouldTriggerWeatherContrast(originWeather, antipodeWeather);

        // 3. 如果有天气反差，尝试获取反差文案（使用大区ID匹配）
    if (shouldTrigger) {
        const contrastKey = getContrastKey(originWeather, antipodeWeather);
        // ✅ 用 regionInfo.id 去匹配 weatherContrasts，而不是 countryName
        if (contrastKey && weatherContrasts && regionInfo?.id && weatherContrasts[regionInfo.id] && weatherContrasts[regionInfo.id][contrastKey]) {
            const match = weatherContrasts[regionInfo.id][contrastKey];
            return { cn: `「${match.cn}」`, en: match.en };
        }
    }

    // 4. 获取大区通用短句（使用 regionInfo.id 匹配 regionPoems）
    if (regionInfo && regionInfo.id && regionPoems && regionPoems[regionInfo.id] && regionPoems[regionInfo.id].poems) {
        const poems = regionPoems[regionInfo.id].poems;
        const randomIndex = Math.floor(Math.random() * poems.length);
        const selected = poems[randomIndex];
        return { cn: `「${selected.cn}」`, en: selected.en };
    }

    // 5. 最终降级
return {
    cn: DEFAULT_POEM_CN,   // 「这一刻，你与地球背面，同频呼吸。」
    en: DEFAULT_POEM_EN    // In this moment, you breathe in sync with the far side of the earth.
};
}
// ============================================================
// 长尾国家/地区兜底映射（覆盖玻利维亚、巴拉圭、乌拉圭等）
// 当坐标无法匹配六大区时，根据国家名归入对应大区
// ============================================================
function getFallbackZoneByCountry(countryName) {
    const map = {
        '玻利维亚': 'andes',
        '巴拉圭': 'pampas',
        '乌拉圭': 'pampas',
        '秘鲁': 'andes',
        '厄瓜多尔': 'andes',
        '哥伦比亚': 'amazon',
        '委内瑞拉': 'amazon',
        '圭亚那': 'amazon',
        '苏里南': 'amazon',
        '法属圭亚那': 'amazon',
    };
    return map[countryName] || null;
}
// 暴露到全局
window.getPoemForNonDbCity = getPoemForNonDbCity;
window.loadPoemData = loadPoemData;
// ============================================================
// 预加载 GeoJSON 和背景图（提升分享卡生成速度）
// ============================================================
let worldMapData = null;          // 原全局变量，保留
let worldMapDataPromise = null;   // 用于等待加载

function ensureWorldMapData() {
    if (worldMapData) return Promise.resolve(worldMapData);
    if (worldMapDataPromise) return worldMapDataPromise;
    worldMapDataPromise = fetch('/data/land-110m.geojson')
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(data => {
            worldMapData = data;
            return data;
        })
        .catch(err => {
            console.warn('⚠️ GeoJSON 预加载失败:', err);
            return null;
        });
    return worldMapDataPromise;
}

// 预加载背景图（存入内存缓存）
const bgImageCache = {};
const BG_LIST = [
   '/images/share-bg/card01.png',
    '/images/share-bg/card02.png',
    '/images/share-bg/card03.png',
    '/images/share-bg/card04.png',
    '/images/share-bg/themes/theme_pampas.png',
    '/images/share-bg/themes/theme_andes.png',
    '/images/share-bg/themes/theme_patagonia.png',
    '/images/share-bg/themes/theme_northern_chile.png',
    // '/images/share-bg/themes/theme_pacific_coast.png',  // 已注释，暂不启用
    '/images/share-bg/themes/theme_amazon.png',
    '/images/share-bg/themes/theme_ocean.png'
];

function preloadBgImages() {
    BG_LIST.forEach(src => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        bgImageCache[src] = img;  // 即使未加载完，先存引用，后续可用
        // 也可监听 onload，但不用等待
    });
}
preloadBgImages(); // 立即执行

// 同时预加载羊皮纸纹理（分享卡地图中使用）
let parchmentTexture = null;
(function preloadParchment() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { parchmentTexture = img; };
    img.src = '/images/parchment-texture.png';
})();

// 立即启动 GeoJSON 预加载（不阻塞）
ensureWorldMapData();

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
    incrementTodayCount(); // ✅ 补上
// ===== 🆕 获取天气 =====
    (async function() {
        const { originWeather, antipodeWeather } = await fetchBothWeather(spot.lat, spot.lng);
        window._originWeather = originWeather;
        window._antipodeWeather = antipodeWeather;
        window._antiLat = calculateAntipode(spot.lat, spot.lng).lat;
        window._antiLng = calculateAntipode(spot.lat, spot.lng).lng;
        updateWeatherFloating(originWeather, antipodeWeather);
    })();
    
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
// ===== 解析经纬度字符串（支持十进制度 + 度分秒） =====
function parseCoordinate(input) {
    if (!input || typeof input !== 'string') return null;
    input = input.trim();
    // 按逗号或中文逗号或空格分割
    const parts = input.split(/[,，\s]+/).filter(s => s.length > 0);
    if (parts.length !== 2) return null;
    
    const latStr = parts[0];
    const lngStr = parts[1];
    
    // ---- 度分秒正则（如 "30°44'41\"N" 或 "30 44 41 N"） ----
    const dmsPattern = /^\s*(\d+)\s*[°度]\s*(\d+)\s*['分]\s*(\d+\.?\d*)\s*["秒]?\s*([NSEWnsew])?\s*$/;
    
    // ---- 十进制度正则（如 "30.7448°N"） ----
    const decimalPattern = /^\s*([-+]?\d*\.?\d+)\s*[°度]?\s*([NSEWnsew])?\s*$/;
    
    // ---- 解析单个坐标（尝试度分秒 → 十进制度） ----
    function parseSingleCoord(str) {
        // 1. 尝试度分秒
        const dmsMatch = str.match(dmsPattern);
        if (dmsMatch) {
            const deg = parseFloat(dmsMatch[1]);
            const min = parseFloat(dmsMatch[2]);
            const sec = parseFloat(dmsMatch[3]);
            const dir = dmsMatch[4] ? dmsMatch[4].toUpperCase() : '';
            let decimal = deg + min / 60 + sec / 3600;
            if (dir === 'S' || dir === 'W') decimal = -decimal;
            return { value: decimal, hasDir: !!dir };
        }
        // 2. 尝试十进制度
        const decMatch = str.match(decimalPattern);
        if (decMatch) {
            let value = parseFloat(decMatch[1]);
            const dir = decMatch[2] ? decMatch[2].toUpperCase() : '';
            if (dir === 'S') value = -Math.abs(value);
            else if (dir === 'N') value = Math.abs(value);
            // 如果方向不存在，保留原符号（可能已有负号）
            return { value: value, hasDir: !!dir };
        }
        return null;
    }
    
    const latResult = parseSingleCoord(latStr);
    const lngResult = parseSingleCoord(lngStr);
    if (!latResult || !lngResult) return null;
    
    let lat = latResult.value;
    let lng = lngResult.value;
    
    // ---- 方向修正（如果两个坐标都没有方向标识，保留原符号） ----
    // 如果度分秒解析时已经通过方向处理了正负，此处不再重复处理
    // 但如果解析结果没有方向，且数字本身带符号，则保留
    // 对于度分秒格式，如果用户输入 "30 44 41" 且无方向，会丢失符号信息，此时我们保留原数字符号（但度分秒正数无法表达负值，所以通常不会出现）
    // 这里不做额外处理，因为 parseSingleCoord 已处理
    
    // 验证范围
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
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
async function handleSearchSuccess(lat, lng, keyword, cityData, originWeather, antipodeWeather) {
    // 1. 更新地图
    updateAll(lat, lng);

    // 2. 获取天气（如果已传入则直接使用，否则自行获取）
    let finalOriginWeather = originWeather;
    let finalAntipodeWeather = antipodeWeather;
    let antiLat, antiLng;

    if (originWeather && antipodeWeather) {
        // 已传入天气数据，直接使用
        const anti = calculateAntipode(lat, lng);
        antiLat = anti.lat;
        antiLng = anti.lng;
        window._originWeather = originWeather;
        window._antipodeWeather = antipodeWeather;
        window._antiLat = antiLat;
        window._antiLng = antiLng;
        updateWeatherFloating(originWeather, antipodeWeather);
    } else {
        // 未传入天气数据，自行获取（兼容旧调用方式）
        const weather = await fetchBothWeather(lat, lng);
        finalOriginWeather = weather.originWeather;
        finalAntipodeWeather = weather.antipodeWeather;
        antiLat = weather.antiLat;
        antiLng = weather.antiLng;
        window._originWeather = finalOriginWeather;
        window._antipodeWeather = finalAntipodeWeather;
        window._antiLat = antiLat;
        window._antiLng = antiLng;
        updateWeatherFloating(finalOriginWeather, finalAntipodeWeather);
    }

    // 3. 添加到历史
    addToHistory(keyword);

    // 4. 触发礼物
    const cityObj = cityData || { name_cn: keyword };
    triggerGiftForLocation(lat, lng, cityObj);

    // 5. 存入缓存
    const poemHTML = document.getElementById('poemDisplay').innerHTML;
    searchCache.set(keyword.toLowerCase(), {
        cityData: currentCityData,
        lat: lat,
        lng: lng,
        cityName: keyword,
        giftData: { hasGift: true }
    });

    // 6. 累加个人日限
    incrementTodayCount();
}
        let isSearching = false;

/**
 * 处理地理编码结果（高德/天地图/经纬度），统一构造数据并调用 handleSearchSuccess
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @param {string} keyword - 用户输入的关键词
 */
async function processGeocodeResult(lat, lng, keyword) {
    // 1. 计算对跖点
    const anti = calculateAntipode(lat, lng);
    
    // 2. 获取天气
    let originWeather = null, antipodeWeather = null;
    try {
        const weather = await fetchBothWeather(lat, lng);
        originWeather = weather.originWeather;
        antipodeWeather = weather.antipodeWeather;
        window._originWeather = originWeather;
        window._antipodeWeather = antipodeWeather;
        window._antiLat = anti.lat;
        window._antiLng = anti.lng;
    } catch (e) {
        console.warn('天气获取失败:', e);
    }
    
    // 3. 获取对跖点名称
    let antipodeName = '地球另一端';
    let antipodeNameEn = '';
    try {
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
    
    // 4. 获取拼音（仅中文）
    let nameEn = keyword;
    if (/[\u4e00-\u9fa5]/.test(keyword)) {
        try {
            const pinyinRes = await fetch(`/api/get-pinyin?text=${encodeURIComponent(keyword)}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const pinyinData = await pinyinRes.json();
            if (pinyinData.success) {
                nameEn = pinyinData.pinyin;
            }
        } catch (e) {
            console.warn('拼音获取失败:', e);
        }
    }
    
    // 5. 获取诗句（传入天气数据）
    const poemResult = getPoemForNonDbCity(keyword, lat, lng, originWeather, antipodeWeather);
    
    // 6. 构造临时城市数据
    const tempCityData = {
        lat: lat,
        lng: lng,
        name_cn: keyword,
        name_en: nameEn,
        antipode_name: '', 
        antipode_name_en: '',
        antipode_lat: anti.lat,
        antipode_lng: anti.lng,
        poem: poemResult.cn,
        poem_en: poemResult.en,
        origin_image: '',
        antipode_image: ''
    };
    currentCityData = tempCityData;
    document.getElementById('poemDisplay').innerHTML = `${poemResult.cn}<br>${poemResult.en}`;
    
    // 7. 更新天气浮层
    updateWeatherFloating(originWeather, antipodeWeather);
    
    // 8. 调用通用处理（缓存、历史、礼物、日限）
    await handleSearchSuccess(lat, lng, keyword, tempCityData, originWeather, antipodeWeather);
}       
async function searchLocation(keyword, retryCount = 0) {
    window._currentGift = null;
    window._lastShareCardData = null;  // 清除旧的分享卡数据
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
    
    // ---- 重新生成诗句（不依赖缓存中的旧诗句） ----
    const isDatabaseCity = cached.cityData && cached.cityData.id && cached.cityData.poem;
    let poemCN, poemEN;
    
    if (isDatabaseCity) {
        // 数据库城市：获取天气后应用反差
        try {
            const weather = await fetchBothWeather(cached.lat, cached.lng);
            const result = applyWeatherPoem(cached.cityData, weather.originWeather, weather.antipodeWeather);
            poemCN = result.poemCN;
            poemEN = result.poemEN;
        } catch (e) {
            poemCN = cached.cityData.poem || DEFAULT_POEM_CN;
            poemEN = cached.cityData.poem_en || DEFAULT_POEM_EN;
        }
    } else {
        // 非数据库城市：直接用 getPoemForNonDbCity
        const result = getPoemForNonDbCity(
            cached.cityData.name_cn || cached.cityName,
            cached.lat,
            cached.lng,
            window._originWeather || null,
            window._antipodeWeather || null
        );
        poemCN = result.cn;
        poemEN = result.en;
    }
    
    document.getElementById('poemDisplay').innerHTML = `${poemCN}<br>${poemEN}`;
    addToHistory(cached.cityName);
    triggerGiftForLocation(cached.lat, cached.lng, cached.cityData);
    incrementTodayCount();
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
document.getElementById('searchBtn').textContent = '⏳ 搜索中...';
// ✅ 在这里定义 isQuark
    const isQuark = navigator.userAgent.toLowerCase().includes('quark');

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

// ---- 获取天气并判断反差 ----
let originWeather = null;
let antipodeWeather = null;

try {
    const weather = await fetchBothWeather(city.lat, city.lng);
    originWeather = weather.originWeather;
    antipodeWeather = weather.antipodeWeather;
    window._originWeather = originWeather;
    window._antipodeWeather = antipodeWeather;
    window._antiLat = calculateAntipode(city.lat, city.lng).lat;
    window._antiLng = calculateAntipode(city.lat, city.lng).lng;
    updateWeatherFloating(originWeather, antipodeWeather);
} catch (e) {
    console.warn('天气获取失败:', e.message);
}

// ---- 应用天气反差到诗句 ----
const poemResult = applyWeatherPoem(city, originWeather, antipodeWeather);
currentCityData.poem = poemResult.poemCN;
currentCityData.poem_en = poemResult.poemEN;
document.getElementById('poemDisplay').innerHTML = `${poemResult.poemCN}<br>${poemResult.poemEN}`;

await handleSearchSuccess(city.lat, city.lng, city.name_cn, city, originWeather, antipodeWeather);
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
            await processGeocodeResult(amapResult.lat, amapResult.lng, searchKeyword);
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
            await processGeocodeResult(tianDiTuResult.lat, tianDiTuResult.lng, searchKeyword);
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
    await processGeocodeResult(lat, lng, searchKeyword);
    isSearching = false;
    document.getElementById('searchBtn').disabled = false;
    showLoading(false);
    return;
}
// 之后是竞赛搜索（高德/OSM/Photon），保持不变
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

                                             const { lat, lng } = results;
                
                // ===== 优先查数据库（无论中文英文） =====
                let cityData = null;
                let cityName = searchKeyword;

                // 先尝试用原始关键词查数据库
const searchRes = await fetch(`/api/search?q=${encodeURIComponent(searchKeyword)}`, {
    headers: { 'ngrok-skip-browser-warning': 'true' },
    cache: isQuark ? 'no-cache' : 'default'  // 夸克强制无缓存
});
                const searchResult = await searchRes.json();
               if (searchResult && searchResult.length > 0) {
    cityData = searchResult[0];  // ✅ 赋值的是对象
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
                            cityData = cityData2[0];
                        }
                    }
                }

 if (cityData) {
    const city = cityData;
    currentCityData = city;
    updateAll(city.lat, city.lng);
    
    // ---- 获取天气 ----
    let originWeather = null;
    let antipodeWeather = null;
    
    try {
        const weather = await fetchBothWeather(city.lat, city.lng);
        originWeather = weather.originWeather;
        antipodeWeather = weather.antipodeWeather;
        window._originWeather = originWeather;
        window._antipodeWeather = antipodeWeather;
        window._antiLat = calculateAntipode(city.lat, city.lng).lat;
        window._antiLng = calculateAntipode(city.lat, city.lng).lng;
        updateWeatherFloating(originWeather, antipodeWeather);
    } catch (e) {
        console.warn('天气获取失败:', e.message);
    }
    
    // ---- 应用天气反差到诗句 ----
    const poemResult = applyWeatherPoem(city, originWeather, antipodeWeather);
    city.poem = poemResult.poemCN;
    city.poem_en = poemResult.poemEN;
    document.getElementById('poemDisplay').innerHTML = `${poemResult.poemCN}<br>${poemResult.poemEN}`;
    
    await handleSearchSuccess(city.lat, city.lng, city.name_cn, city, originWeather, antipodeWeather);

              } else {
    const originalCityName = searchKeyword;
    const antipode = calculateAntipode(lat, lng);
    updateAll(lat, lng);

    // ---- 获取天气（先获取，用于诗句生成） ----
    let originWeather = null;
    let antipodeWeather = null;
    try {
        const weather = await fetchBothWeather(lat, lng);
        originWeather = weather.originWeather;
        antipodeWeather = weather.antipodeWeather;
        window._originWeather = originWeather;
        window._antipodeWeather = antipodeWeather;
        window._antiLat = antipode.lat;
        window._antiLng = antipode.lng;
    } catch (e) {
        console.warn('天气获取失败:', e);
    }
    
    // ---- 更新天气浮层 ----
    updateWeatherFloating(originWeather, antipodeWeather);

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
    
    // ---- 获取诗句（传入天气数据） ----
    const poemResult = getPoemForNonDbCity(
        originalCityName,
        lat,
        lng,
        originWeather,
        antipodeWeather
    );

    currentCityData = {
        lat,
        lng,
        name_cn: originalCityName,
        name_en: nameEn,
        antipode_name: '', 
        antipode_name_en: '',
        antipode_lat: antipode.lat,
        antipode_lng: antipode.lng,
        poem: poemResult.cn,
        poem_en: poemResult.en
    };

    // ---- 更新诗句显示 ----
    document.getElementById('poemDisplay').innerHTML = `${poemResult.cn}<br>${poemResult.en}`;

    // ===== 调用通用处理（缓存 + 日限） =====
    await handleSearchSuccess(lat, lng, originalCityName, currentCityData, originWeather, antipodeWeather);
}

          } catch (e) {
    console.log('❌ 搜索失败:', e.message);
    if (retryCount < 1) {
    console.log('🔄 搜索失败，自动重试...');
    isSearching = false;
    document.getElementById('searchBtn').disabled = false;
    showLoading(false);
    // 清除防抖定时器，避免冲突
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
    }
    setTimeout(() => {
        searchLocation(keyword, retryCount + 1);
    }, 500);
    return;
}
    alert(`未找到“${searchKeyword}”的相关结果，请检查拼写后重试`);
} finally {
    isSearching = false;
    document.getElementById('searchBtn').disabled = false;
    document.getElementById('searchBtn').textContent = '🔍 搜索';
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
            
            // ===== 🆕 获取天气 =====
            const { originWeather, antipodeWeather } = await fetchBothWeather(latitude, longitude);
            window._originWeather = originWeather;
            window._antipodeWeather = antipodeWeather;
            window._antiLat = calculateAntipode(latitude, longitude).lat;
            window._antiLng = calculateAntipode(latitude, longitude).lng;
            // 注意：地图容器可能还未渲染，等 updateAll 后再更新浮层
            
            try {
                const cityRes = await fetch(`/api/search?q=${latitude.toFixed(4)},${longitude.toFixed(4)}`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
               const cityData = await cityRes.json();
if (cityData && cityData.length > 0) {
    const city = cityData[0];
    currentCityData = city;
    updateAll(city.lat, city.lng);
                    // ===== 🆕 更新天气浮层 =====
                    updateWeatherFloating(window._originWeather, window._antipodeWeather);
                    const displayCN = city.poem || DEFAULT_POEM_CN;
                    const displayEN = city.poem_en || DEFAULT_POEM_EN;
                    document.getElementById('poemDisplay').innerHTML = `${displayCN}<br>${displayEN}`;
                    triggerGiftForLocation(city.lat, city.lng, city);
                } else {
                    const antipode = calculateAntipode(latitude, longitude);
                    updateAll(latitude, longitude);
                    // ===== 🆕 更新天气浮层 =====
                    updateWeatherFloating(window._originWeather, window._antipodeWeather);
                    document.getElementById('poemDisplay').innerHTML = `${DEFAULT_POEM_CN}<br>${DEFAULT_POEM_EN}`;
                    triggerGiftForLocation(latitude, longitude, null);
 incrementTodayCount(); // ✅ 补上
                }
            } catch(e) {
                const antipode = calculateAntipode(latitude, longitude);
                updateAll(latitude, longitude);
                // ===== 🆕 更新天气浮层 =====
                updateWeatherFloating(window._originWeather, window._antipodeWeather);
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
        // 使用 displayName 格式：国家+省名（如"阿根廷布宜诺斯艾利斯"）
        let fromDisplay = gift.from || '地球另一端';
        let fromDisplayEn = gift.fromEn || '';
        
        // 如果 gift 中有匹配结果，使用更精确的名称
        if (gift._antipodeResult && gift._antipodeResult.level === 'province') {
            fromDisplay = gift._antipodeResult.displayName;
            fromDisplayEn = gift._antipodeResult.displayNameEn;
        } else {
            // 降级：使用 placeMap 映射
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
            fromDisplayEn = placeMap[gift.from] || gift.from || fromDisplay;
        }
        
        elements.giftFromPlace.textContent = `——${fromDisplay}`;
        elements.giftFromEn.textContent = `A gentle breeze from the far side of the earth — ${fromDisplayEn || fromDisplay}`;

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
    // ===== 判断是否在南美陆地（内部辅助函数） =====
    function isSouthAmericaLand(lat, lng) {
        return lat > -55 && lat < 12 && lng > -82 && lng < -34;
    }
    
    // ===== 1. 太平洋优先 =====
    // 经度 < -72 且在南美西海岸纬度范围内 → 太平洋
    if (antiLng < -72 && antiLat > -55 && antiLat < -12) {
        return { type: 'ocean', region: 'pacific' };
    }
    
    // 太平洋宽泛区域
    if ((antiLng >= 120 && antiLng <= 180) || (antiLng >= -180 && antiLng < -80)) {
        return { type: 'ocean', region: 'pacific' };
    }

    // ===== 2. 东海岸外海（南纬35度以南，经度 < -52） =====
    // 阿根廷东海岸和巴塔哥尼亚以东的大西洋海域
    // 覆盖沈阳（-41.79, -56.61）、哈尔滨（-45.76, -53.37）等
    if (antiLat < -35 && antiLng < -52) {
        return { type: 'ocean', region: 'atlantic' };
    }

    // ===== 3. 大西洋 =====
    if (antiLng >= -75 && antiLng <= -10 && !isSouthAmericaLand(antiLat, antiLng)) {
        return { type: 'ocean', region: 'atlantic' };
    }

    // ===== 4. 南美洲陆地 =====
    const isSouthAmerica = antiLat > -55 && antiLat < 12 && antiLng > -82 && antiLng < -34;
    if (isSouthAmerica) {
        // 智利
        if (antiLat > -55 && antiLat < -20 && antiLng >= -72 && antiLng < -65) {
            return { type: 'land', country: '智利' };
        }
        // 阿根廷
        if (antiLat > -55 && antiLat < -20 && antiLng >= -65 && antiLng < -55) {
            return { type: 'land', country: '阿根廷' };
        }
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
        // 默认南美洲
        return { type: 'land', country: '阿根廷' };
    }

    // ===== 5. 其他大洲 =====
    if (antiLng >= -15 && antiLng <= 50 && antiLat > -35 && antiLat < 37) {
        return { type: 'land', country: '非洲' };
    }
    if (antiLat > 35 && antiLat < 70 && antiLng > -10 && antiLng < 40) {
        return { type: 'land', country: '欧洲' };
    }
    if (antiLat > 10 && antiLat < 75 && antiLng > 40 && antiLng < 180) {
        return { type: 'land', country: '亚洲' };
    }
    if (antiLat > -45 && antiLat < -10 && antiLng > 110 && antiLng < 180) {
        return { type: 'land', country: '大洋洲' };
    }

    // ===== 6. 兜底 =====
    return { type: 'ocean', region: 'pacific', country: '太平洋' };
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
            
            // 🔧 新增：获取精确对跖点信息（省/州级别）
            let antipodeResult = null;
            if (typeof window.getAntipodeProvince === 'function') {
                try {
                    antipodeResult = window.getAntipodeProvince(antiLat, antiLng);
                } catch (e) {
                    console.warn('获取对跖点精确信息失败:', e);
                }
            }
            
            // 设置对跖点来源名称（优先使用精确匹配结果）
            if (antipodeResult && (antipodeResult.level === 'province' || antipodeResult.level === 'country')) {
                giftCity._antipodeResult = antipodeResult;
                giftCity.from = antipodeResult.displayName || region.country || '地球另一端';
                giftCity.fromEn = antipodeResult.displayNameEn || '';
            } else {
                giftCity.from = region.country || '地球另一端';
    giftCity.fromEn = ''; // ✅ 显式赋值
                // fromEn 由 showGift 中的 placeMap 降级处理
            }
            
            // 兜底：antipode_name 用于旧逻辑兼容
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
    // 1. 如果没有城市数据，直接用随机兜底
    if (!city) {
        const fallbackList = [
            '/images/share-bg/card01.png',
            '/images/share-bg/card02.png',
            '/images/share-bg/card03.png',
            '/images/share-bg/card04.png',
        ];
        return fallbackList[Math.floor(Math.random() * fallbackList.length)];
    }
    
    // 2. 计算对跖点并获取大区
    const anti = calculateAntipode(city.lat, city.lng);
    const region = window.getRegion(anti.lat, anti.lng);
    const visualTheme = getVisualTheme(region?.id || '');
    
    // 3. 如果是 fallback（非南美区域），使用随机兜底
    if (visualTheme === 'fallback') {
        const fallbackList = [
            '/images/share-bg/card01.png',
            '/images/share-bg/card02.png',
            '/images/share-bg/card03.png',
            '/images/share-bg/card04.png',
        ];
        return fallbackList[Math.floor(Math.random() * fallbackList.length)];
    }
    
    // 4. 南美区域 → 使用主题底图
    const theme = VISUAL_THEMES[visualTheme];
    return theme ? theme.bgImage : '/images/share-bg/card01.png';
}

/**
 * 获取主题配色方案
 * @param {string} visualTheme - 视觉主题 ID
 * @returns {Object} { landColor, seaColor, lineColor }
 */
function getThemeColors(visualTheme) {
    if (visualTheme === 'fallback' || !VISUAL_THEMES[visualTheme]) {
        // 兜底：使用复古配色
        return {
            landColor: '#d5c8b8',
            seaColor: '#f5f0e6',
            lineColor: '#c8b8a0'
        };
    }
    const theme = VISUAL_THEMES[visualTheme];
    return {
        landColor: theme.landColor,
        seaColor: theme.seaColor,
        lineColor: theme.lineColor,
    };
}
// ===== 世界地图绘制函数（Canvas 绘制复古风格世界地图，支持双色模式） =====
// ===== 世界地图绘制函数（支持方形邮票 + 羊皮纸纹理 + 内缩留白） =====
async function drawWorldMapContent(ctx, x, y, size, originCoord, antipodeCoord, stretch = false, innerPadding = 0, themeColors = null) {
    // 1. 加载 GeoJSON 数据
    if (!worldMapData) {
        try {
            const response = await fetch('/data/land-110m.geojson');
            if (!response.ok) throw new Error('HTTP ' + response.status);
            worldMapData = await response.json();
        } catch (e) {
            console.error('加载世界地图数据失败:', e);
            ctx.save();
            ctx.fillStyle = '#1a2a4a';
            ctx.fillRect(x, y, size, size);
            ctx.fillStyle = '#e8923a';
            ctx.font = 'bold 18px "Noto Serif SC", "Noto Sans SC", serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✦ 对跖点漫游局', x + size/2, y + size/2 - 8);
            ctx.fillStyle = 'rgba(245, 240, 232, 0.7)';
            ctx.font = '14px "Noto Serif SC", "Noto Sans SC", serif';
            ctx.fillText('探索地球另一端', x + size/2, y + size/2 + 22);
            ctx.restore();
            return;
        }
    }

    // 2. 使用预加载的羊皮纸纹理（已在外部预加载，无需额外加载代码）

      // 3. 判断模式：左侧（原点）或右侧（对跖点）
    const isOriginMode = (originCoord && typeof originCoord.lat === 'number' && typeof originCoord.lng === 'number') &&
                         (!antipodeCoord || typeof antipodeCoord.lat !== 'number');

    // 4. 配色方案（优先使用主题配色，否则使用复古配色）
    let landColor, seaColor, lineColor;
    if (themeColors && themeColors.landColor) {
        // 使用主题配色（左右互换）
        if (isOriginMode) {
            landColor = themeColors.landColor;
            seaColor = themeColors.seaColor;
            lineColor = themeColors.lineColor || '#c8b8a0';
        } else {
            landColor = themeColors.seaColor;
            seaColor = themeColors.landColor;
            lineColor = themeColors.lineColor || '#c8b8a0';
        }
    } else {
        // 复古配色
        if (isOriginMode) {
            landColor = '#d5c8b8';
            seaColor = '#f5f0e6';
            lineColor = '#c8b8a0';
        } else {
            landColor = '#f5f0e6';
            seaColor = '#d5c8b8';
            lineColor = '#c8b8a0';
        }
    }

    // 5. 计算绘制区域（支持拉伸填满方形 + 内缩留白）
    const padding = size * 0.06 + innerPadding;
    let mapWidth, mapHeight, offsetX, offsetY;

    if (stretch) {
        mapWidth = size - padding * 2;
        mapHeight = size - padding * 2;
        offsetX = 0;
        offsetY = 0;
    } else {
        const containerWidth = size - padding * 2;
        const containerHeight = size - padding * 2;
        const mapAspect = 2;
        const containerAspect = containerWidth / containerHeight;
        if (containerAspect > mapAspect) {
            mapHeight = containerHeight;
            mapWidth = mapHeight * mapAspect;
            offsetX = (containerWidth - mapWidth) / 2;
            offsetY = 0;
        } else {
            mapWidth = containerWidth;
            mapHeight = mapWidth / mapAspect;
            offsetX = 0;
            offsetY = (containerHeight - mapHeight) / 2;
        }
    }

    // 6. 投影函数
    function project(lat, lng) {
        const px = (lng + 180) / 360 * mapWidth + offsetX;
        const py = (90 - lat) / 180 * mapHeight + offsetY;
        return { x: x + padding + px, y: y + padding + py };
    }

    // 7. 绘制海洋底色
    ctx.save();
    ctx.fillStyle = seaColor;
    ctx.fillRect(x + padding, y + padding, mapWidth, mapHeight);
    ctx.restore();

    // 海洋纹理（更明显）
    ctx.save();
    for (var i = 0; i < 600; i++) {
        var xPos = x + padding + Math.random() * mapWidth;
        var yPos = y + padding + Math.random() * mapHeight;
        var alpha = Math.random() * 0.06;
        ctx.fillStyle = 'rgba(180, 170, 160, ' + alpha + ')';
        ctx.fillRect(xPos, yPos, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    ctx.restore();

    // 8. 绘制大陆（填充 + 描边）
    ctx.save();
    ctx.beginPath();
    const features = worldMapData.features;
    if (!features || !Array.isArray(features)) {
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#e8dcc8';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = '#e8923a';
        ctx.font = 'bold 18px "Noto Serif SC", "Noto Sans SC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✦ 对跖点漫游局', x + size/2, y + size/2 - 8);
        ctx.fillStyle = 'rgba(26, 42, 74, 0.5)';
        ctx.font = '14px "Noto Serif SC", "Noto Sans SC", serif';
        ctx.fillText('探索地球另一端', x + size/2, y + size/2 + 22);
        ctx.restore();
        return;
    }

    features.forEach(feature => {
        const geometry = feature.geometry;
        if (!geometry) return;
        const coordinates = geometry.coordinates;
        let polygons = [];
        if (geometry.type === 'Polygon') polygons = [coordinates];
        else if (geometry.type === 'MultiPolygon') polygons = coordinates;
        else return;
        polygons.forEach(polygon => {
            polygon.forEach(ring => {
                ring.forEach((coord, index) => {
                    const [lng, lat] = coord;
                    const pos = project(lat, lng);
                    if (index === 0) {
                        ctx.moveTo(pos.x, pos.y);
                    } else {
                        ctx.lineTo(pos.x, pos.y);
                    }
                });
            });
        });
    });
    ctx.closePath();

    ctx.fillStyle = landColor;
ctx.fill();

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.0;
    ctx.stroke();
    ctx.restore();

    // 陆地噪点
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + padding, y + padding, mapWidth, mapHeight);
    ctx.clip();
    for (var j = 0; j < 800; j++) {
        var px = x + padding + Math.random() * mapWidth;
        var py = y + padding + Math.random() * mapHeight;
        ctx.fillStyle = 'rgba(139, 115, 85, ' + (Math.random() * 0.10) + ')';
        ctx.fillRect(px, py, 1, 1);
    }
    ctx.restore();

    // 赤道 + 回归线
    ctx.save();
    ctx.setLineDash([3, 6]);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(120, 100, 80, 0.12)';
    ctx.beginPath();

    var eqY = project(0, 0).y;
    ctx.moveTo(x + padding, eqY);
    ctx.lineTo(x + padding + mapWidth, eqY);

    var tropicY1 = project(23.5, 0).y;
    ctx.moveTo(x + padding, tropicY1);
    ctx.lineTo(x + padding + mapWidth, tropicY1);

    var tropicY2 = project(-23.5, 0).y;
    ctx.moveTo(x + padding, tropicY2);
    ctx.lineTo(x + padding + mapWidth, tropicY2);

    ctx.stroke();
    ctx.restore();

    // 经纬网（加深）
    ctx.save();
    ctx.setLineDash([2, 8]);
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = 'rgba(120, 100, 80, 0.50)';
    ctx.beginPath();

    var longitudes = [-60, 0, 60, 120];
    longitudes.forEach(function(lng) {
        var pts = [];
        for (var lat = -80; lat <= 80; lat += 2) {
            var pos = project(lat, lng);
            pts.push(pos);
        }
        if (pts.length > 1) {
            ctx.moveTo(pts[0].x, pts[0].y);
            for (var k = 1; k < pts.length; k++) {
                ctx.lineTo(pts[k].x, pts[k].y);
            }
        }
    });

    var latitudes = [-60, -30, 0, 30, 60];
    latitudes.forEach(function(lat) {
        var pos1 = project(lat, -170);
        var pos2 = project(lat, 170);
        ctx.moveTo(pos1.x, pos1.y);
        ctx.lineTo(pos2.x, pos2.y);
    });

    ctx.stroke();
    ctx.restore();

    // 9. 叠加羊皮纸纹理（使用预加载的 parchmentTexture）
    if (parchmentTexture) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + padding, y + padding, mapWidth, mapHeight);
        ctx.clip();

        const pattern = ctx.createPattern(parchmentTexture, 'repeat');
        ctx.fillStyle = pattern;
        ctx.globalAlpha = 0.30;
        ctx.fillRect(x + padding, y + padding, mapWidth, mapHeight);
        ctx.restore();
    }

    // 10. 绘制标记点（水滴地标）
    const points = [];
    if (isOriginMode && originCoord) {
        points.push({ coord: originCoord, color: '#e8923a' });
    } else if (!isOriginMode && antipodeCoord) {
        points.push({ coord: antipodeCoord, color: '#2898e8' });
    }

    points.forEach(({ coord, color }) => {
        if (!coord || typeof coord.lat !== 'number' || typeof coord.lng !== 'number') return;
        const pos = project(coord.lat, coord.lng);
        const dotX = pos.x;
        const dotY = pos.y;

        // 光晕
        ctx.save();
        const gradient = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 15);
        gradient.addColorStop(0, color + '66');
        gradient.addColorStop(1, color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 水滴地标
        var size = 7;
        drawTeardropOnCanvas(ctx, dotX, dotY, color, size);
    });
}

async function generateShareCard(city) {
// ===== 硬编码省名中文翻译（确保分享卡显示中文） =====
const PROVINCE_NAME_MAP = {
  // === 阿根廷 ===
  "Entre Ríos": "恩特雷里奥斯",
  "Buenos Aires": "布宜诺斯艾利斯",
  "Córdoba": "科尔多瓦",
  "Santa Fe": "圣菲",
  "Mendoza": "门多萨",
  "Salta": "萨尔塔",
  "Santiago del Estero": "圣地亚哥-德尔埃斯特罗",
  "Catamarca": "卡塔马卡",
  "La Rioja": "拉里奥哈",
  "San Juan": "圣胡安",
  "San Luis": "圣路易斯",
  "Tucumán": "图库曼",
  "Jujuy": "胡胡伊",
  "Formosa": "福尔摩萨",
  "Chaco": "查科",
  "Misiones": "米西奥内斯",
  "Corrientes": "科连特斯",
  "Neuquén": "内乌肯",
  "Río Negro": "内格罗河",
  "La Pampa": "拉潘帕",
  "Tierra del Fuego": "火地岛",
  "Chubut": "丘布特",
  "Santa Cruz": "圣克鲁斯",
  "Ciudad de Buenos Aires": "布宜诺斯艾利斯市",
  // === 智利 ===
  "Santiago Metropolitan": "圣地亚哥首都大区",
  "Región Metropolitana de Santiago": "圣地亚哥首都大区",
  "Valparaíso": "瓦尔帕莱索",
  "Biobío": "比奥比奥",
  "Maule": "马乌莱",
  "Coquimbo": "科金博",
  "Antofagasta": "安托法加斯塔",
  "Atacama": "阿塔卡马",
  "La Araucanía": "阿劳卡尼亚",
  "Los Lagos": "湖大区",
  "Aisén del General Carlos Ibáñez del Campo": "艾森",
  "Magallanes y Antártica Chilena": "麦哲伦",
  "Tarapacá": "塔拉帕卡",
  "Arica y Parinacota": "阿里卡和帕里纳科塔",
  "Los Ríos": "河大区",
  "Ñuble": "纽夫莱",
  "Libertador General Bernardo O'Higgins": "解放者贝尔纳多·奥希金斯将军大区",
  // === 秘鲁 ===
  "Lima": "利马",
  "Cusco": "库斯科",
  "Arequipa": "阿雷基帕",
  "La Libertad": "拉利伯塔德",
  "Piura": "皮乌拉",
  "Lambayeque": "兰巴耶克",
  "Tacna": "塔克纳",
  "Moquegua": "莫克瓜",
  "Puno": "普诺",
  "Junín": "胡宁",
  "Huánuco": "瓦努科",
  "Áncash": "安卡什",
  "Ica": "伊卡",
  "Ayacucho": "阿亚库乔",
  "Cajamarca": "卡哈马卡",
  "San Martín": "圣马丁",
  "Ucayali": "乌卡亚利",
  "Madre de Dios": "马德雷德迪奥斯",
  "Amazonas": "亚马孙",
  "Loreto": "洛雷托",
  "Pasco": "帕斯科",
  "Huancavelica": "万卡韦利卡",
  "Apurímac": "阿普里马克",
  "Callao": "卡亚俄",
  "Lima Province": "利马省"
};
// ===== 🔽 在这里添加国家名中文翻译映射 =====
const COUNTRY_NAME_MAP = {
  "Argentina": "阿根廷",
  "Chile": "智利",
  "Peru": "秘鲁",
  "Brazil": "巴西",
  "Bolivia": "玻利维亚",
  "Uruguay": "乌拉圭",
  "Paraguay": "巴拉圭",
  "Spain": "西班牙",
  "New Zealand": "新西兰",
  "Australia": "澳大利亚",
  "United States": "美国",
  "Canada": "加拿大",
  "Mexico": "墨西哥",
  "France": "法国",
  "Germany": "德国",
  "Italy": "意大利",
  "United Kingdom": "英国",
  "Japan": "日本",
  "South Korea": "韩国",
  "China": "中国",
"Colombia": "哥伦比亚",
"Ecuador": "厄瓜多尔",
"Venezuela": "委内瑞拉",

  // ... 根据需要补充其他常用国家
};
// ===== 新增：确保 GeoJSON 已加载 =====
    await ensureWorldMapData();
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
// 先获取主题信息，用于底图和配色
const anti = calculateAntipode(city.lat, city.lng);
const region = window.getRegion(anti.lat, anti.lng);
const visualThemeId = getVisualTheme(region?.id || '');
const themeColors = getThemeColors(visualThemeId);

const bgPath = getThemeBg(city);
let bgImage = bgImageCache[bgPath];
if (!bgImage || !bgImage.complete) {
    bgImage = await loadImage(bgPath);
}
    if (!bgImage) {
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
// 使用全局常量（已在文件末尾定义），此处不再重复定义
// 仅保留底部标语（未在其他地方定义）
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


    // ===== 3. 地图区域 =====
    const topMargin = 76;
    const gap = 12;
    const imgWidth = (W - 24 * 2 - gap) / 2;
    const imgHeight = imgWidth;
    const imgY = topMargin + 30;

      // ---- 3a. 加载地图图片 ----
let originImg = null;
let antipodeImg = null;

// 有数据库图片 → 直接使用（带缓存）
if (city.origin_image) {
    originImg = await loadImageWithCache(city.origin_image);
    if (!originImg) {
        console.warn('⚠️ 地标图加载失败:', city.origin_image);
    }
}
if (city.antipode_image) {
    antipodeImg = await loadImageWithCache(city.antipode_image);
    if (!antipodeImg) {
        console.warn('⚠️ 对跖点图加载失败:', city.antipode_image);
    }
}

// 没有数据库图片 → 用 Canvas 绘制复古地图（不需要任何请求）
if (!city.origin_image && !city.antipode_image) {
    console.log('🖼️ 没有数据库图片，使用 Canvas 绘制复古地图');
    // originImg 和 antipodeImg 保持 null，后续走 drawWorldMapContent
}

    // 对跖点坐标计算（供后续使用）
    let antiLat = city.antipode_lat;
    let antiLng = city.antipode_lng;
    if (!antiLat || !antiLng) {
        const anti = calculateAntipode(city.lat, city.lng);
        antiLat = anti.lat;
        antiLng = anti.lng;
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
    function drawStampPath(ctx, rx, ry, rw, rh) {
    const tooth = 10;
    const cornerRadius = tooth;
    const cols = Math.max(6, Math.floor((rw - 2 * cornerRadius) / 24));
    const rows = Math.max(4, Math.floor((rh - 2 * cornerRadius) / 24));
    const stepX = (rw - 2 * cornerRadius) / cols;
    const stepY = (rh - 2 * cornerRadius) / rows;

    ctx.beginPath();
    ctx.moveTo(rx, ry + cornerRadius);
    ctx.arc(rx + cornerRadius, ry + cornerRadius, cornerRadius, Math.PI, -Math.PI / 2, false);
    for (let i = 0; i < cols; i++) {
        const cx = rx + cornerRadius + (i + 0.5) * stepX;
        ctx.lineTo(cx - tooth, ry);
        ctx.arc(cx, ry, tooth, Math.PI, 0, true);
    }
    ctx.arc(rx + rw - cornerRadius, ry + cornerRadius, cornerRadius, -Math.PI / 2, 0, false);
    for (let i = 0; i < rows; i++) {
        const cy = ry + cornerRadius + (i + 0.5) * stepY;
        ctx.lineTo(rx + rw, cy - tooth);
        ctx.arc(rx + rw, cy, tooth, -Math.PI / 2, Math.PI / 2, true);
    }
    ctx.arc(rx + rw - cornerRadius, ry + rh - cornerRadius, cornerRadius, 0, Math.PI / 2, false);
    for (let i = cols - 1; i >= 0; i--) {
        const cx = rx + cornerRadius + (i + 0.5) * stepX;
        ctx.lineTo(cx + tooth, ry + rh);
        ctx.arc(cx, ry + rh, tooth, 0, Math.PI, true);
    }
    ctx.arc(rx + cornerRadius, ry + rh - cornerRadius, cornerRadius, Math.PI / 2, Math.PI, false);
    for (let i = rows - 1; i >= 0; i--) {
        const cy = ry + cornerRadius + (i + 0.5) * stepY;
        ctx.lineTo(rx, cy + tooth);
        ctx.arc(rx, cy, tooth, Math.PI / 2, -Math.PI / 2, true);
    }
    ctx.closePath();
}

   // ---- 3d. 绘制两张邮票地图 ----
const x1 = 24;
const x2 = 24 + imgWidth + gap;
const y = typeof imgY !== 'undefined' ? imgY + 16 : 80;
async function drawStampWithMap(ctx, x, y, size, originCoord, antipodeCoord, stretch = false, innerPadding = 0, img = null, themeColors = null) {
    const rx = x;
    const ry = y;
    const rw = size;
    const rh = size;

    // ===== 第一步：绘制白色齿孔背景（含锯齿） =====
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#ffffff';
    drawStampPath(ctx, rx, ry, rw, rh);
    ctx.fill();
    ctx.restore();

    // ===== 第二步：计算内部矩形区域 =====
// ⬇️ 在这里修改：根据是否有图片，使用不同的边距值
let margin;
if (img) {
    // 有图片：白边 8%（图片没有内部边距）
    margin = size * 0.08;
} else {
    // 没有图片（地图）：白边 4%，加上 drawWorldMapContent 内部的 6%
    // 总白边 ≈ 4% + 6% = 10%，与图片的 8% 接近
    margin = size * 0.04;
}
    const rectX = rx + margin;
const rectY = ry + margin;
const rectW = rw - margin * 2;
const rectH = rh - margin * 2;

    // ===== 第三步：在矩形区域内绘制图片或地图 =====
    if (img) {
        ctx.save();
        ctx.drawImage(img, rectX, rectY, rectW, rectH);
        ctx.restore();
    } else {
        ctx.save();
        ctx.beginPath();
        ctx.rect(rectX, rectY, rectW, rectH);
        ctx.clip();
        await drawWorldMapContent(ctx, rectX, rectY, rectW, originCoord, antipodeCoord, stretch, 0, themeColors);
        ctx.restore();
    }

    // ===== 第四步：绘制白色锯齿描边（强化锯齿边缘） =====
    ctx.save();
    drawStampPath(ctx, rx, ry, rw, rh);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.0;
    ctx.stroke();
    ctx.restore();

    // ===== 第五步：极浅外阴影 =====
    ctx.save();
    drawStampPath(ctx, rx + 0.5, ry + 0.5, rw, rh);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}
// 在 generateShareCard 中，获取视觉主题（放在加载地图图片之后，绘制邮票之前）

// 左侧邮票
await drawStampWithMap(ctx, x1, y, imgWidth,
    { lat: city.lat, lng: city.lng },
    null,
    true,
    8,
    originImg,
    themeColors  // 传入主题配色
);

// 右侧邮票
await drawStampWithMap(ctx, x2, y, imgWidth,
    null,
    { lat: antiLat, lng: antiLng },
    true,
    8,
    antipodeImg,
    themeColors  // 传入主题配色
);
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

// ---- 获取对跖点显示名称（数据库优先） ----
const dbName = city.antipode_name || '';
const dbNameEn = city.antipode_name_en || '';
const hasDbName = dbName && dbName !== '地球另一端';

let antipodeCountry = '';
let antipodeProvince = '';
let antipodeProvinceEn = '';
let antipodeCountryEn = '';

if (hasDbName) {
    // 1. 数据库有名称 → 直接使用（最高优先级）
    antipodeCountry = dbName;
    antipodeProvince = '';
    antipodeProvinceEn = dbNameEn || '';
    antipodeCountryEn = dbNameEn || '';
    console.log(`✅ 使用数据库对跖点名称: ${dbName}`);
} else if (typeof getAntipodeProvince === 'function') {
    // 2. 数据库无名称 → 走匹配逻辑
    try {
        const antiLat = city.antipode_lat;
        const antiLng = city.antipode_lng;
        if (antiLat && antiLng) {
            const result = getAntipodeProvince(antiLat, antiLng);
            if (result) {
                if (result.level === 'province') {
                    antipodeCountry = result.country || '';
                    antipodeProvince = result.name || '';
                    antipodeProvinceEn = result.nameEn || '';
                    antipodeCountryEn = result.countryEn || '';
                    console.log(`✅ 匹配到省: ${result.displayName}`);
                } else if (result.level === 'country') {
                    antipodeCountry = result.displayName || '';
                    antipodeProvince = '';
                    antipodeProvinceEn = '';
                    antipodeCountryEn = result.displayNameEn || '';
                } else if (result.level === 'ocean') {
                    antipodeCountry = result.displayName || '';
                    antipodeProvince = '';
                    antipodeProvinceEn = '';
                    antipodeCountryEn = result.displayNameEn || '';
                }
            }
        }
    } catch (e) {
        console.warn('对跖点匹配失败，使用降级值:', e);
        antipodeCountry = '地球另一端';
    }
} else {
    // 3. 降级
    antipodeCountry = '地球另一端';
}
// ===== 国家名转中文 =====
if (antipodeCountry && COUNTRY_NAME_MAP[antipodeCountry]) {
    antipodeCountry = COUNTRY_NAME_MAP[antipodeCountry];
}

const cityNameEn = city.name_en || city.name_cn;

// ---- 左侧（原点城市名）----
ctx.textAlign = 'center';
ctx.textBaseline = 'top';
ctx.fillStyle = textColor;
ctx.font = '600 18px "Noto Serif SC", "Noto Sans SC", serif';
ctx.fillText(`${city.name_cn}`, x1 + imgWidth / 2, titleY);

ctx.fillStyle = textColor;
ctx.globalAlpha = 0.6;
ctx.font = '400 16px "Noto Serif SC", "Noto Sans SC", serif';
ctx.fillText(`(${cityNameEn})`, x1 + imgWidth / 2, titleY + 26);
ctx.globalAlpha = 1.0;

// ---- 右侧（对跖点）三行排版 ----
let currentY = titleY;

// 第一行：国家名（18px）
ctx.textAlign = 'center';
ctx.textBaseline = 'top';
ctx.fillStyle = textColor;
ctx.font = '600 18px "Noto Serif SC", "Noto Sans SC", serif';
ctx.fillText(antipodeCountry || '地球另一端', x2 + imgWidth / 2, currentY);

// 省名转中文（如果匹配到省）
// 使用英文省名映射到纯中文（不带国家）
if (antipodeProvinceEn && PROVINCE_NAME_MAP[antipodeProvinceEn]) {
    antipodeProvince = PROVINCE_NAME_MAP[antipodeProvinceEn];
}
// 如果没有英文省名，则使用原始值（可能是中文，也可能是英文）
// 但最好保留原值，不过此处不再处理，因为上面已经映射了

const hasProvince = antipodeProvince && antipodeProvince.trim();

if (hasProvince) {
    // 第二行：省名（16px，小两号）
    currentY += 26;
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.85;
    ctx.font = '400 16px "Noto Serif SC", "Noto Sans SC", serif';
    ctx.fillText(antipodeProvince, x2 + imgWidth / 2, currentY);

    // 第三行：英文省名（14px，括号，不带国家）
    if (antipodeProvinceEn) {
        currentY += 24;
        ctx.fillStyle = textColor;
        ctx.globalAlpha = 0.45;
        ctx.font = '400 14px "Noto Serif SC", "Noto Sans SC", serif';
        ctx.fillText(`(${antipodeProvinceEn})`, x2 + imgWidth / 2, currentY);
        ctx.globalAlpha = 1.0;
    }
} else {
    // 没有省名 → 第二行显示英文国家名（与左侧格式一致）
    currentY += 26;
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.6;
    ctx.font = '400 16px "Noto Serif SC", "Noto Sans SC", serif';
    const countryEn = antipodeCountryEn || antipodeCountry;
    ctx.fillText(`(${countryEn})`, x2 + imgWidth / 2, currentY);
    ctx.globalAlpha = 1.0;
}

// 🔧 修改：天气行移除，改为在这里绘制（与城市名/国家名同一行）
// 原点天气（显示在左侧城市名右侧，靠近中部）
const weatherOrigin = window._originWeather;
const weatherAnti = window._antipodeWeather;

if (weatherOrigin) {
    const originInfo = getWeatherInfo(weatherOrigin.weathercode);
    const originTemp = Math.round(weatherOrigin.temperature);
    const weatherText = `${originInfo.icon} ${originTemp}°C`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.font = '400 14px "Noto Serif SC", "Noto Sans SC", serif';
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.75;
    // 绘制在左侧邮票右边缘左侧 8px（缩进一个字）
    const leftEdge = x1 + imgWidth;
    ctx.fillText(weatherText, leftEdge - 8, titleY);
    ctx.globalAlpha = 1.0;
}

// 对跖点天气（显示在右侧国家名左侧，靠近中部）
if (weatherAnti) {
    const antiInfo = getWeatherInfo(weatherAnti.weathercode);
    const antiTemp = Math.round(weatherAnti.temperature);
    const weatherText = `${antiInfo.icon} ${antiTemp}°C`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '400 14px "Noto Serif SC", "Noto Sans SC", serif';
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.75;
    // 绘制在右侧邮票左边缘右侧 8px（缩进一个字）
    const rightEdge = x2;
    ctx.fillText(weatherText, rightEdge + 8, titleY);
    ctx.globalAlpha = 1.0;
}

// ---- 🔧 修改：移除原独立天气行代码，直接计算 poemY ----
// ---- 计算 poemY（统一所有卡片，整体下移两行） ----
// 基础偏移：城市名两行高度 52px + 间距 6px + 下移两行（约 52px）
// 不再依赖 hasProvince 做偏移，统一高度，消除诗句位置不一致
const baseOffset = 95;  // 100 - 5 = 95，所有诗句再上移 5px
const poemY = titleY + baseOffset;
               // ===== 5. 人文短句 =====
const maxWidth = W - 48;
// poemY 已在上面计算好，直接使用
const currentGift = window._currentGift ? JSON.parse(JSON.stringify(window._currentGift)) : null;
// 存入全局，供分享卡按钮使用
window._lastShareCardData = { city: city, gift: currentGift };

const hasGift = currentGift && currentGift.name;


    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // ---- 中文诗句 ----
    let poemCN = city.poem || DEFAULT_POEM_CN;

    // 如果 city.poem 是旧版（包含「此刻，你脚下的土地」），替换为新版
    if (poemCN.includes('「此刻，你脚下的土地，正与地球另一端悄然相连」')) {
        poemCN = DEFAULT_POEM_CN;
    }

    // 🔧 修改：如果有物产，只取第一行中文，不显示英文
    if (hasGift) {
        const lines = poemCN.split('\n');
        poemCN = lines[0] || DEFAULT_POEM_CN;
    }

    // 检查是否包含换行符（说明 poem 中嵌入了英文）
    const hasEmbeddedEN = poemCN.includes('\n');
    let lineY = poemY;
// 在 poemY 之后，if (hasEmbeddedEN) 之前声明
let hasShownEmbeddedEN = false;
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
        hasShownEmbeddedEN = true;
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
        hasShownEmbeddedEN = false;
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
currentY = lineY + 12;
    const bottomBrandY = H - 44;
    // gift 和 hasGift 已在第 5 部分声明，直接使用

    if (hasGift) {
                // ---------- 计算布局 ----------
        const imgSize = 180;
        // 右图中心 X 坐标（对跖点地图中心）
        const rightMapCenterX = x2 + imgWidth / 2;
        const imgX = rightMapCenterX - imgSize / 2 + 16;  // 向右移动 16px
const imgY = currentY;  // 整体下移 15px（原 -15 → 0）
const textX = 24;
        // 文字区域最大宽度（图片左侧 - 文字左侧 - 间距）
        const maxTextWidth = imgX - textX - 16;

        // ---------- 加载物产图片 ----------
let productImg = null;
if (currentGift && currentGift.image) {
    productImg = await loadImageWithCache(currentGift.image);
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
      let textY = imgY - 5;  // 标题相对图片再上移 5px（原10px，向下移动5px）
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
ctx.font = '600 17px "Noto Serif SC", "Noto Sans SC", serif';
const nameText = currentGift.name || '一份礼物';
ctx.fillText(nameText, textX, nameLineY);

if (currentGift.name_en) {
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.5;
    ctx.font = '400 15px "Noto Serif SC", "Noto Sans SC", serif';
    const nameEnX = textX + ctx.measureText(nameText).width + 16;
    ctx.fillText(`(${currentGift.name_en})`, nameEnX, nameLineY + 1);
}
        ctx.globalAlpha = 1.0;

        // 第三行：物产文案中文（14px，斜体）
let descLineY = nameLineY + lineHeight;
ctx.fillStyle = textColor;
ctx.globalAlpha = 0.7;
ctx.font = 'italic 400 15px "Noto Serif SC", "Noto Sans SC", serif';
const descCN = currentGift.poemRipe || currentGift.description || '来自地球另一端的风物';
const descLines = wrapText(ctx, descCN, maxTextWidth);
descLines.forEach((line, i) => {
    ctx.fillText(line, textX, descLineY + i * 22);
});
const descLinesCount = descLines.length;

      // 第四行：物产文案英文（13px，斜体，半透明）
let enLineY = descLineY + descLinesCount * 22 + 4;
const descEN = currentGift.poemRipe_en || currentGift.description_en || '';
if (descEN && descEN.trim()) {
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.4;
    ctx.font = 'italic 400 14px "Noto Serif SC", "Noto Sans SC", serif';
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
// 加载图片并存入 localStorage 缓存
async function loadImageWithCache(url, cacheKey) {
    try {
        const img = await loadImage(url);
        if (img) {
            // 将图片转为 Base64 存入缓存
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            
            // 缓存大小限制：单个图片通常 < 50KB，可缓存数十张
            try {
                localStorage.setItem(cacheKey, dataUrl);
            } catch (e) {
                // localStorage 已满，忽略
                console.warn('缓存存储失败:', e);
            }
        }
        return img;
    } catch (e) {
        console.warn('图片加载失败:', e);
        return null;
    }
}
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
       function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            console.log('✅ 图片加载成功:', src);
            resolve(img);
        };
        img.onerror = (e) => {
            console.warn('❌ 图片加载失败:', src, e);
            resolve(null);
        };
        img.src = src;
    });
}

// ===== 图片内存缓存 =====
const imageCache = new Map();

function loadImageWithCache(src) {
    if (!src) return Promise.resolve(null);
    if (imageCache.has(src)) {
        const cached = imageCache.get(src);
        if (cached && cached.complete) {
            console.log('✅ 图片命中缓存:', src);
            return Promise.resolve(cached);
        }
    }
    return loadImage(src).then(img => {
        if (img) {
            imageCache.set(src, img);
        }
        return img;
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
    
    // 检测是否包含中文字符
    const hasChinese = /[\u4e00-\u9fa5]/.test(text);
    
    if (hasChinese) {
        // 中文：按字符切割（原逻辑）
        const lines = [];
        let currentLine = '';
        for (const char of text) {
            const testLine = currentLine + char;
            if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = char;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
    } else {
        // 英文：按单词切割
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
    }
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
            // ===== 新增：检查 AMap 是否加载 =====
    if (!window.AMap) {
        console.warn('⚠️ AMap 未加载，地图功能不可用');
        document.querySelectorAll('.map-container').forEach(el => {
            el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.3);font-size:14px;">地图加载中...</div>';
        });
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
      // ===== 初始化应用（不再依赖 DOMContentLoaded） =====
function initApp() {
    applyBranding();
    fixQQBrowser();

    
    // ===== 新增：加载文案数据（八大区通用短句 + 天气反差文案） =====
    loadPoemData();
    
    // ===== 搜索防抖（避免快速连续搜索） =====
let searchDebounceTimer = null;

document.getElementById('searchBtn').onclick = function() {
    const keyword = document.getElementById('searchInput').value.trim();
    if (!keyword) return;
    
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(function() {
        searchLocation(keyword);
    }, 300);
};

document.getElementById('searchInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const keyword = this.value.trim();
        if (!keyword) return;
        
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(function() {
            searchLocation(keyword);
        }, 300);
    }
});
    updateHistoryList();
    // ===== 预加载 GeoJSON 地图数据（提升分享卡生成速度） =====
    if (!worldMapData) {
        fetch('/data/land-110m.geojson')
            .then(res => res.json())
            .then(data => { worldMapData = data; })
            .catch(() => { console.warn('预加载 GeoJSON 失败，分享卡生成时会重试'); });
    }
    // ===== 新增：预加载对跖点数据 =====
    if (typeof loadAntipodeData === 'function') {
        loadAntipodeData().then(() => {
            console.log('✅ 对跖点数据已预加载');
        }).catch(() => {
            console.warn('⚠️ 对跖点数据预加载失败，将使用降级方案');
        });
    }
// ===== 确保 window.getRegion 可用（兜底） =====
if (typeof window.getRegion !== 'function') {
    console.warn('⚠️ window.getRegion 未定义，使用内联 fallback');
    window.getRegion = function(lat, lng) {
        function isSouthAmericaLand(lat, lng) {
            return lat > -55 && lat < 12 && lng > -82 && lng < -34;
        }
        var REGION_BOUNDS = {
            northernChile: {
                name: '北智利',
                nameEn: 'Northern Chile',
                latMin: -27,
                latMax: -18,
                lngMin: -72,
                lngMax: -68
            },
            centralChile: {
                name: '中智利',
                nameEn: 'Central Chile',
                latMin: -37,
                latMax: -27,
                lngMin: -72,
                lngMax: -68
            },
            southernChile: {
                name: '南智利',
                nameEn: 'Southern Chile',
                latMin: -55,
                latMax: -37,
                lngMin: -76,
                lngMax: -68
            },
            pampas: {
                name: '布宜诺斯艾利斯 / 潘帕斯草原',
                nameEn: 'Buenos Aires / Pampas',
                latMin: -40,
                latMax: -28,
                lngMin: -64,
                lngMax: -56
            },
            mendoza: {
                name: '门多萨 / 安第斯山麓',
                nameEn: 'Mendoza / Andean Foothills',
                latMin: -37,
                latMax: -27,
                lngMin: -70,
                lngMax: -66
            },
            patagonia: {
                name: '巴塔哥尼亚',
                nameEn: 'Patagonia',
                latMin: -55,
                latMax: -40,
                lngMin: -72,
                lngMax: -64
           },
// ===== 新增：亚马孙雨林 =====
    amazon: {
        name: '亚马孙/内陆雨林',
        nameEn: 'Amazon / Inland Rainforest',
        latMin: -10,
        latMax: 3,
        lngMin: -74,
        lngMax: -50
    }
};
// ===== 新增：长尾国家兜底映射 =====
function getFallbackZoneByCountry(countryName) {
    var map = {
        '玻利维亚': 'andes',
        '巴拉圭': 'pampas',
        '乌拉圭': 'pampas',
        '秘鲁': 'andes',
        '厄瓜多尔': 'andes',
        '哥伦比亚': 'amazon',
        '委内瑞拉': 'amazon',
        '圭亚那': 'amazon',
        '苏里南': 'amazon',
    };
    return map[countryName] || null;
}
        // ===== 1. 太平洋优先判断（与 server.js 的 getApproximateName 保持一致） =====
if (lng < -72 && lat > -55 && lat < -12) {
    return { id: 'pacific', name: '太平洋', nameEn: 'Pacific Ocean' };
}

// ===== 2. 东海岸外海（南纬35度以南，经度 < -52） =====
// 阿根廷东海岸和巴塔哥尼亚以东的大西洋海域
// 覆盖沈阳（-41.79, -56.61）、哈尔滨（-45.76, -53.37）等
// 东海岸外海：只覆盖真正的大西洋海域（-58 到 -52 之间）
// 沈阳（-41.79, -56.61）和哈尔滨（-45.76, -53.37）会被捕获
// 北京（-39.90, -63.59）和包头（-40.65, -70.33）不会被捕获
if (lat < -35 && lng >= -58 && lng < -52) {
    return { id: 'atlantic', name: '大西洋', nameEn: 'Atlantic Ocean' };
}

// ===== 3. 大西洋判断 =====
if (lng >= -75 && lng <= -10 && !isSouthAmericaLand(lat, lng)) {
    return { id: 'atlantic', name: '大西洋', nameEn: 'Atlantic Ocean' };
}
        if (!isSouthAmericaLand(lat, lng)) {
            return { id: 'pacific', name: '太平洋', nameEn: 'Pacific Ocean' };
        }
        for (var id in REGION_BOUNDS) {
            var bounds = REGION_BOUNDS[id];
            if (lat >= bounds.latMin && lat <= bounds.latMax &&
                lng >= bounds.lngMin && lng <= bounds.lngMax) {
                return { id: id, name: bounds.name, nameEn: bounds.nameEn };
            }
        }
// ===== 6. 长尾国家/地区兜底（新增） =====
    // 先获取国家名
    if (typeof window.getAntipodeRegion === 'function') {
        const regionInfo = window.getAntipodeRegion(lat, lng);
        if (regionInfo && regionInfo.country) {
            const zoneId = getFallbackZoneByCountry(regionInfo.country);
            if (zoneId && REGION_BOUNDS[zoneId]) {
                const bounds = REGION_BOUNDS[zoneId];
                return { id: zoneId, name: bounds.name, nameEn: bounds.nameEn };
            }
        }
    }
    // ===== 7. 最终兜底：如果在南美洲但未匹配到具体大区 → 按纬度降级 =====

        if (lat < -40) return { id: 'patagonia', name: '巴塔哥尼亚', nameEn: 'Patagonia' };
        if (lat < -34) return { id: 'pampas', name: '潘帕斯草原', nameEn: 'Pampas' };
        if (lat < -27) return { id: 'mendoza', name: '门多萨', nameEn: 'Mendoza' };
        if (lat < -18) return { id: 'centralChile', name: '中智利', nameEn: 'Central Chile' };
        return { id: 'northernChile', name: '北智利', nameEn: 'Northern Chile' };
    };
}

    // ===== 太阳/月亮切换（同时支持 Cesium 和 Three.js） =====
    const dayNightToggle = document.getElementById('dayNightToggle');
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');

    if (dayNightToggle) {
        dayNightToggle.addEventListener('click', function() {
            // 判断当前模式：太阳显示中 → 切换到夜间
            const isNight = sunIcon.style.display !== 'none';
            const newMode = isNight;
            
            // 切换图标
            sunIcon.style.display = isNight ? 'none' : 'block';
            moonIcon.style.display = isNight ? 'block' : 'none';
            this.title = isNight ? '切换到日间模式' : '切换到夜间模式';
            
            // 1. 如果是桌面端（Cesium 已加载），切换 Cesium
            if (window.__toggleCesiumDayNight) {
                window.__toggleCesiumDayNight(window.__cesiumViewer, newMode);
                console.log(`🌓 Cesium 切换至 ${newMode ? '夜间' : '日间'}`);
            }
            
            // 2. 如果是移动端（Three.js），向 globe.html 发送消息
            const earthFrame = document.getElementById('earthFrame');
            if (earthFrame && earthFrame.contentWindow) {
                earthFrame.contentWindow.postMessage({
                    type: 'toggle-day-night',
                    isNightMode: newMode
                }, '*');
                console.log(`🌓 Three.js 切换至 ${newMode ? '夜间' : '日间'}`);
            }
            
            // 3. 兜底：如果两者都不存在，仅切换图标（但这种情况不应该发生）
            if (!window.__toggleCesiumDayNight && !earthFrame) {
                console.warn('⚠️ 没有可用的地球引擎，仅切换图标');
            }
        });
    }

    // 高德地图加载
    window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY };
    var script = document.createElement('script');
    script.src = 'https://webapi.amap.com/maps?v=2.0&key=' + AMAP_KEY;
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.onload = initMaps;
    script.onerror = function() { alert('高德地图加载失败，请检查网络'); };
    document.head.appendChild(script);
}

// 如果 DOM 还未加载完成，等待；否则直接执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

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
           const body = document.getElementById('appBody');
const isMobile = body?.classList.contains('is-mobile') || /Mobi|Android|iPhone/i.test(navigator.userAgent);
const isDesktop = !isMobile && window.innerWidth > 1024;
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
              const module = await import('./cesium-earth.js?v=20260710');
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