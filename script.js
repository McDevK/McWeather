// McWeather 独立页面 - 迁移自移动端天气功能
(function(){
  const panel = document.getElementById('mwBody');
  const zoneSelect = document.getElementById('mobileWeatherZoneSelect');
  const listEl = document.getElementById('mobileWeatherList');
  const timeToggle = document.getElementById('mobileWeatherTimeToggle');
  const modeToggle = document.getElementById('mobileWeatherModeToggle');
  const themeToggle = document.getElementById('mwThemeToggle');
  const iconsGrid = document.getElementById('mobileWeatherIcons');
  if (!panel || !zoneSelect || !listEl || !timeToggle || !modeToggle || !iconsGrid) return;

  // 读取偏好
  const prefGlobal = localStorage.getItem('mcw-global-mode');
  const prefCountdown = localStorage.getItem('mcw-countdown-mode');
  const prefFilter = localStorage.getItem('mcw-filter');
  const prefTheme = localStorage.getItem('mcw-theme');

  // 状态
  let timeMode = 'LT';
  let globalMode = (prefGlobal === null) ? true : (prefGlobal === '1');
  let countdownMode = prefCountdown === '1';
  let mobileWeatherFilter = globalMode ? (prefFilter || 'clearSkies') : null;

  timeToggle.addEventListener('click', () => {
    if (globalMode) {
      countdownMode = !countdownMode;
      localStorage.setItem('mcw-countdown-mode', countdownMode ? '1' : '0');
      timeToggle.classList.toggle('is-active', countdownMode);
      refresh();
    } else {
      timeMode = timeMode === 'ET' ? 'LT' : 'ET';
      timeToggle.innerHTML = `<span style="user-select:none;-webkit-user-select:none;font-weight:800;">${timeMode}</span>`;
      refresh();
    }
  });
  // 初次渲染按钮与主题
  if (globalMode) {
    timeToggle.innerHTML = `<img src="./assets/icons/button/Countdown.png" alt="倒计时切换" title="倒计时切换" style="width:16px;height:16px;object-fit:contain;filter:brightness(0.95)">`;
    timeToggle.setAttribute('aria-label', '倒计时切换');
    document.querySelector('.mw-container')?.classList.add('global-mode');
    timeToggle.classList.toggle('is-active', countdownMode);
  } else {
    timeToggle.innerHTML = `<span style="user-select:none;-webkit-user-select:none;font-weight:800;">${timeMode}</span>`;
  }
  if (prefTheme === 'dark' || prefTheme === 'light') {
    document.body.setAttribute('data-theme', prefTheme);
    const icon = themeToggle?.querySelector('i');
    if (icon) icon.className = prefTheme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
  }

  modeToggle.addEventListener('click', () => {
    globalMode = !globalMode;
    localStorage.setItem('mcw-global-mode', globalMode ? '1' : '0');
    countdownMode = false;
    if (globalMode) {
      if (!mobileWeatherFilter) mobileWeatherFilter = 'clearSkies';
      timeToggle.innerHTML = `<img src="./assets/icons/button/Countdown.png" alt="倒计时切换" title="倒计时切换" style="width:16px;height:16px;object-fit:contain;filter:brightness(0.95)">`;
      timeToggle.setAttribute('aria-label', '倒计时切换');
      document.querySelector('.mw-container')?.classList.add('global-mode');
      timeToggle.classList.toggle('is-active', countdownMode);
    } else {
      timeToggle.innerHTML = `<span style="user-select:none;-webkit-user-select:none;font-weight:800;">${timeMode}</span>`;
      timeToggle.setAttribute('aria-label', '切换时间显示');
      document.querySelector('.mw-container')?.classList.remove('global-mode');
      timeToggle.classList.remove('is-active');
    }
    refresh();
  });

  // 主题切换（浅色/深色）
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const cur = document.body.getAttribute('data-theme') || 'light';
      const next = cur === 'light' ? 'dark' : 'light';
      document.body.setAttribute('data-theme', next);
      const icon = themeToggle.querySelector('i');
      if (icon) icon.className = next === 'light' ? 'fas fa-sun' : 'fas fa-moon';
      localStorage.setItem('mcw-theme', next);
    });
  }

  // 倒计时提示区（可关闭并持久化）
  (function setupHints(){
    const dismissed = localStorage.getItem('mcw-hints-dismissed') === '1';
    const hints = document.getElementById('mwHints');
    const closeBtn = document.getElementById('mwHintsClose');
    if (!hints || !closeBtn) return;
    if (dismissed) hints.classList.add('hidden');
    closeBtn.addEventListener('click', () => {
      hints.classList.add('hidden');
      localStorage.setItem('mcw-hints-dismissed', '1');
    });
  })();

  zoneSelect.addEventListener('change', () => {
    mobileWeatherFilter = null;
    refresh();
  });

  // 节流刷新
  let lastRefresh = 0;
  function throttledRefresh() {
    const now = Date.now();
    if (now - lastRefresh > 500) {
      lastRefresh = now;
      refresh();
    }
  }
  setInterval(throttledRefresh, 1000);

  function refresh() {
    if (globalMode) {
      renderIcons(true);
      const selected = mobileWeatherFilter || 'clearSkies';
      const rows = [];
      Object.keys(M_WEATHER_DATA).forEach(zoneKey => {
        if (!zoneHasWeather(zoneKey, selected)) return;
        let t = nearestIntervalStart(Date.now());
        let guard = 0;
        while (guard < 2000) {
          const val = calculateWeatherValue(t);
          const w = pickWeatherByValue(zoneKey, val);
          if (w.name === selected) { rows.push({ zoneKey, zoneName: M_WEATHER_LABELS[zoneKey] || zoneKey, intervalStart: t, intervalLabel: `ET ${nearestEorzeaIntervalLabel(t).slice(0,5)}`, name: selected }); break; }
          t += EORZEA_8_HOUR_MS; guard++;
        }
      });
      rows.sort((a,b)=>a.intervalStart-b.intervalStart);
      listEl.innerHTML = rows.map(f => {
        const icon = getWeatherIconPath(f.name);
        const ltText = `LT ${formatLT(f.intervalStart)}`;
        const leftHtml = countdownMode ? buildCompactCountdown(f) : `<span class=\"m-weather-time-badge\">${ltText}</span>`;
        return `
        <div class=\"m-weather-item\">\n          <div class=\"m-weather-left\">\n            ${leftHtml}\n            <img class=\"m-weather-icon\" src=\"${icon}\" alt=\"${M_WEATHER_NAME_CN[f.name] || f.name}\">\n            <span class=\"m-weather-name\">${M_WEATHER_NAME_CN[f.name] || f.name}</span>\n          </div>\n          <div class=\"m-weather-right\">${f.zoneName || ''}</div>\n        </div>`;
      }).join('');
      return;
    }
    const zone = zoneSelect.value || 'gridania';
    let forecasts;
    if (mobileWeatherFilter) {
      if (!zoneHasWeather(zone, mobileWeatherFilter)) {
        listEl.innerHTML = `<div class=\"empty-state\"><i class=\"fas fa-info-circle\"></i><p>该地区不会出现“${M_WEATHER_NAME_CN[mobileWeatherFilter] || mobileWeatherFilter}”。</p></div>`;
        renderIcons();
        return;
      }
      forecasts = getNextMatchingForecasts(zone, mobileWeatherFilter, 8);
    } else {
      forecasts = getForecasts(zone, 8);
    }
    listEl.innerHTML = forecasts.map((f, idx) => {
      const icon = getWeatherIconPath(f.name);
      const timeText = timeMode === 'ET' ? `ET ${f.intervalLabel.slice(3)}` : `LT ${formatLT(f.intervalStart)}`;
      const countdownHtml = idx === 0 ? buildCountdown(f) : '';
      return `
      <div class=\"m-weather-item\">\n        <div class=\"m-weather-left\">\n          <span class=\"m-weather-time-badge\">${timeText}</span>\n          <img class=\"m-weather-icon\" src=\"${icon}\" alt=\"${M_WEATHER_NAME_CN[f.name] || f.name}\">\n          <span class=\"m-weather-name\">${M_WEATHER_NAME_CN[f.name] || f.name}</span>\n        </div>\n        ${countdownHtml}\n      </div>`;
    }).join('');
    renderIcons();
  }

  function renderIcons(allEnabled = false) {
    const zone = zoneSelect.value || 'gridania';
    const ordered = ['clearSkies','fairSkies','clouds','fog','rain','showers','wind','gales','thunder','thunderstorms','snow','blizzard','gloom','heatWaves','dustStorms'];
    iconsGrid.innerHTML = ordered.map(key => {
      const cn = M_WEATHER_NAME_CN[key] || key;
      const icon = getWeatherIconPath(key);
      const canAppear = allEnabled ? true : zoneHasWeather(zone, key);
      const disabled = canAppear ? '' : ' disabled';
      const active = mobileWeatherFilter === key ? ' style=\"outline:2px solid var(--color-border-main);\"' : '';
      return `<button class="m-weather-icon-btn${disabled}" data-weather="${key}" aria-label="${cn}" data-tooltip="${cn}"${active}><img src="${icon}" alt="${cn}"></button>`;
    }).join('');
    iconsGrid.querySelectorAll('.m-weather-icon-btn').forEach(btn => {
      if (btn.classList.contains('disabled')) return;
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-weather');
        mobileWeatherFilter = (mobileWeatherFilter === key) ? null : key;
        if (globalMode) {
          localStorage.setItem('mcw-filter', mobileWeatherFilter || '');
        }
        refresh();
      });
    });
  }

  // 计算/倒计时/格式化（与移动端一致）
  const EORZEA_HOUR_MS = 175000;
  const EORZEA_8_HOUR_MS = 8 * EORZEA_HOUR_MS;
  const EORZEA_DAY_MS = 24 * EORZEA_HOUR_MS;

  function calculateWeatherValue(unixMs) {
    const ms = Math.floor(unixMs);
    const bell = Math.floor(ms / EORZEA_HOUR_MS) % 24;
    const increment = (bell + 8 - (bell % 8)) % 24;
    const totalDays = Math.floor(ms / EORZEA_DAY_MS);
    const calcBase = totalDays * 100 + increment;
    const step1 = ((calcBase << 11) ^ calcBase) >>> 0;
    const step2 = ((step1 >>> 8) ^ step1) >>> 0;
    return step2 % 100;
  }
  function nearestIntervalStart(unixMs) {
    const bell = Math.floor(unixMs / EORZEA_HOUR_MS);
    const alignedBell = bell - (bell % 8);
    return alignedBell * EORZEA_HOUR_MS;
  }
  function nearestEorzeaIntervalLabel(unixMs) {
    const bell = Math.floor(unixMs / EORZEA_HOUR_MS) % 24;
    const h = (bell - (bell % 8) + 24) % 24;
    return `${String(h).padStart(2, '0')}:00`;
  }
  function pickWeatherByValue(zoneKey, value) {
    const table = M_WEATHER_DATA[zoneKey] || [];
    let cursor = 0;
    for (let i = 0; i < table.length; i++) { cursor += table[i].chance; if (value < cursor) return table[i]; }
    return table[table.length - 1] || { name: 'clearSkies', chance: 100 };
  }
  function zoneHasWeather(zoneKey, weatherKey) {
    const table = M_WEATHER_DATA[zoneKey] || [];
    return table.some(w => w.name === weatherKey);
  }

  function getForecasts(zoneKey, intervals = 8) {
    const result = []; let t = nearestIntervalStart(Date.now());
    for (let i = 0; i < intervals; i++) { const label = nearestEorzeaIntervalLabel(t); const val = calculateWeatherValue(t); const weather = pickWeatherByValue(zoneKey, val); result.push({ intervalLabel: `ET ${label.slice(0,5)}`, intervalStart: t, name: weather.name }); t += EORZEA_8_HOUR_MS; }
    return result;
  }
  function getNextMatchingForecasts(zoneKey, weatherKey, count = 8) {
    const out = []; let t = nearestIntervalStart(Date.now()); let guard = 0; const MAX = 2000;
    while (out.length < count && guard < MAX) { const label = nearestEorzeaIntervalLabel(t); const val = calculateWeatherValue(t); const weather = pickWeatherByValue(zoneKey, val); if (weather.name === weatherKey) { out.push({ intervalLabel: `ET ${label.slice(0,5)}`, intervalStart: t, name: weather.name }); } t += EORZEA_8_HOUR_MS; guard++; }
    return out.slice(0, count);
  }

  function getWeatherIconPath(weatherKey) {
    const name = M_WEATHER_NAME_CN[weatherKey] || '';
    if (!name) return './assets/icons/weather/晴朗.png';
    return `./assets/icons/weather/${name}.png`;
  }
  function formatLT(realUnixMs) {
    const d = new Date(realUnixMs); const hh = String(d.getHours()).padStart(2, '0'); const mm = String(d.getMinutes()).padStart(2, '0'); const ss = String(d.getSeconds()).padStart(2, '0'); return `${hh}:${mm}:${ss}`;
  }
  function buildCountdown(forecast) {
    const info = getCountdownInfo(forecast);
    const cls = info.isAppearing ? 'm-countdown pending' : 'm-countdown active';
    const style = `style="--progress: ${info.progress}%"`;
    const text = getCountdownText(forecast);
    return `<div class="${cls}" ${style}><div class="m-progress"></div><span class="m-count-text">${text}</span></div>`;
  }
  function buildCompactCountdown(forecast) {
    const info = getCountdownInfo(forecast);
    const progressStyle = `style="--progress: ${info.progress}%"`;
    const now = Date.now(); const start = forecast.intervalStart; const end = start + EORZEA_8_HOUR_MS; const toStart = start - now; const toEnd = end - now; const msLeft = toStart > 0 ? toStart : Math.max(0, toEnd);
    const text = formatMsFull(msLeft);
    const stateClass = info.isAppearing ? 'pending' : 'active';
    const label = info.isAppearing ? '未出' : '已出';
    return `<div class="m-countdown ${stateClass} m-time-compact" ${progressStyle}><div class="m-progress"></div><span class="m-count-text"><span class="m-count-state">${label}</span><span class="m-count-time">${text}</span></span></div>`;
  }
  function getCountdownText(forecast) {
    const now = Date.now(); const start = forecast.intervalStart; const end = start + EORZEA_8_HOUR_MS; const toStart = start - now; const toEnd = end - now;
    if (toStart > 0) return `距离天气变化 ${formatMs(Math.max(0, toStart))}`; if (toEnd > 0) return `距离天气变化 ${formatMs(Math.max(0, toEnd))}`; return '即将更新';
  }
  function getCountdownInfo(forecast) {
    const now = Date.now(); const start = forecast.intervalStart; const end = start + EORZEA_8_HOUR_MS; const isAppearing = start - now > 0; const total = EORZEA_8_HOUR_MS; const remaining = Math.max(0, isAppearing ? (start - now) : (end - now)); const progress = Math.max(0, Math.min(100, (remaining / total) * 100)); return { isAppearing, progress };
  }
  function formatMs(ms) { const totalSec = Math.floor(ms / 1000); const mm = String(Math.floor(totalSec / 60)).padStart(2, '0'); const ss = String(totalSec % 60).padStart(2, '0'); return `${mm}:${ss}`; }
  function formatMsFull(ms) { const totalSec = Math.floor(ms / 1000); const totalMin = Math.floor(totalSec / 60); const hh = String(Math.floor(totalMin / 60)).padStart(2, '0'); const mm = String(totalMin % 60).padStart(2, '0'); const ss = String(totalSec % 60).padStart(2, '0'); return totalMin >= 60 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`; }

  // 区域/中文/权重数据（与移动端一致）
  const M_WEATHER_DATA = {
    uldah: [ { name: 'clearSkies', chance: 40 }, { name: 'fairSkies', chance: 20 }, { name: 'clouds', chance: 25 }, { name: 'fog', chance: 10 }, { name: 'rain', chance: 5 } ],
    westernThanalan: [ { name: 'clearSkies', chance: 40 }, { name: 'fairSkies', chance: 20 }, { name: 'clouds', chance: 25 }, { name: 'fog', chance: 10 }, { name: 'rain', chance: 5 } ],
    centralThanalan: [ { name: 'dustStorms', chance: 15 }, { name: 'clearSkies', chance: 40 }, { name: 'fairSkies', chance: 20 }, { name: 'clouds', chance: 10 }, { name: 'fog', chance: 10 }, { name: 'rain', chance: 5 } ],
    easternThanalan: [ { name: 'clearSkies', chance: 40 }, { name: 'fairSkies', chance: 20 }, { name: 'clouds', chance: 10 }, { name: 'fog', chance: 10 }, { name: 'rain', chance: 5 }, { name: 'showers', chance: 15 } ],
    southernThanalan: [ { name: 'heatWaves', chance: 20 }, { name: 'clearSkies', chance: 40 }, { name: 'fairSkies', chance: 20 }, { name: 'clouds', chance: 10 }, { name: 'fog', chance: 10 } ],
    northernThanalan: [ { name: 'clearSkies', chance: 5 }, { name: 'fairSkies', chance: 15 }, { name: 'clouds', chance: 30 }, { name: 'fog', chance: 50 } ],
    gridania: [ { name: 'rain', chance: 20 }, { name: 'fog', chance: 10 }, { name: 'clouds', chance: 10 }, { name: 'fairSkies', chance: 15 }, { name: 'clearSkies', chance: 30 }, { name: 'fairSkies', chance: 15 } ],
    centralShroud: [ { name: 'thunder', chance: 5 }, { name: 'rain', chance: 15 }, { name: 'fog', chance: 10 }, { name: 'clouds', chance: 10 }, { name: 'fairSkies', chance: 15 }, { name: 'clearSkies', chance: 30 }, { name: 'fairSkies', chance: 15 } ],
    eastShroud: [ { name: 'thunder', chance: 5 }, { name: 'rain', chance: 15 }, { name: 'fog', chance: 10 }, { name: 'clouds', chance: 10 }, { name: 'fairSkies', chance: 15 }, { name: 'clearSkies', chance: 30 }, { name: 'fairSkies', chance: 15 } ],
    southShroud: [ { name: 'fog', chance: 5 }, { name: 'thunderstorms', chance: 5 }, { name: 'thunder', chance: 15 }, { name: 'fog', chance: 5 }, { name: 'clouds', chance: 10 }, { name: 'fairSkies', chance: 30 }, { name: 'clearSkies', chance: 30 } ],
    northShroud: [ { name: 'fog', chance: 5 }, { name: 'showers', chance: 5 }, { name: 'rain', chance: 15 }, { name: 'fog', chance: 5 }, { name: 'clouds', chance: 10 }, { name: 'fairSkies', chance: 30 }, { name: 'clearSkies', chance: 30 } ],
    limsaLominsa: [ { name: 'clouds', chance: 20 }, { name: 'clearSkies', chance: 30 }, { name: 'fairSkies', chance: 30 }, { name: 'fog', chance: 10 }, { name: 'rain', chance: 10 } ],
    middleLaNoscea: [ { name: 'clouds', chance: 20 }, { name: 'clearSkies', chance: 30 }, { name: 'fairSkies', chance: 20 }, { name: 'wind', chance: 10 }, { name: 'fog', chance: 10 }, { name: 'rain', chance: 10 } ],
    lowerLaNoscea: [ { name: 'clouds', chance: 20 }, { name: 'clearSkies', chance: 30 }, { name: 'fairSkies', chance: 20 }, { name: 'wind', chance: 10 }, { name: 'fog', chance: 10 }, { name: 'rain', chance: 10 } ],
    easternLaNoscea: [ { name: 'fog', chance: 5 }, { name: 'clearSkies', chance: 45 }, { name: 'fairSkies', chance: 30 }, { name: 'clouds', chance: 10 }, { name: 'rain', chance: 5 }, { name: 'showers', chance: 5 } ],
    westernLaNoscea: [ { name: 'fog', chance: 10 }, { name: 'clearSkies', chance: 30 }, { name: 'fairSkies', chance: 20 }, { name: 'clouds', chance: 20 }, { name: 'wind', chance: 10 }, { name: 'gales', chance: 10 } ],
    upperLaNoscea: [ { name: 'clearSkies', chance: 30 }, { name: 'fairSkies', chance: 20 }, { name: 'clouds', chance: 20 }, { name: 'fog', chance: 10 }, { name: 'thunder', chance: 10 }, { name: 'thunderstorms', chance: 10 } ],
    outerLaNoscea: [ { name: 'clearSkies', chance: 30 }, { name: 'fairSkies', chance: 20 }, { name: 'clouds', chance: 20 }, { name: 'fog', chance: 15 }, { name: 'rain', chance: 15 } ],
    coerthasCentralHighlands: [ { name: 'blizzard', chance: 20 }, { name: 'snow', chance: 40 }, { name: 'fairSkies', chance: 10 }, { name: 'clearSkies', chance: 5 }, { name: 'clouds', chance: 15 }, { name: 'fog', chance: 10 } ],
    morDhona: [ { name: 'clouds', chance: 15 }, { name: 'fog', chance: 15 }, { name: 'gloom', chance: 30 }, { name: 'clearSkies', chance: 15 }, { name: 'fairSkies', chance: 25 } ]
  };
  const M_WEATHER_LABELS = {
    uldah: '乌尔达哈', westernThanalan: '西萨纳兰', centralThanalan: '中萨纳兰', easternThanalan: '东萨纳兰', southernThanalan: '南萨纳兰', northernThanalan: '北萨纳兰', gridania: '格里达尼亚', centralShroud: '黑衣森林中央林区', eastShroud: '黑衣森林东部林区', southShroud: '黑衣森林南部林区', northShroud: '黑衣森林北部林区', limsaLominsa: '利姆萨·罗敏萨', middleLaNoscea: '中拉诺西亚', lowerLaNoscea: '拉诺西亚低地', easternLaNoscea: '东拉诺西亚', westernLaNoscea: '西拉诺西亚', upperLaNoscea: '拉诺西亚高地', outerLaNoscea: '拉诺西亚外地', coerthasCentralHighlands: '库尔札斯中央高地', morDhona: '摩杜纳'
  };
  const M_WEATHER_NAME_CN = {
    clearSkies: '碧空', fairSkies: '晴朗', clouds: '阴云', fog: '薄雾', rain: '小雨', showers: '暴雨', wind: '微风', gales: '强风', thunder: '打雷', thunderstorms: '雷雨', snow: '小雪', blizzard: '暴雪', gloom: '妖雾', heatWaves: '热浪', dustStorms: '扬沙'
  };

  // 初始化区域
  function populateZones(selectEl) {
    if (selectEl.options.length > 0) return;
    const groups = [
      { label: '乌尔达哈', keys: ['uldah','westernThanalan','centralThanalan','easternThanalan','southernThanalan','northernThanalan'] },
      { label: '格里达尼亚', keys: ['gridania','centralShroud','eastShroud','southShroud','northShroud'] },
      { label: '利姆萨·罗敏萨', keys: ['limsaLominsa','middleLaNoscea','lowerLaNoscea','easternLaNoscea','westernLaNoscea','upperLaNoscea','outerLaNoscea'] },
      { label: '伊修加德', keys: ['coerthasCentralHighlands'] },
      { label: '其他', keys: ['morDhona'] },
    ];
    let firstValue = '';
    groups.forEach(group => {
      const keys = group.keys.filter(k => M_WEATHER_DATA[k]); if (keys.length === 0) return;
      const og = document.createElement('optgroup'); og.label = group.label;
      keys.forEach(key => { const opt = document.createElement('option'); opt.value = key; opt.textContent = M_WEATHER_LABELS[key] || key; og.appendChild(opt); if (!firstValue) firstValue = key; });
      selectEl.appendChild(og);
    });
    if (firstValue) selectEl.value = firstValue;
  }

  // 启动
  populateZones(zoneSelect);
  refresh();
})();


