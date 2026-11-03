(function () {
'use strict';
if (window.mazepaPluginM1) return;
window.mazepaPluginM1 = true;
var HOME = 'https://mazepa.to/';
var mzTrace = [];
var mzTraceActive = false;
function mzLog(type, detail) {
  if (!mzTraceActive) return;
  mzTrace.push(new Date().toISOString() + ' | ' + type + (detail ? ' | ' + detail : ''));
  if (mzTrace.length > 150) mzTrace.shift();
}
function mzKey(event) {
  if (!mzTraceActive) return;
  var code = event.keyCode || event.which;
  var names = {8:'BACK',27:'BACK/ESC',13:'OK',37:'LEFT',38:'UP',39:'RIGHT',40:'DOWN',461:'WEBOS_BACK',10009:'TV_BACK'};
  if (names[code]) mzLog('KEY', names[code] + ' (' + code + ')');
}
function mzEnableTrace() {
  mzTraceActive = true;
  mzTrace = [];
  mzLog('TRACE','enabled');
  notice('Mazepa: діагностику увімкнено');
}
function mzDisableTrace() {
  mzLog('TRACE','disabled');
  mzTraceActive = false;
  notice('Mazepa: діагностику вимкнено');
}
function mzShowTrace() {
  var output = mzTrace.join('\\n') || 'Журнал порожній';
  try {
    var el = document.createElement('textarea');
    el.value = output;
    el.style.cssText = 'position:fixed;top:8%;left:5%;width:90%;height:75%;z-index:999999;background:#111;color:#fff;font-size:17px;padding:12px;';
    el.readOnly = true;
    document.body.appendChild(el);
    var btn = document.createElement('button');
    btn.textContent = 'Закрити журнал';
    btn.style.cssText = 'position:fixed;bottom:5%;left:5%;z-index:999999;font-size:20px;padding:12px;';
    btn.onclick = function(){el.remove();btn.remove();};
    document.body.appendChild(btn);
    btn.focus();
  } catch(e) {notice('Mazepa: журнал недоступний');}
}
document.addEventListener('keydown', mzKey, true);

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
  mzLog('ACTION','create pairing code');
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
      showSavedPairCode();
    } catch(e) { notice('Mazepa: помилка створення коду (HTTP ' + x.status + ')'); }
  };
  x.onerror = function(){notice('Mazepa: Worker недоступний');};
  x.ontimeout = function(){notice('Mazepa: Worker не відповідає');};
  x.send('{}');
}
function showSavedPairCode() {
  mzLog('SCREEN','pair code');
  var code = localStorage.getItem('mz_pair_code');
  var expires = Number(localStorage.getItem('mz_pair_expires') || 0);
  if (!code || Date.now() > expires) {
    notice('Код відсутній або вже недійсний. Створи новий.');
    return;
  }
  Lampa.Select.show({
    title: 'Код прив’язки: ' + code,
    items: [{title:'КОД: ' + code, subtitle:'Запиши код. Дійсний 5 хвилин', id:'code'},{title:'Перевірити прив’язку', id:'check'}],
    onSelect: function(item){mzLog('SELECT','pair screen: ' + (item && item.id)); if(item && item.id === 'check') pairStatus();},
    onBack: function(){ mzLog('BACK','pair screen -> main menu'); openMenu(); }
  });
}
function pairStatus() {
  mzLog('ACTION','check pairing');
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
function publicTrackerPreview() {
  notice('Mazepa: завантажуємо відкритий каталог...');
  var x = new XMLHttpRequest();
  x.open('GET', HOME + 'tracker.php?pid=-1', true);
  x.timeout = 15000;
  x.onload = function() {
    if (x.status !== 200) { notice('Mazepa: HTTP ' + x.status); return; }
    try {
      var doc = new DOMParser().parseFromString(x.responseText || '', 'text/html');
      if (/login\\.php/i.test(x.responseURL || '') || doc.querySelector('input[name="login_password"]')) { notice('Mazepa: потрібна авторизація на трекері'); return; }
      var links = doc.querySelectorAll('a[href*="topic-"], a[href*="viewtopic.php"]');
      var items = [];
      var seen = {};
      for (var i = 0; i < links.length && items.length < 30; i++) {
        var el = links[i];
        var title = (el.textContent || '').replace(/\\s+/g,' ').trim();
        if (title.length < 8 || seen[title]) continue;
        seen[title] = true;
        items.push({title:title, id:'release_' + items.length});
      }
      if (!items.length) {
        var pageTitle = (doc.title || '').slice(0, 90);
        var body = (doc.body && doc.body.textContent || '').replace(/\\s+/g,' ').trim();
        var pageType = /увійти|пароль|авторизац/i.test(body.slice(0,900)) ? 'можлива сторінка входу' : /cloudflare|checking your browser|access denied/i.test(body.slice(0,900)) ? 'захист сайту' : 'невідомий вміст';
        Lampa.Select.show({
          title:'Mazepa — діагностика каталогу',
          items:[
            {title:'HTTP: ' + x.status},
            {title:'Розмір відповіді: ' + (x.responseText || '').length + ' символів'},
            {title:'HTML-посилань: ' + doc.querySelectorAll('a[href]').length},
            {title:'Посилань на релізи: ' + links.length},
            {title:'Сторінка: ' + (pageTitle || 'без назви')},
            {title:'Тип відповіді: ' + pageType}
          ],
          onSelect:function(){},
          onBack:function(){openMenu();}
        });
        return;
      }
      Lampa.Select.show({
        title:'Mazepa — відкритий каталог (' + items.length + ')',
        items:items,
        onSelect:function(item){notice(item.title);},
        onBack:function(){openMenu();}
      });
    } catch(e) { notice('Mazepa: помилка обробки каталогу'); }
  };
  x.onerror = function(){notice('Mazepa: каталог заблокований мережею/CORS');};
  x.ontimeout = function(){notice('Mazepa: таймаут каталогу');};
  x.send();
}
function requestMazepaTorrent(item) {
  var token = localStorage.getItem('mz_device_token');
  if (!token) { notice('Mazepa: потрібно прив’язати телевізор'); return; }
  notice('Mazepa: завантаження торрент-файлу...');
  var xhr = new XMLHttpRequest();
  xhr.open('POST', API + '/mazepa/torrent', true);
  xhr.responseType = 'arraybuffer';
  xhr.timeout = 30000;
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  xhr.onload = function() {
    if (xhr.status !== 200) {
      var errorMessage = 'HTTP ' + xhr.status;
      try {
        var bytes = new Uint8Array(xhr.response || []);
        var raw = new TextDecoder('utf-8').decode(bytes);
        var info = JSON.parse(raw);
        errorMessage = info.error || errorMessage;
      } catch(e) {}
      notice('Mazepa: ' + errorMessage);
      return;
    }
    notice('Mazepa: передаємо торрент у TorrServer...');
    var form = new FormData();
    form.append('file', new Blob([xhr.response], {type:'application/x-bittorrent'}), 'release.torrent');
    form.append('save', '1');
    var up = new XMLHttpRequest();
    up.open('POST', 'http://192.168.0.110:8090/torrent/upload', true);
    up.timeout = 60000;
    up.onload = function() {
      if (up.status !== 200) {notice('TorrServer: HTTP ' + up.status);return;}
      try {
        var data = JSON.parse(up.responseText || '{}');
        var torrent = Array.isArray(data) ? data[0] : data;
        if (!torrent || !torrent.hash) throw new Error('No infohash');
        var files = (torrent.file_stats || []).filter(function(f){
          return /\\.(mkv|mp4|avi|m4v|mov|ts|webm)$/i.test(f.path || '');
        });
        if (!files.length) {
          notice('TorrServer: торрент додано, очікуємо метадані');
          return;
        }
        var choose = function(file) {
          var url = 'http://192.168.0.110:8090/play/' + encodeURIComponent(torrent.hash) + '/' + encodeURIComponent(file.id);
          Lampa.Player.play({url:url, title:file.path || item.title});
        };
        if (files.length === 1) choose(files[0]);
        else Lampa.Select.show({
          title:'Вибір відеофайлу',
          items:files.map(function(f,i){return {title:f.path, id:String(i)};}),
          onSelect:function(selected){if(selected)choose(files[Number(selected.id)]);},
          onBack:function(){openMenu();}
        });
      } catch(e) {notice('TorrServer: не вдалося обробити torrent');}
    };
    up.onerror = function(){notice('TorrServer: мережа або CORS');};
    up.ontimeout = function(){notice('TorrServer: таймаут');};
    up.send(form);
  };
  xhr.onerror = function() { notice('Mazepa: мережева помилка завантаження'); };
  xhr.ontimeout = function() { notice('Mazepa: таймаут завантаження'); };
  xhr.send(JSON.stringify({id: item.torrentId}));
}
function searchMazepa(query) {
  query = String(query || '').trim();
  if (!query) {notice('Mazepa: введи назву фільму або серіалу'); return;}
  var token = localStorage.getItem('mz_device_token');
  if (!token) {notice('Mazepa: спочатку прив’яжи телевізор'); return;}
  localStorage.setItem('mz_last_query', query);
  notice('Mazepa: шукаємо «' + query + '»...');
  var x = new XMLHttpRequest();
  x.open('POST', API + '/mazepa/search', true);
  x.timeout = 30000;
  x.setRequestHeader('Content-Type', 'application/json');
  x.setRequestHeader('Authorization', 'Bearer ' + token);
  x.onload = function() {
    var data;
    try {data = JSON.parse(x.responseText || '{}');}
    catch(e) {notice('Mazepa: некоректна відповідь Worker');return;}
    if (x.status !== 200 || data.error) {
      notice('Mazepa: ' + (data.error || 'HTTP ' + x.status));
      return;
    }
    var releases = Array.isArray(data.results) ? data.results : [];
    if (!releases.length) {
      notice('Mazepa: за запитом «' + query + '» нічого не знайдено (' + (data.html_size || 0) + ' символів HTML)');
      return;
    }
    var items = releases.map(function(r, i) {
      return {title:r.title || ('Реліз ' + r.id), subtitle:'Mazepa ID: ' + r.id, id:'item' + i, torrentId:String(r.id)};
    });
    Lampa.Select.show({
      title:'Mazepa: ' + query + ' (' + releases.length + ')',
      items:items,
      onSelect:function(item) {
        if (item) requestMazepaTorrent(item);
      },
      onBack:function(){openMenu();}
    });
  };
  x.onerror = function(){notice('Mazepa: немає зв’язку з Worker');};
  x.ontimeout = function(){notice('Mazepa: пошук перевищив 30 секунд');};
  x.send(JSON.stringify({query:query}));
}
function searchMazepaPrompt() {
  if (!Lampa.Input || !Lampa.Input.edit) {
    notice('Mazepa: клавіатура Lampa недоступна');
    return;
  }
  Lampa.Input.edit({
    value:localStorage.getItem('mz_last_query') || '',
    free:true
  }, function(value) {
    if (String(value || '').trim()) searchMazepa(value);
    else openMenu();
  });
}
function openMenu() {
  mzLog('SCREEN','main menu opened');
  Lampa.Select.show({
    title: 'Mazepa',
    items: [{title:'Пошук торрентів Mazepa', id:'search'},{title:'Повторити останній пошук', id:'search_again'},{title:'Відкритий каталог Mazepa (тест)', id:'catalog'},{title:'Перевірити сесію Mazepa.to', id:'session'},{title:'Діагностика cookies', id:'cookie'},{title:'Тест власної сесії', id:'own'},{title:'Перевірити Cloudflare Worker', id:'worker'},{title:'Створити код прив’язки', id:'pair'},{title:'Показати код прив’язки', id:'show_pair'},{title:'Перевірити прив’язку', id:'pair_status'},{title:'Увімкнути діагностику', id:'trace_on'},{title:'Показати журнал', id:'trace_show'},{title:'Вимкнути діагностику', id:'trace_off'}],
    onSelect: function(item) { mzLog('SELECT', item && item.id ? item.id : 'unknown'); if (item && item.id === 'trace_on') mzEnableTrace(); else if (item && item.id === 'trace_show') mzShowTrace(); else if (item && item.id === 'trace_off') mzDisableTrace(); else if (item && item.id === 'search') searchMazepaPrompt(); else if (item && item.id === 'search_again') searchMazepa(localStorage.getItem('mz_last_query')); else if (item && item.id === 'catalog') publicTrackerPreview(); else if (item && item.id === 'session') sessionCheck(); else if (item && item.id === 'cookie') cookieDiagnostics(); else if (item && item.id === 'own') ownSessionProbe(); else if (item && item.id === 'worker') workerProbe(); else if (item && item.id === 'pair') pairDevice(); else if (item && item.id === 'show_pair') showSavedPairCode(); else if (item && item.id === 'pair_status') pairStatus(); }
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
    onChange:openMenu
  });
  notice('Mazepa: плагін завантажено');
}
if (window.appready) init();
else if (window.Lampa && Lampa.Listener) Lampa.Listener.follow('app',function(e){if(e.type==='ready')init();});
})();
