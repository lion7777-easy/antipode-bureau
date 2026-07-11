// ============================================================
// cesium-earth.js - Cesium 3D 地球模块（桌面端专用）
// 平滑日夜过渡 + CustomDataSource 标记 + 自动旋转（修复）
// ============================================================

let cesiumViewer = null;
let cesiumInitialized = false;
let cesiumLoading = false;

// ===== 夜景图层相关全局变量 =====
let nightLightLayer = null;
let isNightMode = false;

// ===== 过渡动画控制 =====
let transitionId = null;

// ===== 首次加载标记控制 =====
let isFirstLoad = true;

// ===== 标记数据源 =====
let markerDataSource = null;

// ===== 自动旋转控制 =====
let autoRotateEnabled = true;
let autoRotateTimer = null;

// ===== 1. 设备检测 =====
function shouldUseCesium() {
    const isDesktop = window.innerWidth > 1024;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return isDesktop && !isTouch;
}

// ===== 2. 动态加载 Cesium 库 =====
function loadCesiumLibrary() {
    return new Promise((resolve, reject) => {
        if (window.Cesium) {
            resolve(window.Cesium);
            return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cesium.com/downloads/cesiumjs/releases/1.117/Build/Cesium/Widgets/widgets.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://cesium.com/downloads/cesiumjs/releases/1.117/Build/Cesium/Cesium.js';
        script.onload = () => resolve(window.Cesium);
        script.onerror = () => reject(new Error('Cesium 库加载失败'));
        document.head.appendChild(script);
    });
}

// ===== 3. 获取 Token =====
async function getCesiumToken() {
    try {
        const res = await fetch('/api/cesium-token');
        const data = await res.json();
        return data.token;
    } catch (e) {
        console.error('获取 Cesium Token 失败:', e);
        return null;
    }
}

// ===== 4. 初始化 Cesium 地球 =====
async function initCesiumEarth(containerId) {
    if (cesiumInitialized && cesiumViewer) {
        return cesiumViewer;
    }

    if (cesiumLoading) {
        return new Promise((resolve) => {
            const checkReady = setInterval(() => {
                if (cesiumInitialized) {
                    clearInterval(checkReady);
                    resolve(cesiumViewer);
                }
            }, 100);
        });
    }

    cesiumLoading = true;

    try {
        const Cesium = await loadCesiumLibrary();
        const token = await getCesiumToken();
        if (!token) throw new Error('无法获取 Cesium Token');
        Cesium.Ion.defaultAccessToken = token;

        const container = document.getElementById(containerId);
        if (!container) throw new Error(`容器 #${containerId} 不存在`);
        container.innerHTML = '';
        container.style.height = '100%';
        container.style.width = '100%';
        container.style.position = 'relative';

        let terrainProvider = undefined;
        try {
            if (Cesium.createWorldTerrain) {
                terrainProvider = Cesium.createWorldTerrain();
            } else {
                console.warn('Cesium.createWorldTerrain 不可用，使用默认地形');
            }
        } catch (e) {
            console.warn('地形加载失败，使用默认地形:', e);
        }

        const viewer = new Cesium.Viewer(container, {
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: false,
            infoBox: false,
            selectionIndicator: false,
            shouldAnimate: true,
            terrainProvider: terrainProvider,
            camera: {
                destination: Cesium.Cartesian3.fromDegrees(110, 0, 20000000)
            }
        });

        viewer.scene.requestRenderMode = true;
        viewer.scene.maximumRenderTime = 1 / 30;
        viewer.cesiumWidget.creditContainer.style.display = 'none';
// ===== 限制缩放范围 =====
const controller = viewer.scene.screenSpaceCameraController;
controller.minimumZoomDistance = 2000000;   // 最小距离 2000 公里
controller.maximumZoomDistance = 100000000; // 最大距离 10 万公里
        // ---- 开启光照 ----
        viewer.scene.globe.enableLighting = true;

        // ---- 添加夜景图层 ----
        nightLightLayer = viewer.imageryLayers.addImageryProvider(
            new Cesium.SingleTileImageryProvider({
                url: '/images/earth_night.jpg',
                rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, 90)
            })
        );
        nightLightLayer.alpha = 0.0;
        nightLightLayer.brightness = 1.8;
        nightLightLayer.show = false;
        console.log('🌙 夜景图层已创建，路径: /images/earth_night.jpg');

        // ---- 创建标记数据源 ----
        markerDataSource = new Cesium.CustomDataSource('markers');
        viewer.dataSources.add(markerDataSource);
        console.log('📌 标记数据源已创建 (CustomDataSource)');

        // ---- 添加控制按钮 ----
        addCesiumControls(viewer);

        cesiumViewer = viewer;
        cesiumInitialized = true;
        cesiumLoading = false;

        // ---- 初始设为日间 ----
        toggleDayNight(viewer, false);

        // ===== 启动自动旋转 =====
        startAutoRotate(viewer);

        console.log('🌍 Cesium 地球初始化成功（星星模式 + CustomDataSource + 自动旋转）');
        return viewer;

    } catch (e) {
        console.error('Cesium 初始化失败:', e);
        cesiumLoading = false;
        return null;
    }
}

// ===== 【修复】自动旋转控制（使用 setView 瞬间移动） =====
function startAutoRotate(viewer) {
    if (!viewer) return;
    if (autoRotateTimer) {
        cancelAnimationFrame(autoRotateTimer);
        autoRotateTimer = null;
    }

    function rotateStep() {
    if (!autoRotateEnabled || !viewer || !viewer.camera) {
        autoRotateTimer = requestAnimationFrame(rotateStep);
        return;
    }
    const camera = viewer.camera;
    const position = camera.positionCartographic;
    if (position) {
        // ===== 根据相机高度动态调整速度 =====
        const height = position.height;
        // 高度低于 100 万米时，速度逐渐降为 0
        // 高度高于 500 万米时，速度达到最大值
        const slowHeight = 1000000;   // 开始减速的高度（米）
        const fullHeight = 5000000;   // 恢复全速的高度（米）
        let speedFactor = (height - slowHeight) / (fullHeight - slowHeight);
        speedFactor = Math.max(0, Math.min(1, speedFactor)); // 限制在 0~1
        
        const baseSpeed = 0.0002;     // 基础速度
        const currentSpeed = baseSpeed * speedFactor;
        
        const lon = position.longitude + currentSpeed;
        const lat = position.latitude;
        camera.setView({
            destination: Cesium.Cartesian3.fromRadians(lon, lat, height)
        });
    }
    autoRotateTimer = requestAnimationFrame(rotateStep);
}
    rotateStep();
    console.log('🔄 自动旋转已启动（使用 setView）');
}

function stopAutoRotate() {
    autoRotateEnabled = false;
    if (autoRotateTimer) {
        cancelAnimationFrame(autoRotateTimer);
        autoRotateTimer = null;
    }
    console.log('⏸️ 自动旋转已暂停');
}

function resumeAutoRotate(viewer) {
    autoRotateEnabled = true;
    if (!autoRotateTimer) {
        startAutoRotate(viewer);
    }
    console.log('▶️ 自动旋转已恢复');
}

// ===== 5. 添加控制按钮（透明毛玻璃） =====
function addCesiumControls(viewer) {
    const container = viewer.container;
    if (!container) return;

    const btn = document.createElement('button');
    btn.id = 'cesiumDayNightBtn';
    btn.style.cssText = `
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 100;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        font-size: 22px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
        box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        padding: 0;
        line-height: 1;
        user-select: none;
        text-shadow: 0 0 6px rgba(0,0,0,0.4);
    `;
    btn.innerHTML = '☀️';
    btn.title = '切换到夜间';

    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.1)';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', () => {
        const isNight = !isNightMode;
        console.log(`🔘 按钮点击，切换到 ${isNight ? '夜间' : '日间'}`);
        toggleDayNight(viewer, isNight);
        btn.innerHTML = isNight ? '🌙' : '☀️';
        btn.title = isNight ? '切换到日间' : '切换到夜间';
    });

    container.style.position = 'relative';
    container.appendChild(btn);
}

// ===== 6. 添加标记点 =====
function addCesiumMarker(viewer, lat, lng, color, labelText, isOrigin = true) {
    if (!viewer) return null;
    if (!markerDataSource) {
        console.warn('markerDataSource 未初始化');
        return null;
    }

    const Cesium = window.Cesium;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);

    ctx.beginPath();
    ctx.moveTo(32, 56);
    ctx.bezierCurveTo(32 - 22, 36, 32 - 20, 16, 32, 16);
    ctx.bezierCurveTo(32 + 20, 16, 32 + 22, 36, 32, 56);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(24, 26, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(40, 28, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(32, 56);
    ctx.lineTo(32, 64);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(32, 64, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    const markerImage = canvas.toDataURL();

    const entity = markerDataSource.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lng, lat),
        billboard: {
            image: markerImage,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            scale: 0.7,
            pixelOffset: new Cesium.Cartesian2(0, -(56 - 32)),
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            glowPower: 0.15,
            color: Cesium.Color.WHITE
        },
        properties: {
            type: 'marker',
            lat: lat,
            lng: lng,
            label: labelText,
            isOrigin: isOrigin
        }
    });

    return entity;
}

// ===== 7. 清除标记 =====
function clearCesiumMarkers(viewer) {
    if (!viewer) return;
    if (!markerDataSource) {
        console.warn('markerDataSource 未初始化，无法清除');
        return;
    }
    markerDataSource.entities.removeAll();
    console.log('🗑️ 标记已清除');
}

// ===== 8. 更新地球 =====
async function updateCesiumEarth(viewer, originLat, originLng, originName, antipodeLat, antipodeLng, antipodeName) {
    if (!viewer) return;

    // ---- 首次加载：星星模式 ----
    if (isFirstLoad) {
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(originLng, originLat, 100000000),
            duration: 0
        });
        isFirstLoad = false;
        console.log('🌍 初始位置已加载（星星模式，无标记）');
        return;
    }

    // ---- 正常更新 ----
    clearCesiumMarkers(viewer);

    addCesiumMarker(viewer, originLat, originLng, '#e8923a', originName || '原点', true);
    addCesiumMarker(viewer, antipodeLat, antipodeLng, '#2898e8', antipodeName || '对跖点', false);
    console.log(`✅ Cesium 标记已更新: ${originName} ↔ ${antipodeName}`);

    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(originLng, originLat, 5000000),
        duration: 2.5
    });
}

// ===== 9. 全屏切换（优化卡顿 + 暂停自动旋转） =====
function toggleCesiumFullscreen(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const viewer = cesiumViewer;
    if (!viewer) return;

    const isFullscreen = !!document.fullscreenElement;

    // 切换前暂停自动旋转
    stopAutoRotate();

    if (!isFullscreen) {
        const requestFullscreen = container.requestFullscreen || container.webkitRequestFullscreen || container.msRequestFullscreen;
        if (requestFullscreen) {
            requestFullscreen.call(container).catch(() => {});
        }
        setTimeout(() => {
            viewer.resize();
            viewer.scene.requestRender();
            setTimeout(() => {
                resumeAutoRotate(viewer);
            }, 400);
        }, 300);
    } else {
        const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
        if (exitFullscreen) {
            exitFullscreen.call(document).catch(() => {});
        }
        setTimeout(() => {
            viewer.resize();
            viewer.scene.requestRender();
            setTimeout(() => {
                resumeAutoRotate(viewer);
            }, 400);
        }, 300);
    }
}

// ===== 10. 日夜切换 =====
function toggleDayNight(viewer, isNight) {
    if (!viewer) {
        console.error('❌ viewer 为空');
        return;
    }
    const Cesium = window.Cesium;
    if (!Cesium) {
        console.error('❌ Cesium 未加载');
        return;
    }

    if (transitionId) {
        cancelAnimationFrame(transitionId);
        transitionId = null;
    }

    isNightMode = isNight;

    const targetHour = isNight ? 0 : 12;
    const targetDate = new Date(Date.UTC(2024, 5, 1, targetHour, 0, 0));
    const targetJulian = Cesium.JulianDate.fromDate(targetDate);

    const startJulian = viewer.clock.currentTime;
    const startAlpha = nightLightLayer ? nightLightLayer.alpha : 0;
    const targetAlpha = isNight ? 0.85 : 0.0;

    const totalSeconds = Cesium.JulianDate.secondsDifference(targetJulian, startJulian);
    if (Math.abs(totalSeconds) < 0.001) {
        viewer.clock.currentTime = targetJulian;
        if (nightLightLayer) {
            nightLightLayer.alpha = targetAlpha;
            nightLightLayer.show = true;
            nightLightLayer.brightness = isNight ? 1.8 : 1.5;
        }
        console.log(`✅ 直接跳转，模式: ${isNight ? '夜间' : '日间'}`);
        return;
    }

    const duration = 2000;
    const startTime = performance.now();
    viewer.clock.shouldAnimate = false;

    if (isNight && nightLightLayer) {
        nightLightLayer.show = true;
    }

    console.log(`🎬 开始过渡，从 ${startAlpha} 到 ${targetAlpha}，总秒差 ${totalSeconds}`);

    function animateTransition(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const secondsToAdd = totalSeconds * ease;
        const currentJulian = Cesium.JulianDate.addSeconds(startJulian, secondsToAdd, new Cesium.JulianDate());
        viewer.clock.currentTime = currentJulian;

        if (nightLightLayer) {
            nightLightLayer.alpha = startAlpha + (targetAlpha - startAlpha) * ease;
        }

        if (progress < 1) {
            transitionId = requestAnimationFrame(animateTransition);
        } else {
            transitionId = null;
            viewer.clock.currentTime = targetJulian;
            if (nightLightLayer) {
                nightLightLayer.alpha = targetAlpha;
                nightLightLayer.show = true;
                nightLightLayer.brightness = isNight ? 1.8 : 1.5;
            }
            console.log(`✅ 过渡完成，当前模式: ${isNight ? '夜间' : '日间'}`);
        }
    }

    transitionId = requestAnimationFrame(animateTransition);
}

// ===== 导出接口 =====
export {
    shouldUseCesium,
    initCesiumEarth,
    updateCesiumEarth,
    toggleCesiumFullscreen,
    clearCesiumMarkers,
    toggleDayNight,
    cesiumViewer,
    cesiumInitialized
};