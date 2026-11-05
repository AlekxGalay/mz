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
var torrAuth = {user:'',pass:''};
try {
  var savedTorrAuth = JSON.parse(localStorage.getItem('mz_torrserver_auth') || 'null');
  if (savedTorrAuth && typeof savedTorrAuth.user === 'string' && typeof savedTorrAuth.pass === 'string') {
    torrAuth = {user:savedTorrAuth.user,pass:savedTorrAuth.pass};
  }
} catch(e) {}
function clearTorrserverAuth() {
  torrAuth = {user:'',pass:''};
  try {localStorage.removeItem('mz_torrserver_auth');} catch(e) {}
  notice('TorrServer: збережений логін і пароль очищено');
}
function torrAuthHeader() {
  if (!torrAuth.user) return '';
  try {return 'Basic ' + btoa(unescape(encodeURIComponent(torrAuth.user + ':' + torrAuth.pass)));}
  catch(e) {return '';}
}
function setTorrAuthorization(xhr) {
  var auth = torrAuthHeader();
  if (auth) xhr.setRequestHeader('Authorization',auth);
}
function configureTorrserverAuth() {
  if (!Lampa.Input || !Lampa.Input.edit) {
    notice('TorrServer: клавіатура недоступна');
    return;
  }
  Lampa.Input.edit({value:torrAuth.user,free:true},function(user) {
    if (!user) {notice('TorrServer: логін не задано');return;}
    Lampa.Input.edit({value:'',free:true},function(pass) {
      if (pass === null || pass === undefined) {notice('TorrServer: налаштування скасовано');return;}
      torrAuth.user = String(user);
      torrAuth.pass = String(pass);
      try {
        localStorage.setItem('mz_torrserver_auth',JSON.stringify(torrAuth));
        notice('TorrServer: авторизацію збережено на телевізорі');
      } catch(e) {notice('TorrServer: пам’ять недоступна; дані лише до перезапуску');}
      torrServerDiagnostic();
    });
  });
}
var mzPlaybackMonitor = null;
var mzPlaybackSamples = [];
function startPlaybackMonitor(hash) {
  if (mzPlaybackMonitor) clearInterval(mzPlaybackMonitor);
  mzPlaybackSamples = [];
  try {localStorage.removeItem('mz_playback_samples');} catch(e) {}
  var count = 0;
  function sample() {
    count++;
    if (count > 60) {
      clearInterval(mzPlaybackMonitor);
      mzPlaybackMonitor = null;
      return;
    }
    var x = new XMLHttpRequest();
    x.open('POST','http://192.168.0.110:8090/torrents',true);
    x.timeout = 4500;
    x.setRequestHeader('Content-Type','application/json');
    setTorrAuthorization(x);
    x.onload = function() {
      if (x.status !== 200) {
        mzPlaybackSamples.push({time:new Date().toLocaleTimeString(),http:x.status});
      } else {
        try {
          var st = JSON.parse(x.responseText || '{}');
          var keys = ['download_speed','active_peers','connected_seeders','total_peers','preloaded_bytes','preload_size','bit_rate','stat_string','stat','downloaded','loaded_size','torrent_size','total_size'];
          var entry = {time:new Date().toLocaleTimeString()};
          keys.forEach(function(k){if(st[k] !== undefined && st[k] !== null) entry[k] = st[k];});
          mzPlaybackSamples.push(entry);
        } catch(e) {mzPlaybackSamples.push({time:new Date().toLocaleTimeString(),error:'JSON'});}
      }
      if (mzPlaybackSamples.length > 60) mzPlaybackSamples.shift();
      try {localStorage.setItem('mz_playback_samples',JSON.stringify(mzPlaybackSamples));} catch(e) {}
    };
    x.onerror = function(){mzPlaybackSamples.push({time:new Date().toLocaleTimeString(),error:'network'});};
    x.send(JSON.stringify({action:'get',hash:hash}));
  }
  sample();
  mzPlaybackMonitor = setInterval(sample,5000);
}
function showPlaybackJournal() {
  var samples = [];
  try {samples = JSON.parse(localStorage.getItem('mz_playback_samples') || '[]');} catch(e) {}
  if (!samples.length) {notice('TorrServer: журнал порожній. Запусти відео');return;}
  var speeds = samples.filter(function(s){return typeof s.download_speed === 'number';}).map(function(s){return s.download_speed / 1048576;});
  var items = [
    {title:'Зразків: '+samples.length+' (кожні 5 секунд)'},
    {title:'Мінімальна швидкість: '+(speeds.length ? Math.min.apply(null,speeds).toFixed(2) : 'немає даних')+' МБ/с'},
    {title:'Середня швидкість: '+(speeds.length ? (speeds.reduce(function(a,b){return a+b;},0)/speeds.length).toFixed(2) : 'немає даних')+' МБ/с'},
    {title:'Максимальна швидкість: '+(speeds.length ? Math.max.apply(null,speeds).toFixed(2) : 'немає даних')+' МБ/с'}
  ];
  samples.slice(-30).forEach(function(s) {
    var speed = typeof s.download_speed === 'number' ? (s.download_speed / 1048576).toFixed(2)+' МБ/с' : 'немає швидкості';
    var peers = s.active_peers === undefined ? '?' : s.active_peers;
    var state = s.stat_string || s.error || (s.http ? 'HTTP '+s.http : '');
    items.push({title:s.time+' | '+speed+' | піри '+peers,subtitle:state});
  });
  Lampa.Select.show({
    title:'Журнал відтворення TorrServer',
    items:items,
    onSelect:function(){},
    onBack:function(){openMenu();}
  });
}
function showPreloadFailure(hash, wanted, filled, status) {
  var mib = function(n){return (Number(n || 0)/1048576).toFixed(1);};
  var items = [
    {title:'Буфер: '+mib(filled)+' / '+mib(wanted)+' МБ'},
    {title:'Стан торрента: '+(status.stat_string || 'невідомий')},
    {title:'Активні піри: '+Number(status.active_peers || 0)},
    {title:'Підключені сідери: '+Number(status.connected_seeders || 0)},
    {title:'Швидкість: '+mib(status.download_speed)+' МБ/с'},
    {title:'Ємність preload: '+mib(status.preload_size)+' МБ'}
  ];
  function present() {
    Lampa.Select.show({title:'TorrServer — чому немає буфера',items:items,
      onSelect:function(){},onBack:function(){openMenu();}});
  }
  var x = new XMLHttpRequest();
  x.open('POST','http://192.168.0.110:8090/settings',true);
  x.timeout = 7000;
  x.setRequestHeader('Content-Type','application/json');
  setTorrAuthorization(x);
  x.onload = function() {
    if (x.status === 200) {
      try {
        var settings = JSON.parse(x.responseText || '{}');
        var cache = Number(settings.CacheSize || 0);
        var percent = Number(settings.PreloadCache || 0);
        items.push({title:'Налаштований кеш: '+mib(cache)+' МБ'});
        items.push({title:'PreloadCache: '+percent+'%'});
        if (!cache || !percent) items.push({title:'Причина: кеш або preload вимкнено'});
        else if ((status.stat_string || '') === 'Torrent in db') items.push({title:'Торрент відключився; перевір таймаут'});
        else if (!Number(status.active_peers || 0)) items.push({title:'Немає активних пірів для завантаження'});
      } catch(e) {items.push({title:'Налаштування: не вдалося прочитати JSON'});}
    } else items.push({title:'Налаштування кешу: HTTP '+x.status});
    present();
  };
  x.onerror = function(){items.push({title:'Налаштування кешу: немає зв’язку'});present();};
  x.ontimeout = function(){items.push({title:'Налаштування кешу: таймаут'});present();};
  x.send(JSON.stringify({action:'get'}));
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
    setTorrAuthorization(up);
    up.onload = function() {
      if (up.status !== 200) {
        var challenge = up.getResponseHeader('WWW-Authenticate') || '';
        var message = (up.responseText || '').replace(/<[^>]*>/g,' ').replace(/\\s+/g,' ').slice(0,120);
        notice('TorrServer: HTTP ' + up.status + (challenge ? ' — потрібен логін' : '') + (message ? ' — ' + message : ''));
        return;
      }
      try {
        var data = JSON.parse(up.responseText || '{}');
        var torrent = Array.isArray(data) ? data[0] : data;
        if (!torrent || !torrent.hash) throw new Error('No infohash');
        try {localStorage.setItem('mz_last_torrent_hash',torrent.hash);} catch(e) {}
        function showReadyFiles(status) {
          var files = (status.file_stats || []).filter(function(f) {
            return /[.](mkv|mp4|avi|m4v|mov|ts|webm)$/i.test(f.path || '');
          });
          if (!files.length) return false;
          var play = function(file) {
            try {
              var url = 'http://192.168.0.110:8090/play/' + encodeURIComponent(status.hash) + '/' + encodeURIComponent(file.id);
              notice('TorrServer: готуємо буфер перед запуском...');
              var preload = new XMLHttpRequest();
              var bufferUrl = 'http://192.168.0.110:8090/stream/video?link=' +
                encodeURIComponent(status.hash) + '&index=' + encodeURIComponent(file.id) + '&preload&stat';
              preload.open('GET',bufferUrl,true);
              preload.timeout = 120000;
              setTorrAuthorization(preload);
              preload.onload = function() {
                if (preload.status !== 200) {
                  notice('TorrServer: буфер HTTP ' + preload.status);
                  return;
                }
                var stat;
                try {stat = JSON.parse(preload.responseText || '{}');}
                catch(e){notice('TorrServer: некоректний статус буфера');return;}
                // TorrServer reports bit_rate as a string (bits/second), not bytes/second.
                // Only accept a plain numeric ffprobe value; never mistake formatted text for bps.
                var available = Math.max(0, Number(stat.preloaded_bytes) || 0);
                var capacity = Math.max(0, Number(stat.preload_size) || 0);
                var rawRate = String(stat.bit_rate || '').trim();
                var bitrate = /^\\d+(?:\\.\\d+)?$/.test(rawRate) ? Number(rawRate) : 0;
                // Preload includes data from the END of the file for container metadata.
                // Therefore preloaded_bytes is NOT equivalent to seconds of uninterrupted video.
                // A short capped target reduces startup delays; actual streaming still depends on peers.
                var wanted = bitrate > 0 ? Math.max(12*1048576,bitrate/8*20) : 24*1048576;
                wanted = Math.min(wanted,48*1048576);
                if (capacity > 0) wanted = Math.min(wanted,capacity);
                if (Number(file.length) > 0) wanted = Math.min(wanted,Number(file.length));
                var mib = function(n){return (n/1048576).toFixed(1);};
                if (available < wanted) {
                  notice('TorrServer: підготовлено '+mib(available)+' з '+mib(wanted)+' МБ; перевіряємо буфер...');
                  var checks = 0;
                  var poll = function(){
                    checks++;
                    var request = new XMLHttpRequest();
                    request.open('POST','http://192.168.0.110:8090/torrents',true);
                    request.timeout = 9000;
                    request.setRequestHeader('Content-Type','application/json');
                    setTorrAuthorization(request);
                    request.onload = function(){
                      if (request.status !== 200) {notice('TorrServer: статус буфера HTTP '+request.status);return;}
                      var next;
                      try {next = JSON.parse(request.responseText || '{}');}
                      catch(e){notice('TorrServer: некоректна статистика');return;}
                      var filled = Number(next.preloaded_bytes || 0);
                      if (filled >= wanted) {launch(filled);return;}
                      if (checks >= 15 || next.stat_string === 'Torrent in db') {
                        showPreloadFailure(status.hash,wanted,filled,next);
                        return;
                      }
                      setTimeout(poll,2000);
                    };
                    request.onerror = function(){notice('TorrServer: помилка перевірки буфера');};
                    request.ontimeout = function(){notice('TorrServer: таймаут перевірки буфера');};
                    request.send(JSON.stringify({action:'get',hash:status.hash}));
                  };
                  setTimeout(poll,2000);
                } else launch(available);
                function launch(bytes) {
                  notice('TorrServer: буфер '+mib(bytes)+' МБ — запускаємо');
                  startPlaybackMonitor(status.hash);
                  Lampa.Player.play({url:url,title:file.path || item.title});
                }
              };
              preload.onerror = function(){notice('TorrServer: не вдалося підготувати буфер');};
              preload.ontimeout = function(){notice('TorrServer: буфер не готовий за 120 секунд');};
              preload.send();
            } catch(e) {notice('Mazepa: помилка відкриття плеєра');}
          };
          if (files.length === 1) play(files[0]);
          else Lampa.Select.show({
            title:'Вибір відеофайлу',
            items:files.map(function(f,i){return {title:f.path,id:String(i)};}),
            onSelect:function(selected){if(selected)play(files[Number(selected.id)]);},
            onBack:function(){openMenu();}
          });
          return true;
        }
        if (!showReadyFiles(torrent)) {
          notice('TorrServer: отримуємо метадані торрента...');
          var attempts = 0;
          function pollTorrent() {
            attempts++;
            var request = new XMLHttpRequest();
            request.open('POST','http://192.168.0.110:8090/torrents',true);
            request.timeout = 12000;
            request.setRequestHeader('Content-Type','application/json');
            setTorrAuthorization(request);
            request.onload = function() {
              if (request.status !== 200) {
                notice('TorrServer: метадані HTTP ' + request.status);
                return;
              }
              try {
                var status = JSON.parse(request.responseText || '{}');
                if (showReadyFiles(status)) return;
              } catch(e) {
                notice('TorrServer: некоректна відповідь метаданих');
                return;
              }
              if (attempts >= 30) {
                notice('TorrServer: метадані не отримано за 60 секунд');
                return;
              }
              setTimeout(pollTorrent,2000);
            };
            request.onerror = function(){notice('TorrServer: не вдалося отримати метадані');};
            request.ontimeout = function(){notice('TorrServer: таймаут метаданих');};
            request.send(JSON.stringify({action:'get',hash:torrent.hash}));
          }
          setTimeout(pollTorrent,2000);
        }
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
function checkPlaybackSpeed() {
  var hash = '';
  try {hash = localStorage.getItem('mz_last_torrent_hash') || '';} catch(e) {}
  if (!hash) {notice('TorrServer: спочатку вибери реліз');return;}
  var x = new XMLHttpRequest();
  x.open('POST','http://192.168.0.110:8090/torrents',true);
  x.timeout = 12000;
  x.setRequestHeader('Content-Type','application/json');
  setTorrAuthorization(x);
  x.onload = function() {
    if (x.status !== 200) {notice('TorrServer: статус HTTP ' + x.status);return;}
    try {
      var st = JSON.parse(x.responseText || '{}');
      var speed = Number(st.download_speed || 0) / 1048576;
      var bitrate = st.bit_rate || 'невідомий';
      var items = [
        {title:'Швидкість завантаження: ' + speed.toFixed(2) + ' МБ/с'},
        {title:'Активних пірів: ' + Number(st.active_peers || 0)},
        {title:'Сідерів підключено: ' + Number(st.connected_seeders || 0)},
        {title:'Усього пірів: ' + Number(st.total_peers || 0)},
        {title:'Буфер: ' + (Number(st.preloaded_bytes || 0)/1048576).toFixed(1) + ' / ' + (Number(st.preload_size || 0)/1048576).toFixed(1) + ' МБ'},
        {title:'Бітрейт: ' + bitrate},
        {title:'Стан: ' + (st.stat_string || 'невідомо')},
        {title:'Оновити показники',id:'refresh'}
      ];
      Lampa.Select.show({
        title:'TorrServer — стан відтворення',
        items:items,
        onSelect:function(item){if(item && item.id === 'refresh')checkPlaybackSpeed();},
        onBack:function(){openMenu();}
      });
    } catch(e) {notice('TorrServer: не вдалося прочитати статистику');}
  };
  x.onerror = function(){notice('TorrServer: статус недоступний');};
  x.ontimeout = function(){notice('TorrServer: статус — таймаут');};
  x.send(JSON.stringify({action:'get',hash:hash}));
}
function torrServerDiagnostic() {
  var base = 'http://192.168.0.110:8090';
  var checks = [
    {label:'HTTP /echo', method:'GET', path:'/echo'},
    {label:'POST /torrents (list)', method:'POST', path:'/torrents', body:'{"action":"list"}'}
  ];
  var output = [];
  function next(i) {
    if (i >= checks.length) {
      Lampa.Select.show({
        title:'TorrServer — перевірка доступу',
        items:output.map(function(t,j){return {title:t,id:String(j)};}),
        onSelect:function(){},
        onBack:function(){openMenu();}
      });
      return;
    }
    var check = checks[i];
    var x = new XMLHttpRequest();
    x.open(check.method,base+check.path,true);
    x.timeout = 8000;
    if (check.body) x.setRequestHeader('Content-Type','application/json');
    if (check.path !== '/echo') setTorrAuthorization(x);
    x.onload=function(){output.push(check.label + ': HTTP ' + x.status);next(i+1);};
    x.onerror=function(){output.push(check.label + ': мережева помилка / CORS');next(i+1);};
    x.ontimeout=function(){output.push(check.label + ': таймаут');next(i+1);};
    x.send(check.body || null);
  }
  notice('TorrServer: перевіряємо доступ...');
  next(0);
}
function openMenu() {
  mzLog('SCREEN','main menu opened');
  Lampa.Select.show({
    title: 'Mazepa',
    items: [{title:'Пошук торрентів Mazepa', id:'search'},{title:'Повторити останній пошук', id:'search_again'},{title:'Відкритий каталог Mazepa (тест)', id:'catalog'},{title:'Перевірити сесію Mazepa.to', id:'session'},{title:'Діагностика cookies', id:'cookie'},{title:'Тест власної сесії', id:'own'},{title:'Перевірити Cloudflare Worker', id:'worker'},{title:'Перевірити TorrServer', id:'ts_diag'},{title:'Швидкість і буфер відео', id:'ts_speed'},{title:'Журнал зависань відео', id:'ts_journal'},{title:'Зберегти авторизацію TorrServer', id:'ts_auth'},{title:'Очистити авторизацію TorrServer', id:'ts_clear'},{title:'Створити код прив’язки', id:'pair'},{title:'Показати код прив’язки', id:'show_pair'},{title:'Перевірити прив’язку', id:'pair_status'},{title:'Увімкнути діагностику', id:'trace_on'},{title:'Показати журнал', id:'trace_show'},{title:'Вимкнути діагностику', id:'trace_off'}],
    onSelect: function(item) { mzLog('SELECT', item && item.id ? item.id : 'unknown'); if (item && item.id === 'trace_on') mzEnableTrace(); else if (item && item.id === 'trace_show') mzShowTrace(); else if (item && item.id === 'trace_off') mzDisableTrace(); else if (item && item.id === 'search') searchMazepaPrompt(); else if (item && item.id === 'search_again') searchMazepa(localStorage.getItem('mz_last_query')); else if (item && item.id === 'catalog') publicTrackerPreview(); else if (item && item.id === 'session') sessionCheck(); else if (item && item.id === 'cookie') cookieDiagnostics(); else if (item && item.id === 'own') ownSessionProbe(); else if (item && item.id === 'worker') workerProbe(); else if (item && item.id === 'ts_diag') torrServerDiagnostic(); else if (item && item.id === 'ts_speed') checkPlaybackSpeed(); else if (item && item.id === 'ts_journal') showPlaybackJournal(); else if (item && item.id === 'ts_auth') configureTorrserverAuth(); else if (item && item.id === 'ts_clear') clearTorrserverAuth(); else if (item && item.id === 'pair') pairDevice(); else if (item && item.id === 'show_pair') showSavedPairCode(); else if (item && item.id === 'pair_status') pairStatus(); }
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
