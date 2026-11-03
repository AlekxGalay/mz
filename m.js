(function () {
'use strict';
if (window.mazepaPluginM1) return;
window.mazepaPluginM1 = true;
var HOME = 'https://mazepa.to/';
function notice(message) {
  try { if (window.Lampa && Lampa.Noty) Lampa.Noty.show(message); } catch (e) {}
}
function sessionCheck() {
  notice('Mazepa: перевірка доступу...');
  var request = new XMLHttpRequest();
  request.open('GET', HOME + 'tracker.php', true);
  request.withCredentials = true;
  request.timeout = 12000;
  request.onload = function () {
    var path = '';
    try { path = new URL(request.responseURL || HOME + 'tracker.php').pathname; } catch (e) {}
    var loginPage = /login\.php/i.test(path);
    try {
      var page = new DOMParser().parseFromString(request.responseText || '', 'text/html');
      loginPage = loginPage || !!page.querySelector('input[name="login_password"]');
    } catch (e) {}
    notice(request.status === 200 && !loginPage ? 'Mazepa: доступ підтверджено' : 'Mazepa: потрібен вхід');
  };
  request.onerror = function () { notice('Mazepa: помилка мережі або CORS'); };
  request.ontimeout = function () { notice('Mazepa: таймаут'); };
  request.send();
}
function cookieDiagnostics() {
  notice('Mazepa: перевіряємо доступ до cookies...');
  var xhr = new XMLHttpRequest();
  xhr.open('GET', HOME + 'tracker.php?mzcheck=' + Date.now(), true);
  xhr.withCredentials = true;
  xhr.timeout = 12000;
  xhr.onload = function () {
    var body = xhr.responseText || '';
    var login = /login_username|login_password|name=["']login["']/i.test(body) || /login\\.php/i.test(xhr.responseURL || '');
    var msg = 'Mazepa cookie: HTTP ' + xhr.status + ', ' + (login ? 'сесія не передалася' : 'сторінка не схожа на форму входу');
    notice(msg);
  };
  xhr.onerror = function(){notice('Mazepa cookie: запит заблокований (мережа/CORS)');};
  xhr.ontimeout = function(){notice('Mazepa cookie: таймаут');};
  xhr.send();
}
function ownSessionProbe() {
  notice('Mazepa: перевірка власної сесії Lampa...');
  function request(path, done) {
    var x = new XMLHttpRequest();
    x.open('GET', HOME + path, true);
    x.withCredentials = true;
    x.timeout = 12000;
    x.onload = function(){done(null, x);};
    x.onerror = function(){done('CORS/мережа');};
    x.ontimeout = function(){done('таймаут');};
    x.send();
  }
  request('login.php?mzprobe=' + Date.now(), function(err, first) {
    if (err) {notice('Mazepa: login.php — ' + err);return;}
    request('tracker.php?mzprobe=' + Date.now(), function(err2, second) {
      if (err2) {notice('Mazepa: tracker.php — ' + err2);return;}
      var body = second.responseText || '';
      var login = /login_username|login_password/i.test(body) || /login\\.php/i.test(second.responseURL || '');
      notice('Mazepa: login HTTP ' + first.status + ', tracker HTTP ' + second.status + '; ' + (login ? 'вхід потрібен' : 'перевір сторінку'));
    });
  });
}
function workerProbe() {
  notice('Mazepa: перевіряємо Cloudflare Worker...');
  var x = new XMLHttpRequest();
  x.open('GET', 'https://mz-api.galajalexej.workers.dev/test', true);
  x.timeout = 12000;
  x.onload = function() {
    try {
      var data = JSON.parse(x.responseText || '{}');
      notice('Worker: HTTP ' + x.status + ', Mazepa: HTTP ' + data.mazepa_http);
    } catch(e) { notice('Worker: некоректна відповідь'); }
  };
  x.onerror = function(){notice('Worker: помилка мережі або CORS');};
  x.ontimeout = function(){notice('Worker: таймаут');};
  x.send();
}
var API = 'https://mz-api.galajalexej.workers.dev';
function pairDevice() {
  var x = new XMLHttpRequest();
  x.open('POST', API + '/pair/start', true);
  x.timeout = 12000;
  x.setRequestHeader('Content-Type', 'application/json');
  x.onload = function() {
    try {
      var data = JSON.parse(x.responseText);
      if (!data.code || !data.device_secret) throw new Error('Bad response');
      localStorage.setItem('mz_device_secret', data.device_secret);
      localStorage.setItem('mz_pair_code', data.code);
      localStorage.setItem('mz_pair_expires', String(Date.now() + 300000));
      var existing = document.getElementById('mz-pair-overlay');
      if (existing) existing.remove();
      var overlay = document.createElement('div');
      overlay.id = 'mz-pair-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#12151b;color:#fff;display:flex;align-items:center;justify-content:center;';
      var panel = document.createElement('div');
      panel.style.cssText = 'text-align:center;padding:40px;max-width:90vw;';
      var heading = document.createElement('h2');
      heading.textContent = 'Прив’язка Mazepa';
      var code = document.createElement('div');
      code.textContent = data.code;
      code.style.cssText = 'font-size:72px;font-weight:bold;letter-spacing:12px;margin:30px 0;';
      var help = document.createElement('p');
      help.textContent = 'Код дійсний 5 хвилин. Запиши його та підтвердь на комп’ютері.';
      var close = document.createElement('button');
      close.textContent = 'Закрити';
      close.style.cssText = 'font-size:24px;padding:14px 35px;margin-top:25px;color:#111;background:#fff;border-radius:8px;';
      close.onclick = function(){overlay.remove();};
      panel.appendChild(heading);
      panel.appendChild(code);
      panel.appendChild(help);
      panel.appendChild(close);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);
      close.focus();
    } catch(e) { notice('Mazepa: помилка створення коду (HTTP ' + x.status + ')'); }
  };
  x.onerror = function(){notice('Mazepa: Worker недоступний');};
  x.ontimeout = function(){notice('Mazepa: Worker не відповідає');};
  x.send('{}');
}
function showSavedPairCode() {
  var code = localStorage.getItem('mz_pair_code');
  var expires = Number(localStorage.getItem('mz_pair_expires') || 0);
  if (!code || Date.now() > expires) {
    notice('Код відсутній або вже недійсний. Створи новий.');
    return;
  }
  Lampa.Select.show({
    title: 'Код прив’язки: ' + code,
    items: [{title:'КОД: ' + code, subtitle:'Дійсний до 5 хвилин від створення', id:'code'}],
    onSelect: function(){showSavedPairCode();},
    onBack: function(){}
  });
}
function pairStatus() {
  var secret = localStorage.getItem('mz_device_secret');
  if (!secret) { notice('Спочатку створи код прив’язки'); return; }
  var x = new XMLHttpRequest();
  x.open('POST', API + '/pair/status', true);
  x.timeout = 12000;
  x.setRequestHeader('Content-Type', 'application/json');
  x.onload = function() {
    try {
      var data = JSON.parse(x.responseText);
      if (data.token) {
        localStorage.setItem('mz_device_token', data.token);
        localStorage.removeItem('mz_device_secret');
        notice('Mazepa: телевізор підключено');
      } else notice('Mazepa: ' + (data.status || 'очікуємо підтвердження'));
    } catch(e) { notice('Mazepa: помилка перевірки коду'); }
  };
  x.onerror = function(){notice('Mazepa: Worker недоступний');};
  x.send(JSON.stringify({device_secret:secret}));
}
function openMenu() {
  Lampa.Select.show({
    title: 'Mazepa',
    items: [{title:'Перевірити сесію Mazepa.to', id:'session'},{title:'Діагностика cookies', id:'cookie'},{title:'Тест власної сесії', id:'own'},{title:'Перевірити Cloudflare Worker', id:'worker'},{title:'Створити код прив’язки', id:'pair'},{title:'Показати код прив’язки', id:'show_pair'},{title:'Перевірити прив’язку', id:'pair_status'}],
    onSelect: function(item) { if (item && item.id === 'session') sessionCheck(); else if (item && item.id === 'cookie') cookieDiagnostics(); else if (item && item.id === 'own') ownSessionProbe(); else if (item && item.id === 'worker') workerProbe(); else if (item && item.id === 'pair') pairDevice(); else if (item && item.id === 'show_pair') showSavedPairCode(); else if (item && item.id === 'pair_status') pairStatus(); },
    onBack: function() {}
  });
}
function init() {
  if (!window.Lampa || !Lampa.SettingsApi) return;
  Lampa.SettingsApi.addComponent({
    component:'mazepa_m1', name:'Mazepa',
    icon:'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg>'
  });
  Lampa.SettingsApi.addParam({
    component:'mazepa_m1',
    param:{name:'mazepa_m1_open',type:'button'},
    field:{name:'Відкрити Mazepa',description:'Автономний плагін без MacBook'},
    onChange:openMenu,
    onRender:function(item){item.on('hover:enter',openMenu);}
  });
  notice('Mazepa: плагін завантажено');
}
if (window.appready) init();
else if (window.Lampa && Lampa.Listener) Lampa.Listener.follow('app',function(e){if(e.type==='ready')init();});
})();
