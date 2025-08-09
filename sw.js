// 简易缓存管理（静态资源缓存）
const CACHE_NAME = 'mcweather-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './assets/icons/button/switch.png',
  './assets/icons/button/Countdown.png',
  // 天气图标（常用15种）
  './assets/icons/weather/碧空.png',
  './assets/icons/weather/晴朗.png',
  './assets/icons/weather/阴云.png',
  './assets/icons/weather/薄雾.png',
  './assets/icons/weather/小雨.png',
  './assets/icons/weather/暴雨.png',
  './assets/icons/weather/微风.png',
  './assets/icons/weather/强风.png',
  './assets/icons/weather/打雷.png',
  './assets/icons/weather/雷雨.png',
  './assets/icons/weather/小雪.png',
  './assets/icons/weather/暴雪.png',
  './assets/icons/weather/妖雾.png',
  './assets/icons/weather/热浪.png',
  './assets/icons/weather/扬沙.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); })))
  );
});

// 缓存优先，网络回退
self.addEventListener('fetch', event => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then(res => res || fetch(req))
  );
});


