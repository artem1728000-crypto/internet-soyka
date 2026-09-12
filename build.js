#!/usr/bin/env node
/**
 * build.js — единая сборка сайта "Интернет рядом".
 *
 * Архитектура:
 *   data/tariffs.json, data/equipment.json  — единственное место правды
 *   templates/*.html                        — ИСХОДНИКИ страниц с метками
 *                                              <!-- BUILD:ИМЯ --> ... <!-- END:ИМЯ -->
 *                                              и токенами {{PRICE_MIN}} и т.п.
 *   ./*.html (корень репозитория)           — ГОТОВЫЕ файлы, которые реально
 *                                              открываются в браузере и видит
 *                                              поисковик. Это результат сборки.
 *
 * Как пользоваться:
 *   1. Отредактируйте data/tariffs.json или data/equipment.json
 *   2. Выполните:  node build.js
 *   3. Закоммитьте и запушьте изменённые .html файлы из корня репозитория
 *
 * Файлы, которых нет в templates/ (faq.html, privacy.html, abonent.html и т.д.),
 * тарифов и оборудования не содержат — сборка их не трогает, редактируйте как обычно.
 *
 * Скрипт НЕ требует установки npm-пакетов — только стандартный Node.js.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const tariffsData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tariffs.json'), 'utf8'));
const equipmentData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/equipment.json'), 'utf8'));

const TARIFFS = tariffsData.tariffs;
const ROUTERS = equipmentData.routers;

/* ===================== Генераторы HTML ===================== */

const CHECK_SVG = '<svg class="feature-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg>';

function tariffCardHTML(t) {
  const featuredClass = t.featured ? ' featured' : '';
  const badge = t.featured && t.badge ? `\n          <div class="tariff-badge">${t.badge}</div>` : '';
  const features = t.features.map(f =>
    `            <div class="tariff-feature">${CHECK_SVG}<span>${f}</span></div>`
  ).join('\n');
  const btnClass = t.featured ? 'btn btn-select-tariff' : 'btn btn-ghost btn-select-tariff';
  return `        <div class="tariff-card${featuredClass}" data-tariff="${t.name}">${badge}
          <div class="tariff-header">
            <h3>${t.name}</h3>
            <div class="tariff-price"><span class="price-value">${t.price}</span><span class="price-currency">₽/мес</span></div>
          </div>
          <div class="tariff-features">
${features}
          </div>
          <button class="${btnClass}" data-tariff="${t.name} — ${t.price} ₽/мес">Выбрать тариф</button>
        </div>`;
}

function tariffGridHTML() {
  return '\n' + TARIFFS.map(tariffCardHTML).join('\n') + '\n      ';
}

function tariffOptionsHTML() {
  const opts = TARIFFS.map(t => {
    const extras = [`до ${t.speedMax} Мбит/с`];
    if (t.tvChannels > 0) extras.push(`${t.tvChannels} ТВ`);
    const label = `${t.name} — ${t.price} ₽/мес`;
    return `              <option value="${label}">${label} (${extras.join(' + ')})</option>`;
  }).join('\n');
  return `\n              <option value="">Не выбран</option>\n${opts}\n            `;
}

function routerOptionsHTML() {
  const opts = ROUTERS.map(r => `              <option value="${r.name}">${r.optionLabel}</option>`).join('\n');
  return `\n              <option value="">Не выбран</option>\n${opts}\n            `;
}

/* Иконки для карточек-роутеров на главной (визуальные, по типу устройства) */
const ROUTER_ICONS = {
  'single': `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{{NAME}}"><rect x="30" y="50" width="140" height="70" rx="8" fill="#23241F"/><rect x="35" y="55" width="130" height="60" rx="6" fill="#2A2B26"/><circle cx="100" cy="75" r="4" fill="#1F6F64" opacity="0.9"><animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/></circle><rect x="45" y="35" width="6" height="25" rx="3" fill="#23241F" transform="rotate(-15 48 50)"/><rect x="149" y="35" width="6" height="25" rx="3" fill="#23241F" transform="rotate(15 152 50)"/><rect x="50" y="90" width="100" height="3" rx="1.5" fill="#1F6F64" opacity="0.3"/><rect x="50" y="100" width="60" height="3" rx="1.5" fill="#C98A2B" opacity="0.3"/><path d="M100 85 Q85 90 85 100" fill="none" stroke="#1F6F64" stroke-width="2" opacity="0.5"/><path d="M100 85 Q115 90 115 100" fill="none" stroke="#1F6F64" stroke-width="2" opacity="0.5"/></svg>`,
  'single-strong': `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{{NAME}}"><rect x="25" y="45" width="150" height="75" rx="10" fill="#23241F"/><rect x="30" y="50" width="140" height="65" rx="8" fill="#2A2B26"/><circle cx="90" cy="70" r="4" fill="#1F6F64" opacity="0.9"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite"/></circle><circle cx="110" cy="70" r="4" fill="#C98A2B" opacity="0.9"><animate attributeName="opacity" values="0.4;1;0.4" dur="2.2s" repeatCount="indefinite"/></circle><rect x="40" y="30" width="7" height="30" rx="3.5" fill="#23241F" transform="rotate(-20 43.5 45)"/><rect x="96.5" y="25" width="7" height="35" rx="3.5" fill="#23241F"/><rect x="153" y="30" width="7" height="30" rx="3.5" fill="#23241F" transform="rotate(20 156.5 45)"/><rect x="45" y="85" width="110" height="4" rx="2" fill="#1F6F64" opacity="0.4"/><rect x="45" y="95" width="70" height="4" rx="2" fill="#C98A2B" opacity="0.4"/><rect x="45" y="105" width="50" height="3" rx="1.5" fill="#1F6F64" opacity="0.3"/><path d="M100 75 Q80 82 80 98" fill="none" stroke="#1F6F64" stroke-width="2.5" opacity="0.6"/><path d="M100 75 Q120 82 120 98" fill="none" stroke="#1F6F64" stroke-width="2.5" opacity="0.6"/><path d="M100 78 Q90 83 90 95" fill="none" stroke="#C98A2B" stroke-width="2" opacity="0.5"/><path d="M100 78 Q110 83 110 95" fill="none" stroke="#C98A2B" stroke-width="2" opacity="0.5"/></svg>`,
  'mesh2': `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{{NAME}}"><g><rect x="35" y="40" width="50" height="70" rx="25" fill="#F6F1E4"/><rect x="38" y="43" width="44" height="64" rx="22" fill="#FFFFFF"/><circle cx="60" cy="60" r="3" fill="#1F6F64" opacity="0.8"><animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/></circle><circle cx="60" cy="70" r="2" fill="#C98A2B" opacity="0.6"/><circle cx="60" cy="78" r="2" fill="#C98A2B" opacity="0.6"/><path d="M50 85 Q60 90 70 85" fill="none" stroke="#1F6F64" stroke-width="1.5" opacity="0.3"/><path d="M50 92 Q60 97 70 92" fill="none" stroke="#1F6F64" stroke-width="1.5" opacity="0.3"/></g><g><rect x="115" y="40" width="50" height="70" rx="25" fill="#F6F1E4"/><rect x="118" y="43" width="44" height="64" rx="22" fill="#FFFFFF"/><circle cx="140" cy="60" r="3" fill="#1F6F64" opacity="0.8"><animate attributeName="opacity" values="0.3;1;0.3" dur="2s" begin="0.5s" repeatCount="indefinite"/></circle><circle cx="140" cy="70" r="2" fill="#C98A2B" opacity="0.6"/><circle cx="140" cy="78" r="2" fill="#C98A2B" opacity="0.6"/><path d="M130 85 Q140 90 150 85" fill="none" stroke="#1F6F64" stroke-width="1.5" opacity="0.3"/><path d="M130 92 Q140 97 150 92" fill="none" stroke="#1F6F64" stroke-width="1.5" opacity="0.3"/></g><path d="M85 75 Q100 70 115 75" fill="none" stroke="#C98A2B" stroke-width="2" stroke-dasharray="3 3" opacity="0.6"><animate attributeName="stroke-dashoffset" from="0" to="12" dur="1.5s" repeatCount="indefinite"/></path><path d="M60 65 Q50 68 45 75" fill="none" stroke="#1F6F64" stroke-width="1.5" opacity="0.4"/><path d="M140 65 Q150 68 155 75" fill="none" stroke="#1F6F64" stroke-width="1.5" opacity="0.4"/></svg>`,
  'mesh3': `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{{NAME}}"><g><rect x="15" y="35" width="45" height="75" rx="22" fill="#C98A2B" opacity="0.15"/><rect x="18" y="38" width="39" height="69" rx="19" fill="#FFFFFF"/><circle cx="37.5" cy="55" r="3.5" fill="#C98A2B" opacity="0.9"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite"/></circle><circle cx="37.5" cy="65" r="2.5" fill="#1F6F64" opacity="0.7"/><circle cx="37.5" cy="73" r="2.5" fill="#1F6F64" opacity="0.7"/><circle cx="37.5" cy="81" r="2" fill="#C98A2B" opacity="0.5"/><path d="M27 88 Q37.5 93 48 88" fill="none" stroke="#C98A2B" stroke-width="2" opacity="0.4"/><path d="M27 95 Q37.5 100 48 95" fill="none" stroke="#C98A2B" stroke-width="2" opacity="0.4"/><circle cx="37.5" cy="90" r="1.5" fill="#C98A2B"/></g><g><rect x="77.5" y="30" width="45" height="80" rx="22" fill="#C98A2B" opacity="0.15"/><rect x="80.5" y="33" width="39" height="74" rx="19" fill="#FFFFFF"/><circle cx="100" cy="50" r="4" fill="#C98A2B" opacity="1"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/></circle><circle cx="100" cy="62" r="3" fill="#1F6F64" opacity="0.8"/><circle cx="100" cy="72" r="3" fill="#1F6F64" opacity="0.8"/><circle cx="100" cy="82" r="2.5" fill="#C98A2B" opacity="0.6"/><path d="M88 92 Q100 98 112 92" fill="none" stroke="#C98A2B" stroke-width="2" opacity="0.5"/><path d="M88 100 Q100 106 112 100" fill="none" stroke="#C98A2B" stroke-width="2" opacity="0.5"/><circle cx="100" cy="95" r="2" fill="#C98A2B"/></g><g><rect x="140" y="35" width="45" height="75" rx="22" fill="#C98A2B" opacity="0.15"/><rect x="143" y="38" width="39" height="69" rx="19" fill="#FFFFFF"/><circle cx="162.5" cy="55" r="3.5" fill="#C98A2B" opacity="0.9"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" begin="0.6s" repeatCount="indefinite"/></circle><circle cx="162.5" cy="65" r="2.5" fill="#1F6F64" opacity="0.7"/><circle cx="162.5" cy="73" r="2.5" fill="#1F6F64" opacity="0.7"/><circle cx="162.5" cy="81" r="2" fill="#C98A2B" opacity="0.5"/><path d="M152 88 Q162.5 93 173 88" fill="none" stroke="#C98A2B" stroke-width="2" opacity="0.4"/><path d="M152 95 Q162.5 100 173 95" fill="none" stroke="#C98A2B" stroke-width="2" opacity="0.4"/><circle cx="162.5" cy="90" r="1.5" fill="#C98A2B"/></g><path d="M60 70 Q77 65 80 70" fill="none" stroke="#C98A2B" stroke-width="2.5" stroke-dasharray="4 4" opacity="0.7"><animate attributeName="stroke-dashoffset" from="0" to="16" dur="1.2s" repeatCount="indefinite"/></path><path d="M120 70 Q137 65 140 70" fill="none" stroke="#C98A2B" stroke-width="2.5" stroke-dasharray="4 4" opacity="0.7"><animate attributeName="stroke-dashoffset" from="0" to="16" dur="1.2s" repeatCount="indefinite"/></path><path d="M100 55 Q85 60 75 70" fill="none" stroke="#C98A2B" stroke-width="2" opacity="0.5"/><path d="M100 55 Q115 60 125 70" fill="none" stroke="#C98A2B" stroke-width="2" opacity="0.5"/></svg>`
};
const DEFAULT_ICON = ROUTER_ICONS['single'];

function routerCardHTML(r) {
  const featuredClass = r.featured ? ' featured' : '';
  const badge = r.featured ? `\n          <div class="router-badge">Рекомендуем</div>` : '';
  const svg = (ROUTER_ICONS[r.icon] || DEFAULT_ICON).replace('{{NAME}}', r.name);
  const btnClass = r.featured ? 'btn btn-select-router' : 'btn btn-ghost btn-select-router';
  return `        <div class="router-card${featuredClass}" data-router="${r.name}">${badge}
          <div class="router-image">
            ${svg}
          </div>
          <div class="router-info">
            <h3>${r.name}</h3>
            <p class="router-specs">${r.specsLine}</p>
            <p class="router-desc">${r.desc}</p>
            <button class="${btnClass}" data-router="${r.name}">Выбрать</button>
          </div>
        </div>`;
}

function routerGridHTML() {
  return '\n' + ROUTERS.map(routerCardHTML).join('\n\n') + '\n      ';
}

function tariffOfferHTML(t) {
  const desc = t.tvChannels > 0
    ? `Интернет до ${t.speedMax} Мбит/с + ${t.tvChannels}+ ТВ-каналов`
    : `Домашний интернет до ${t.speedMax} Мбит/с`;
  return `      {
        "@type": "Offer",
        "itemOffered": { "@type": "Service", "name": "${t.name}", "description": "${desc}" },
        "price": "${t.price}", "priceCurrency": "RUB"
      }`;
}

function tariffOffersHTML() {
  return '\n' + TARIFFS.map(tariffOfferHTML).join(',\n') + '\n    ';
}

/* ===================== Токены для мета-тегов / JSON-LD ===================== */

const priceValues = TARIFFS.map(t => t.price);
const speedValues = TARIFFS.map(t => t.speedMax);

const TOKENS = {
  '{{PRICE_MIN}}': Math.min(...priceValues),
  '{{PRICE_MAX}}': Math.max(...priceValues),
  '{{SPEED_MIN}}': Math.min(...speedValues),
  '{{SPEED_MAX}}': Math.max(...speedValues),
  '{{TV_MAX}}': Math.max(...TARIFFS.map(t => t.tvChannels)),
  '{{OFFER_COUNT}}': TARIFFS.length
};

const BLOCKS = {
  TARIFF_GRID: tariffGridHTML,
  TARIFF_OPTIONS: tariffOptionsHTML,
  ROUTER_OPTIONS: routerOptionsHTML,
  ROUTER_GRID: routerGridHTML
};

// Токены для контента, который живёт ВНУТРИ <script type="application/ld+json">.
// Там HTML-комментарии <!-- --> НЕ работают как разметка (браузер и Google
// видят их как часть текста и JSON-LD ломается) — поэтому здесь используется
// обычная текстовая подстановка без комментариев-меток.
const DYNAMIC_TOKENS = {
  '{{TARIFF_OFFERS}}': tariffOffersHTML
};

/*
 * ВАЖНО про архитектуру:
 * Папка templates/ — это ИСТОЧНИК (в ней навсегда остаются метки
 * <!-- BUILD:... --> и токены {{PRICE_MIN}} и т.п. — их нельзя стирать).
 * Файлы в корне сайта (index.html, kanevskaya.html, ...) — это ГОТОВЫЙ
 * РЕЗУЛЬТАТ сборки, именно они открываются в браузере и именно их видит
 * поисковик. Каждый запуск build.js полностью перегенерирует корневые
 * файлы заново из templates/ — поэтому процесс можно повторять сколько
 * угодно раз, ничего не "протухает".
 * Файлы, которых нет в templates/ (faq.html, privacy.html и т.д.),
 * тарифов/оборудования не содержат и сборкой не затрагиваются.
 */

const TEMPLATES_DIR = path.join(ROOT, 'templates');

function buildFromTemplate(templatePath) {
  const fileName = path.basename(templatePath);
  let content = fs.readFileSync(templatePath, 'utf8');

  for (const [blockName, generator] of Object.entries(BLOCKS)) {
    const re = new RegExp(`(<!--\\s*BUILD:${blockName}\\s*-->)([\\s\\S]*?)(<!--\\s*END:${blockName}\\s*-->)`, 'g');
    content = content.replace(re, (match, open, _inner, close) => `${open}${generator()}${close}`);
  }

  for (const [token, value] of Object.entries(TOKENS)) {
    content = content.split(token).join(value);
  }

  for (const [token, generator] of Object.entries(DYNAMIC_TOKENS)) {
    content = content.split(token).join(generator());
  }

  const outPath = path.join(ROOT, fileName);
  fs.writeFileSync(outPath, content, 'utf8');
  console.log('✓ собран:', fileName);
}

console.log('Сборка сайта: подставляю тарифы и оборудование из data/*.json…');
if (!fs.existsSync(TEMPLATES_DIR)) {
  console.error('Не найдена папка templates/ — нечего собирать.');
  process.exit(1);
}
for (const entry of fs.readdirSync(TEMPLATES_DIR)) {
  if (entry.endsWith('.html')) buildFromTemplate(path.join(TEMPLATES_DIR, entry));
}
console.log('Готово. Не забудьте закоммитить изменённые .html файлы из корня репозитория.');
