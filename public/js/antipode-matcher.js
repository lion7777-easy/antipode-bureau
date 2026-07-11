// antipode-matcher.js - 对跖点省界匹配模块
// 使用方式：在 HTML 中通过 <script> 标签引入

(function() {
    'use strict';

    let geoData = null;
    let isLoading = false;
    let loadPromise = null;
    let provinceNameMap = {};

    // ===== 加载 TopoJSON 和 Turf.js（CDN） =====
    function loadDependencies() {
        return new Promise((resolve, reject) => {
            if (window.topojson && window.turf) {
                resolve();
                return;
            }

            let loaded = 0;
            const total = 2;

            function checkDone() {
                loaded++;
                if (loaded === total) {
                    resolve();
                }
            }

            if (!window.topojson) {
                const script1 = document.createElement('script');
                script1.src = 'https://cdn.jsdelivr.net/npm/topojson-client@3';
                script1.onload = checkDone;
                script1.onerror = () => { reject(new Error('topojson-client 加载失败')); };
                document.head.appendChild(script1);
            } else {
                checkDone();
            }

            if (!window.turf) {
                const script2 = document.createElement('script');
                script2.src = 'https://cdn.jsdelivr.net/npm/@turf/turf@6';
                script2.onload = checkDone;
                script2.onerror = () => { reject(new Error('@turf/turf 加载失败')); };
                document.head.appendChild(script2);
            } else {
                checkDone();
            }
        });
    }

    // ===== 加载翻译映射表 =====
    async function loadProvinceNameMap() {
        try {
            const res = await fetch('/data/province_zh_map.json');
            if (res.ok) {
                const data = await res.json();
                if (data && Object.keys(data).length > 0) {
                    Object.assign(provinceNameMap, data);
                }
                console.log(`✅ 加载省名翻译 ${Object.keys(provinceNameMap).length} 条`);
            } else {
                console.warn('⚠️ 省名翻译映射表加载失败，使用英文降级');
            }
        } catch (e) {
            console.warn('⚠️ 省名翻译加载失败:', e);
        }
    }

    // ===== 获取中文省名 =====
    function getProvinceNameCN(enName) {
        if (!enName) return '';
        if (provinceNameMap[enName]) return provinceNameMap[enName];
        if (window.provinceNameMap && window.provinceNameMap[enName]) return window.provinceNameMap[enName];
        return enName;
    }

    // ===== 加载数据 =====
   function loadAntipodeData() {
    if (loadPromise) return loadPromise;
    if (geoData) {
        window.geoData = geoData;  // 如果已有数据，同步到全局
        return Promise.resolve(geoData);
    }

    isLoading = true;
    loadPromise = loadDependencies()
        .then(() => Promise.all([
            fetch('/data/high_freq.topojson'),
            fetch('/data/province_zh_map.json')
        ]))
        .then(([topoRes, mapRes]) => {
            if (!topoRes.ok) throw new Error('数据加载失败: ' + topoRes.status);
            return Promise.all([topoRes.json(), mapRes.ok ? mapRes.json() : {}]);
        })
        .then(([topo, mapData]) => {
            const { feature } = window.topojson;
            geoData = feature(topo, topo.objects.states);
            window.geoData = geoData;  // ⬅️ 关键：同步到全局
            if (mapData && Object.keys(mapData).length > 0) {
                Object.assign(provinceNameMap, mapData);
            }
            console.log(`✅ 对跖点数据加载完成，共 ${geoData.features.length} 个省/州`);
            console.log(`✅ 省名翻译 ${Object.keys(provinceNameMap).length} 条`);
            isLoading = false;
            return geoData;
        })
        .catch(err => {
            console.error('❌ 对跖点数据加载失败:', err);
            isLoading = false;
            loadPromise = null;
            throw err;
        });

    return loadPromise;
}

    // ===== 核心匹配函数 =====
    function getAntipodeProvince(lat, lng) {
        if (!geoData) {
            console.warn('⚠️ 对跖点数据未加载，返回降级结果');
            return getFallbackRegion(lat, lng);
        }

        const { booleanPointInPolygon } = window.turf;
        const point = { type: 'Point', coordinates: [lng, lat] };

        for (const feature of geoData.features) {
            try {
                if (booleanPointInPolygon(point, feature.geometry)) {
                    const nameEn = feature.properties.name || '未知';
                    const admin = feature.properties.admin || '未知';
                    const nameCn = getProvinceNameCN(nameEn);
                    
                    return {
                        name: nameCn,
                        nameEn: nameEn,
                        country: admin,
                        countryEn: admin,
                        displayName: nameCn,
                        displayNameEn: nameEn,
                        level: 'province',
                        source: 'geo'
                    };
                }
            } catch (e) {
                continue;
            }
        }
   // ===== 如果 TopoJSON 匹配失败，尝试矩形兜底 =====
    const rectMatch = getFallbackProvinceByRect(lat, lng);
    if (rectMatch) return rectMatch;
    // ⬇️ 原有降级逻辑保持不变 ⬇️
        return getFallbackRegion(lat, lng);
    }

    // ===== 降级逻辑 =====
    function getFallbackRegion(lat, lng) {
        if (typeof window.getAntipodeRegion === 'function') {
            const region = window.getAntipodeRegion(lat, lng);
            if (region.type === 'land') {
                return {
                    name: region.country || '未知',
                    nameEn: region.countryEn || region.country || 'Unknown',
                    country: region.country || '未知',
                    countryEn: region.countryEn || region.country || 'Unknown',
                    displayName: region.country || '未知',
                    displayNameEn: region.countryEn || region.country || 'Unknown',
                    level: 'country',
                    source: 'fallback'
                };
            } else {
                const oceanNames = {
                    'pacific': { name: '太平洋', nameEn: 'Pacific Ocean' },
                    'atlantic': { name: '大西洋', nameEn: 'Atlantic Ocean' },
                    'indian': { name: '印度洋', nameEn: 'Indian Ocean' }
                };
                const ocean = oceanNames[region.region] || { name: '海洋', nameEn: 'Ocean' };
                return {
                    name: ocean.name,
                    nameEn: ocean.nameEn,
                    country: '',
                    countryEn: '',
                    displayName: ocean.name,
                    displayNameEn: ocean.nameEn,
                    level: 'ocean',
                    source: 'fallback'
                };
            }
        }

        return {
            name: '地球另一端',
            nameEn: 'The Other Side',
            country: '',
            countryEn: '',
            displayName: '地球另一端',
            displayNameEn: 'The Other Side',
            level: 'unknown',
            source: 'fallback'
        };
    }
// ===== 新增：高频省份矩形兜底 =====
function getFallbackProvinceByRect(lat, lng) {
    const provinces = [
        // 智利
        { name: '阿里卡和帕里纳科塔大区', nameEn: 'Arica y Parinacota', country: '智利', countryEn: 'Chile', latMin: -18.5, latMax: -17, lngMin: -71, lngMax: -69 },
        { name: '塔拉帕卡大区', nameEn: 'Tarapacá', country: '智利', countryEn: 'Chile', latMin: -21.5, latMax: -18.5, lngMin: -71, lngMax: -68 },
{ name: '塔拉帕卡大区', nameEn: 'Tarapacá', country: '智利', countryEn: 'Chile', latMin: -22, latMax: -19, lngMin: -71, lngMax: -68 },

        { name: '安托法加斯塔大区', nameEn: 'Antofagasta', country: '智利', countryEn: 'Chile', latMin: -26, latMax: -21.5, lngMin: -71, lngMax: -67 },
        { name: '阿塔卡马大区', nameEn: 'Atacama', country: '智利', countryEn: 'Chile', latMin: -29, latMax: -26, lngMin: -72, lngMax: -68 },
        { name: '科金博大区', nameEn: 'Coquimbo', country: '智利', countryEn: 'Chile', latMin: -32, latMax: -29, lngMin: -72, lngMax: -69 },
        { name: '瓦尔帕莱索大区', nameEn: 'Valparaíso', country: '智利', countryEn: 'Chile', latMin: -35, latMax: -32, lngMin: -72, lngMax: -69 },
        { name: '圣地亚哥首都大区', nameEn: 'Santiago Metropolitan', country: '智利', countryEn: 'Chile', latMin: -36, latMax: -33, lngMin: -72, lngMax: -69 },
        { name: '解放者贝尔纳多·奥希金斯将军大区', nameEn: "Libertador General Bernardo O'Higgins", country: '智利', countryEn: 'Chile', latMin: -37, latMax: -34, lngMin: -72, lngMax: -70 },
        { name: '马乌莱大区', nameEn: 'Maule', country: '智利', countryEn: 'Chile', latMin: -39, latMax: -37, lngMin: -73, lngMax: -70 },
        { name: '比奥比奥大区', nameEn: 'Biobío', country: '智利', countryEn: 'Chile', latMin: -40, latMax: -37, lngMin: -74, lngMax: -70 },
        { name: '阿劳卡尼亚大区', nameEn: 'La Araucanía', country: '智利', countryEn: 'Chile', latMin: -44, latMax: -40, lngMin: -74, lngMax: -70 },
        // 阿根廷（主要省份）
        { name: '布宜诺斯艾利斯省', nameEn: 'Buenos Aires', country: '阿根廷', countryEn: 'Argentina', latMin: -41, latMax: -33, lngMin: -64, lngMax: -56 },
        { name: '内乌肯省', nameEn: 'Neuquén', country: '阿根廷', countryEn: 'Argentina', latMin: -41, latMax: -37, lngMin: -72, lngMax: -67 },
        { name: '内格罗河省', nameEn: 'Río Negro', country: '阿根廷', countryEn: 'Argentina', latMin: -44, latMax: -39, lngMin: -72, lngMax: -62 },
        { name: '丘布特省', nameEn: 'Chubut', country: '阿根廷', countryEn: 'Argentina', latMin: -48, latMax: -42, lngMin: -72, lngMax: -63 },
        { name: '圣克鲁斯省', nameEn: 'Santa Cruz', country: '阿根廷', countryEn: 'Argentina', latMin: -55, latMax: -46, lngMin: -73, lngMax: -66 },
        { name: '门多萨省', nameEn: 'Mendoza', country: '阿根廷', countryEn: 'Argentina', latMin: -37, latMax: -32, lngMin: -70, lngMax: -66 },
    ];

    for (const p of provinces) {
        if (lat >= p.latMin && lat <= p.latMax && lng >= p.lngMin && lng <= p.lngMax) {
            return {
                name: p.name,
                nameEn: p.nameEn,
                country: p.country,
                countryEn: p.countryEn,
                displayName: p.name,
                displayNameEn: p.nameEn,
                level: 'province',
                source: 'rect-fallback'
            };
        }
    }
    return null;
}

    // ===== 暴露全局接口 =====
window.loadAntipodeData = loadAntipodeData;
window.getAntipodeProvince = getAntipodeProvince;
window.getProvinceNameCN = getProvinceNameCN;
// 暴露 geoData 到全局（用于调试）
window.geoData = geoData;

console.log('📍 对跖点匹配模块已加载');

})();

// ===== 二次确认暴露 =====
if (typeof window.loadAntipodeData === 'function') {
    console.log('✅ loadAntipodeData 已成功暴露');
}
if (typeof window.getAntipodeProvince === 'function') {
    console.log('✅ getAntipodeProvince 已成功暴露');
}