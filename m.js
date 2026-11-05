(function () {
'use strict';
if (window.mazepaPluginM1) return;
window.mazepaPluginM1 = true;
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
  if (code === 8 || code === 27 || code === 461 || code === 10009) {
    setTimeout(function() {
      try {
        var ctrl = Lampa.Controller.enabled().name;
        var act = Lampa.Activity.active();
        var cls = [];
        ['selectbox--open','settings--open','menu--open'].forEach(function(c) {
          if (document.body && document.body.classList.contains(c)) cls.push(c);
        });
        mzLog('STATE', 'після Back: controller=' + ctrl + ' | activity=' + (act && act.component) + (cls.length ? ' | ' + cls.join(',') : ''));
      } catch(err) {mzLog('STATE','недоступно: ' + err);}
    }, 200);
  }
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

var mzShowCount = 0;
function mzShow(o) {
  mzShowCount++;
  var wasOpen = false;
  try {
    if (Lampa.Select.opened && Lampa.Select.opened()) {wasOpen = true; Lampa.Select.hide();}
  } catch(e) {}
  // Lampa не повертає фокус сама: після закриття списку контролер лишається 'select',
  // і кожен Back повторно закриває той самий список. Запам'ятовуємо контролер-джерело.
  var prev = 'content';
  try {
    var cur = Lampa.Controller.enabled().name;
    if (cur && cur !== 'select') prev = cur;
  } catch(e) {}
  function restore() {
    try {Lampa.Controller.toggle(prev);} catch(e) {mzLog('BACK','не вдалося повернути контролер ' + prev);}
  }
  var origBack = o && o.onBack, origSelect = o && o.onSelect;
  if (o) {
    o.onBack = function() {
      mzLog('BACK','«' + o.title + '» → повернуто контролер ' + prev);
      restore();
      if (origBack) return origBack.apply(this, arguments);
    };
    if (origSelect) o.onSelect = function() {
      restore();
      return origSelect.apply(this, arguments);
    };
  }
  mzLog('SELECT','show #' + mzShowCount + ' «' + (o && o.title) + '», з контролера ' + prev + (wasOpen ? ' (попередній закрито)' : ''));
  Lampa.Select.show(o);
}
var mzSearchBusy = false;
function notice(message) {
  try { if (window.Lampa && Lampa.Noty) Lampa.Noty.show(message); } catch (e) {}
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
  mzShow({
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
  var user = torrAuth.user, pass = torrAuth.pass;
  if (!user) {
    try {
      if (window.Lampa && Lampa.Storage && Lampa.Storage.field('torrserver_auth')) {
        user = String(Lampa.Storage.get('torrserver_login') || '');
        pass = String(Lampa.Storage.get('torrserver_password') || '');
      }
    } catch(e) {}
  }
  if (!user) return '';
  try {return 'Basic ' + btoa(unescape(encodeURIComponent(user + ':' + pass)));}
  catch(e) {return '';}
}
function setTorrAuthorization(xhr) {
  var auth = torrAuthHeader();
  if (auth) xhr.setRequestHeader('Authorization',auth);
}
function torrClean(v) {
  v = String(v || '').trim().replace(/\/+$/,'');
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'http://' + v;
  return /^https?:\/\/[^\s\/]+$/i.test(v) ? v : '';
}
function torrBase() {
  var v = '';
  try {v = torrClean(localStorage.getItem('mz_torrserver_url'));} catch(e) {}
  if (v) return v;
  try {if (window.Lampa && Lampa.Torserver && Lampa.Torserver.url) v = torrClean(Lampa.Torserver.url());} catch(e) {}
  if (v) return v;
  try {
    if (window.Lampa && Lampa.Storage) v = torrClean(Lampa.Storage.get('torrserver_url') || Lampa.Storage.get('torrserver_url_two'));
  } catch(e) {}
  return v;
}
function torrReady() {
  if (torrBase()) return true;
  notice('TorrServer: адресу не задано. Вкажіть її в налаштуваннях Lampa або в меню Mazepa → Адреса TorrServer');
  return false;
}
function configureTorrserverUrl() {
  if (!Lampa.Input || !Lampa.Input.edit) {notice('TorrServer: клавіатура недоступна');return;}
  Lampa.Input.edit({value:torrBase(),free:true},function(value) {
    if (!String(value || '').trim()) return;
    var v = torrClean(value);
    if (!v) {notice('TorrServer: некоректна адреса (приклад: 192.168.0.110:8090)');return;}
    try {localStorage.setItem('mz_torrserver_url',v);notice('TorrServer: адресу збережено: ' + v);}
    catch(e) {notice('TorrServer: пам’ять недоступна');}
  });
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
    x.open('POST',torrBase()+'/torrents',true);
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
  mzShow({
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
    mzShow({title:'TorrServer — чому немає буфера',items:items,
      onSelect:function(){},onBack:function(){openMenu();}});
  }
  var x = new XMLHttpRequest();
  x.open('POST',torrBase()+'/settings',true);
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
  if (!torrReady()) return;
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
    up.open('POST', torrBase()+'/torrent/upload', true);
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
              // /play/ can activate a saved torrent automatically.
              // Do not block launch waiting for /stream?...&preload&stat:
              // the preload request is synchronous and cache fullness is not
              // equivalent to contiguous, playable bytes of the selected file.
              var url = torrBase()+'/play/' +
                encodeURIComponent(status.hash) + '/' + encodeURIComponent(file.id);
              notice('TorrServer: запускаємо відео; перевірка швидкості активна');
              startPlaybackMonitor(status.hash);
              Lampa.Player.play({url:url,title:file.path || item.title});
            } catch(e) {notice('Mazepa: помилка відкриття плеєра');}
          };
          if (files.length === 1) play(files[0]);
          else mzShow({
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
            request.open('POST',torrBase()+'/torrents',true);
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
function searchMazepa(query, opts) {
  opts = opts || {};
  query = String(query || '').trim();
  if (!query) {notice('Mazepa: введи назву фільму або серіалу'); return;}
  var token = localStorage.getItem('mz_device_token');
  if (!token) {notice('Mazepa: спочатку прив’яжи телевізор'); return;}
  if (mzSearchBusy) {notice('Mazepa: пошук уже виконується, зачекайте');return;}
  mzSearchBusy = true;
  localStorage.setItem('mz_last_query', query);
  notice('Mazepa: шукаємо «' + query + '»...');
  var x = new XMLHttpRequest();
  x.open('POST', API + '/mazepa/search', true);
  x.timeout = 30000;
  x.setRequestHeader('Content-Type', 'application/json');
  x.setRequestHeader('Authorization', 'Bearer ' + token);
  x.onload = function() {
    mzSearchBusy = false;
    var data;
    try {data = JSON.parse(x.responseText || '{}');}
    catch(e) {notice('Mazepa: некоректна відповідь Worker');return;}
    if (x.status !== 200 || data.error) {
      notice('Mazepa: ' + (data.error || 'HTTP ' + x.status));
      return;
    }
    var allReleases = Array.isArray(data.results) ? data.results : [];
    var fRel = mzFilterReleases(allReleases);
    var releases = fRel.list;
    if (allReleases.length) mzReportFilter(fRel);
    if (!releases.length) {
      if (opts.alt && opts.alt !== query) {
        notice('Mazepa: за «' + query + '» нічого, пробуємо «' + opts.alt + '»...');
        searchMazepa(opts.alt, {fromCard:opts.fromCard});
        return;
      }
      notice('Mazepa: за запитом «' + query + '» нічого не знайдено (' + (data.html_size || 0) + ' символів HTML)');
      return;
    }
    var items = releases.map(function(r, i) {
      return {title:r.title || ('Реліз ' + r.id), subtitle:'Mazepa ID: ' + r.id, id:'item' + i, torrentId:String(r.id)};
    });
    mzShow({
      title:'Mazepa: ' + query + ' (' + releases.length + ')',
      items:items,
      onSelect:function(item) {
        if (item) requestMazepaTorrent(item);
      },
      onBack:function(){if (!opts.fromCard) openMenu();}
    });
  };
  x.onerror = function(){mzSearchBusy = false;notice('Mazepa: немає зв’язку з Worker');};
  x.ontimeout = function(){mzSearchBusy = false;notice('Mazepa: пошук перевищив 30 секунд');};
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
    if (String(value || '').trim()) mzSearchFromMenu(value);
    else openMenu();
  });
}
// Пошук без картки фільму: штатний екран торрентів Lampa сам підставляє movie = {title: пошук} при from_search.
// Запасний варіант (Lampa не дозволила підмінити Parser/Torrent або екран не відкрився) — спливаючий список.
function mzSearchFromMenu(query) {
  query = String(query || '').trim();
  if (!query) {notice('Mazepa: введи назву фільму або серіалу'); return;}
  try {localStorage.setItem('mz_last_query', query);} catch(e) {}
  if (mzHooks.parser && mzHooks.torrent && window.Lampa && Lampa.Activity && Lampa.Activity.push) {
    try {
      mzLog('SEARCH','меню → штатний екран: «' + query + '»');
      Lampa.Activity.push({url: '', title: 'Mazepa', component: 'torrents', search: query, search_one: query, search_two: query, from_search: true, page: 1, mz_only: true});
      return;
    } catch(e) {mzLog('SEARCH','штатний екран не відкрився: ' + e);}
  }
  searchMazepa(query);
}
function checkPlaybackSpeed() {
  if (!torrReady()) return;
  var hash = '';
  try {hash = localStorage.getItem('mz_last_torrent_hash') || '';} catch(e) {}
  if (!hash) {notice('TorrServer: спочатку вибери реліз');return;}
  var x = new XMLHttpRequest();
  x.open('POST',torrBase()+'/torrents',true);
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
      mzShow({
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
  if (!torrReady()) return;
  var base = torrBase();
  var checks = [
    {label:'HTTP /echo', method:'GET', path:'/echo'},
    {label:'POST /torrents (list)', method:'POST', path:'/torrents', body:'{"action":"list"}'}
  ];
  var output = [];
  function next(i) {
    if (i >= checks.length) {
      mzShow({
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
// ===== Меню плагіна: головне + групи =====
// buildItems() повертає [{title, subtitle?, run, again?}]; again — після дії відкрити це ж меню знову (оновлені підписи)
function mzMenuShow(title, buildItems, parent) {
  mzShow({
    title: title,
    items: buildItems().map(function(it, i) {return {title: it.title, subtitle: it.subtitle, id: i};}),
    onSelect: function(item) {
      var it = buildItems()[item && item.id];
      if (!it) return;
      mzLog('SELECT', title + ' → ' + it.title);
      it.run();
      if (it.again) setTimeout(function() {mzMenuShow(title, buildItems, parent);}, 0);
    },
    onBack: function() {if (parent) parent();}
  });
}
function mzMenuFilters() {
  mzMenuShow('Фільтри й рівні', function() {
    return [
      {title: 'Рівень 0 — понад ' + (mzMaxSizeGb() > 0 ? mzMaxSizeGb() + ' ГБ' : '(вимкнено)'), subtitle: 'змінити поріг розміру', run: mzEditMaxSize},
      {title: 'Лише українська озвучка: ' + (mzOnlyUa() ? 'так' : 'ні'), run: mzToggleOnlyUa, again: true},
      {title: 'Рівень за замовчуванням: ' + (mzBestOnly() ? 'авто (найвищий)' : 'усі'), run: mzToggleBestOnly, again: true}
    ];
  }, openMenu);
}
function mzMenuRows() {
  mzMenuShow('Рядки на головній', function() {
    return [
      {title: 'Статус рядків', run: mzShowRowStatus},
      {title: 'Оновити рядки', run: mzResetRows}
    ];
  }, openMenu);
}
function mzMenuTorr() {
  mzMenuShow('TorrServer', function() {
    return [
      {title: 'Адреса: ' + (torrBase() || 'не задано'), run: configureTorrserverUrl},
      {title: 'Синхронізувати з налаштуваннями Lampa', run: mzSyncLampaTorrserver},
      {title: 'Зберегти логін і пароль', run: configureTorrserverAuth},
      {title: 'Очистити логін і пароль', run: clearTorrserverAuth},
      {title: 'Перевірити TorrServer', run: torrServerDiagnostic}
    ];
  }, openMenu);
}
function mzMenuPair() {
  mzMenuShow('Прив’язка телевізора', function() {
    return [
      {title: 'Створити код прив’язки', run: pairDevice},
      {title: 'Показати код прив’язки', run: showSavedPairCode},
      {title: 'Перевірити прив’язку', run: pairStatus}
    ];
  }, openMenu);
}
function mzMenuDiag() {
  mzMenuShow('Діагностика', function() {
    return [
      {title: 'Журнал діагностики: ' + (mzTraceActive ? 'увімкнено' : 'вимкнено'), run: function() {if (mzTraceActive) mzDisableTrace(); else mzEnableTrace();}, again: true},
      {title: 'Про пристрій і сумісність', subtitle: 'версія, кодеки, доступ до Worker і TorrServer', run: mzShowDevice},
      {title: 'Показати журнал', run: mzShowTrace},
      {title: 'Перевірити Cloudflare Worker', run: workerProbe},
      {title: 'Швидкість і буфер відео', run: checkPlaybackSpeed},
      {title: 'Журнал зависань відео', run: showPlaybackJournal}
    ];
  }, openMenu);
}
function openMenu() {
  mzLog('SCREEN','main menu opened (openMenu викликано)');
  mzMenuShow('Mazepa', function() {
    return [
      {title: 'Пошук торрентів Mazepa', run: searchMazepaPrompt},
      {title: 'Повторити останній пошук', run: function() {mzSearchFromMenu(localStorage.getItem('mz_last_query'));}},
      {title: 'Фільтри й рівні', run: mzMenuFilters},
      {title: 'Рядки на головній', run: mzMenuRows},
      {title: 'TorrServer', run: mzMenuTorr},
      {title: 'Прив’язка телевізора', run: mzMenuPair},
      {title: 'Діагностика', run: mzMenuDiag}
    ];
  }, null);
}
// ===== Рівні якості й фільтри =====
// Рівень 0: понад ліміт розміру · 1: 4K (HDR, або 4K без HDR з позначкою [SDR])
//        2: FHD 1080p · 3: решта (720p і нижче, невідомо)
function mzMaxSizeGb() {
  var v = 35;
  try {
    var raw = localStorage.getItem('mz_max_size_gb');
    if (raw !== null && raw !== '') {var n = parseFloat(String(raw).replace(',', '.')); if (isFinite(n) && n >= 0) v = n;}
  } catch(e) {}
  return v;
}
// за замовчуванням ВИМКНЕНО: майже всі розділи Mazepa й так українською, а фільтр за назвою може хибно ховати добре
function mzOnlyUa() {
  try {return localStorage.getItem('mz_only_ua') === '1';} catch(e) {return false;}
}
// true — за замовчуванням «авто» (найвищий наявний рівень), false — «усі рівні»
function mzBestOnly() {
  try {return localStorage.getItem('mz_best_only') !== '0';} catch(e) {return true;}
}
function mzIsUa(title) {
  return /ukr|укр|(?:^|[^a-z])ua(?![a-z])/i.test(String(title || ''));
}
function mzIs4k(title) {
  return /2160|(?:^|[^a-z0-9])4k(?![a-z0-9])|(?:^|[^a-z])uhd(?![a-z])/i.test(String(title || ''));
}
function mzIsHdr(title) {
  return /hdr(?!ip)|dolby\s*vision|(?:^|[^a-z])dv(?![a-z])|hlg/i.test(String(title || ''));
}
function mzIsFhd(title) {
  return /1080|(?:^|[^a-z])fhd(?![a-z])|full\s*hd/i.test(String(title || ''));
}
function mzClassify(r, limit) {
  if (limit && Number(r.size) > limit) return 0;
  if (mzIs4k(r.title)) return 1;
  if (mzIsFhd(r.title)) return 2;
  return 3;
}
function mzLevelName(n) {
  if (n === 'all') return 'усі';
  if (n === 0) return 'понад ' + mzMaxSizeGb() + ' ГБ';
  return {1:'4K', 2:'FHD', 3:'решта'}[n] || String(n);
}
function mzAutoLevel(counts) {
  var order = [1, 2, 3];
  for (var i = 0; i < order.length; i++) if (counts[order[i]]) return order[i];
  return counts[0] ? 0 : 'all';
}
// raw — записи Worker. opts: {level:'auto'|0|1|2|3|'all', series:bool}
// Повертає {list, hiddenUa, counts, total, level, auto, fellBack}
function mzFilterReleases(raw, opts) {
  opts = opts || {};
  var maxGb = mzMaxSizeGb(), onlyUa = mzOnlyUa();
  var limit = maxGb > 0 ? maxGb * 1073741824 : 0;
  var out = {list: [], hiddenUa: 0, counts: {0:0, 1:0, 2:0, 3:0}, total: 0, level: 'all', auto: false, fellBack: false};
  var all = [];
  (raw || []).forEach(function(r) {
    if (onlyUa && !mzIsUa(r.title)) {out.hiddenUa++; return;}
    r.mzLevel = mzClassify(r, limit);
    r.mzSdr = r.mzLevel === 1 && !mzIsHdr(r.title);
    out.counts[r.mzLevel]++;
    all.push(r);
  });
  out.total = all.length;
  var want = opts.level;
  if (want === undefined || want === 'auto') {
    out.auto = true;
    want = (opts.series || !mzBestOnly()) ? 'all' : mzAutoLevel(out.counts);
  } else if (want !== 'all' && !out.counts[want]) {
    out.fellBack = true;   // обраний вручну рівень порожній — показуємо все, щоб не лишити глухий кут
    want = 'all';
  }
  out.level = want;
  out.list = want === 'all' ? all : all.filter(function(r) {return r.mzLevel === want;});
  return out;
}
function mzReportFilter(f) {
  var parts = [];
  if (f.hiddenUa) parts.push('приховано ' + f.hiddenUa + ' без української озвучки');
  if (f.fellBack) parts.push('на обраному рівні порожньо, показано всі');
  else if (f.total && f.level !== 'all') parts.push('рівень ' + (f.auto ? 'авто: ' : '') + mzLevelName(f.level) + ' — ' + f.list.length + ' з ' + f.total);
  if (parts.length) notice('Mazepa: ' + parts.join('; ') + ' (кнопка «Рівень» зверху)');
}
function mzLevelItems(f) {
  var c = f.counts;
  return [
    {title:'Авто (найвищий наявний рівень)', id:'auto'},
    {title:'Рівень 1 — 4K · ' + c[1], subtitle:'HDR; 4K без HDR — з позначкою [SDR]', id:1},
    {title:'Рівень 2 — FHD 1080p · ' + c[2], id:2},
    {title:'Рівень 3 — решта (720p і нижче) · ' + c[3], id:3},
    {title:'Рівень 0 — понад ' + mzMaxSizeGb() + ' ГБ · ' + c[0], id:0},
    {title:'Усі рівні · ' + f.total, id:'all'}
  ];
}
function mzChooseLevel(f) {
  mzShow({
    title: 'Рівень якості Mazepa',
    items: mzLevelItems(f),
    onSelect: function(item) {
      if (!item) return;
      mzLog('LEVEL','вибрано ' + item.id);
      try {Lampa.Activity.replace({mz_level: item.id});} catch(e) {mzLog('LEVEL','replace: ' + e);}
    },
    onBack: function() {}
  });
}
function mzInjectLevelButton(f) {
  try {
    if (!window.$) return;
    var line = $('.torrent-filter').last();
    if (!line.length) {mzLog('LEVEL','панель фільтрів не знайдена'); return;}
    line.find('.filter--mzlevel').remove();
    var text = 'Рівень: ' + (f.auto ? 'авто ' : '') + (f.level === 'all' ? 'усі' : (f.level === 0 ? '0' : f.level));
    var btn = $('<div class="simple-button simple-button--filter selector filter--mzlevel"><span></span></div>');
    btn.find('span').text(text);
    btn.on('hover:enter', function() {mzChooseLevel(f);});
    line.append(btn);
    mzLog('LEVEL','кнопку додано: ' + text);
  } catch(e) {mzLog('LEVEL','кнопка: ' + e);}
}
function mzEditMaxSize() {
  if (!Lampa.Input || !Lampa.Input.edit) {notice('Mazepa: клавіатура Lampa недоступна'); return;}
  Lampa.Input.edit({value:String(mzMaxSizeGb()), free:true}, function(value) {
    var t = String(value === null || value === undefined ? '' : value).trim().replace(',', '.');
    if (t === '') return;
    var n = parseFloat(t);
    if (!isFinite(n) || n < 0 || n > 10000) {notice('Mazepa: введіть число ГБ (0 = без ліміту)'); return;}
    try {localStorage.setItem('mz_max_size_gb', String(n));} catch(e) {notice('Mazepa: пам’ять недоступна'); return;}
    notice(n > 0 ? ('Mazepa: рівень 0 — релізи понад ' + n + ' ГБ') : 'Mazepa: рівня 0 немає (ліміт вимкнено)');
  });
}
function mzToggleOnlyUa() {
  var next = !mzOnlyUa();
  try {localStorage.setItem('mz_only_ua', next ? '1' : '0');} catch(e) {notice('Mazepa: пам’ять недоступна'); return;}
  notice(next ? 'Mazepa: показуємо лише релізи з українською озвучкою' : 'Mazepa: показуємо всі релізи');
}
function mzToggleBestOnly() {
  var next = !mzBestOnly();
  try {localStorage.setItem('mz_best_only', next ? '1' : '0');} catch(e) {notice('Mazepa: пам’ять недоступна'); return;}
  notice(next ? 'Mazepa: за замовчуванням — найвищий наявний рівень' : 'Mazepa: за замовчуванням — усі рівні');
}

// ===== Штатний екран торрентів Lampa (замість спливаючого списку) =====
var mzHooks = {parser:false, torrent:false};
var mzTorrentBusy = false;

function mzCleanQuery(q) {
  return String(q || '').replace(/\s+S\d{1,2}$/i, '').replace(/\s+/g, ' ').trim();
}
function mzWorkerSearch(query, done) {
  var token = localStorage.getItem('mz_device_token');
  if (!token) {done('потрібно прив’язати телевізор (меню Mazepa → Створити код прив’язки)'); return;}
  var x = new XMLHttpRequest();
  x.open('POST', API + '/mazepa/search', true);
  x.timeout = 30000;
  x.setRequestHeader('Content-Type', 'application/json');
  x.setRequestHeader('Authorization', 'Bearer ' + token);
  x.onload = function() {
    var data;
    try {data = JSON.parse(x.responseText || '{}');} catch(e) {done('некоректна відповідь Worker'); return;}
    if (x.status !== 200 || data.error) {done(data.error || ('HTTP ' + x.status)); return;}
    done(null, Array.isArray(data.results) ? data.results : []);
  };
  x.onerror = function() {done('немає зв’язку з Worker');};
  x.ontimeout = function() {done('пошук перевищив 30 секунд');};
  x.send(JSON.stringify({query:query}));
}
function mzToElement(r) {
  var el = {
    Title: (r.mzSdr ? '[SDR] ' : '') + String(r.title || ('Реліз ' + r.id)),
    Tracker: 'Mazepa',
    Size: Number(r.size) || 0,
    Seeders: Number(r.seeders) || 0,
    Peers: Number(r.leechers) || 0,
    PublishDate: r.date || '',
    MagnetUri: '',
    Link: '',
    Categories: [],
    mz_id: String(r.id),
    viewed: false,
    checked_at: Date.now(),
    source_rank: 0
  };
  var U = window.Lampa && Lampa.Utils;
  try {el.PublisTime = (U && U.strToTime && el.PublishDate) ? U.strToTime(el.PublishDate) : 0;} catch(e) {el.PublisTime = 0;}
  try {el.hash = (U && U.hash) ? U.hash(el.Title) : el.Title;} catch(e) {el.hash = el.Title;}
  try {el.size = (U && U.bytesToSize) ? U.bytesToSize(el.Size) : '';} catch(e) {el.size = '';}
  return el;
}
function mzParserGet(params, oncomplite, onerror) {
  var list = [];
  function add(q) {q = mzCleanQuery(q); if (q.length >= 2 && list.indexOf(q) < 0) list.push(q);}
  if (params.clarification) add(params.search);
  else {add(params.search_one); add(params.search_two); add(params.search);}
  if (!list.length) {onerror('порожній запит'); return;}
  var idx = 0;
  function next() {
    var q = list[idx++];
    mzLog('PARSER','пошук «' + q + '»');
    mzWorkerSearch(q, function(err, results) {
      if (err) {onerror('Mazepa: ' + err); return;}
      var mv = params.movie || {};
      // для пошуку без картки (from_search) тип невідомий — як і для серіалів, за замовчуванням показуємо всі рівні
      var isSeries = !!(mv.number_of_seasons || mv.first_air_date || mv.original_name || params.from_search);
      var f = mzFilterReleases(results, {level: params.mz_level, series: isSeries});
      if (!f.list.length && idx < list.length) {next(); return;}
      mzLog('PARSER','знайдено ' + results.length + ', показано ' + f.list.length + ', рівень ' + f.level + (f.auto ? ' (авто)' : '') + ', без UA ' + f.hiddenUa);
      mzReportFilter(f);
      mzInjectLevelButton(f);
      oncomplite({Results: f.list.map(mzToElement)});
    });
  }
  next();
}
function mzFetchHash(id, done) {
  var token = localStorage.getItem('mz_device_token');
  if (!token) {done('потрібно прив’язати телевізор'); return;}
  var xhr = new XMLHttpRequest();
  xhr.open('POST', API + '/mazepa/torrent', true);
  xhr.responseType = 'arraybuffer';
  xhr.timeout = 30000;
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', 'Bearer ' + token);
  xhr.onload = function() {
    if (xhr.status !== 200) {
      var msg = 'HTTP ' + xhr.status;
      try {msg = JSON.parse(new TextDecoder('utf-8').decode(new Uint8Array(xhr.response || []))).error || msg;} catch(e) {}
      done(msg); return;
    }
    var form = new FormData();
    form.append('file', new Blob([xhr.response], {type:'application/x-bittorrent'}), 'release.torrent');
    form.append('save', '1');
    var up = new XMLHttpRequest();
    up.open('POST', torrBase() + '/torrent/upload', true);
    up.timeout = 60000;
    setTorrAuthorization(up);
    up.onload = function() {
      if (up.status !== 200) {
        done('TorrServer: HTTP ' + up.status + (up.getResponseHeader('WWW-Authenticate') ? ' — потрібен логін' : ''));
        return;
      }
      try {
        var data = JSON.parse(up.responseText || '{}');
        var t = Array.isArray(data) ? data[0] : data;
        if (!t || !t.hash) throw new Error('no hash');
        try {localStorage.setItem('mz_last_torrent_hash', t.hash);} catch(e) {}
        done(null, t.hash);
      } catch(e) {done('TorrServer не повернув хеш торрента');}
    };
    up.onerror = function() {done('TorrServer: мережа або CORS');};
    up.ontimeout = function() {done('TorrServer: таймаут');};
    up.send(form);
  };
  xhr.onerror = function() {done('мережева помилка завантаження .torrent');};
  xhr.ontimeout = function() {done('таймаут завантаження .torrent');};
  xhr.send(JSON.stringify({id: String(id)}));
}
// Штатна Lampa користується СВОЇМИ налаштуваннями TorrServer (адреса, логін/пароль)
function mzLampaTorrNeedsSync() {
  try {
    var url = (Lampa.Torserver && Lampa.Torserver.url) ? Lampa.Torserver.url() : '';
    if (!url) return 'не задано адресу TorrServer у налаштуваннях Lampa';
    if (torrAuth.user && !Lampa.Storage.field('torrserver_auth')) return 'не ввімкнено авторизацію TorrServer у налаштуваннях Lampa';
  } catch(e) {}
  return '';
}
function mzSyncLampaTorrserver() {
  if (!window.Lampa || !Lampa.Storage) {notice('Mazepa: налаштування Lampa недоступні'); return;}
  var base = torrBase();
  if (!base) {notice('Mazepa: спершу вкажіть адресу TorrServer (меню → Адреса TorrServer)'); return;}
  var done = [];
  try {
    var cur = Lampa.Storage.get('torrserver_url') || Lampa.Storage.get('torrserver_url_two');
    if (!cur) {Lampa.Storage.set('torrserver_url', base); done.push('адресу ' + base);}
    else if (torrClean(cur) !== base) {notice('Mazepa: у Lampa вже задано інший TorrServer: ' + cur + ' (не змінюю)'); return;}
    if (torrAuth.user && !Lampa.Storage.field('torrserver_auth')) {
      Lampa.Storage.set('torrserver_login', torrAuth.user);
      Lampa.Storage.set('torrserver_password', torrAuth.pass);
      Lampa.Storage.set('torrserver_auth', true);
      done.push('логін і пароль');
    }
  } catch(e) {notice('Mazepa: не вдалося записати налаштування Lampa'); return;}
  notice(done.length ? ('Mazepa: у налаштування Lampa записано: ' + done.join(', ')) : 'Mazepa: налаштування Lampa вже збігаються');
}
function mzInstallHooks() {
  try {
    if (Lampa.Parser && Lampa.Parser.get && !Lampa.Parser.mzHooked) {
      var origGet = Lampa.Parser.get;
      Lampa.Parser.get = function(params, oncomplite, onerror) {
        if (params && params.mz_only) return mzParserGet(params, oncomplite, onerror);
        return origGet.apply(this, arguments);
      };
      Lampa.Parser.mzHooked = true;
    }
    mzHooks.parser = !!(Lampa.Parser && Lampa.Parser.mzHooked);
  } catch(e) {mzLog('HOOK','Parser: ' + e);}
  try {
    if (Lampa.Torrent && Lampa.Torrent.start && !Lampa.Torrent.mzHooked) {
      var origStart = Lampa.Torrent.start;
      Lampa.Torrent.start = function(element, movie) {
        var self = this, args = arguments;
        if (!element || !element.mz_id) return origStart.apply(self, args);
        var problem = mzLampaTorrNeedsSync();
        if (problem) {notice('Mazepa: ' + problem + '. Меню Mazepa → «Синхронізувати TorrServer з Lampa»'); return;}
        if (!torrReady()) return;
        if (mzTorrentBusy) {notice('Mazepa: торрент уже готується, зачекайте'); return;}
        mzTorrentBusy = true;
        notice('Mazepa: готуємо торрент...');
        mzFetchHash(element.mz_id, function(err, hash) {
          mzTorrentBusy = false;
          if (err) {notice('Mazepa: ' + err); return;}
          element.MagnetUri = 'magnet:?xt=urn:btih:' + hash + '&dn=' + encodeURIComponent(element.Title);
          mzLog('TORRENT','передано в Lampa, hash ' + hash);
          origStart.apply(self, args);
        });
      };
      Lampa.Torrent.mzHooked = true;
    }
    mzHooks.torrent = !!(Lampa.Torrent && Lampa.Torrent.mzHooked);
  } catch(e) {mzLog('HOOK','Torrent: ' + e);}
  mzLog('HOOK','parser=' + mzHooks.parser + ', torrent=' + mzHooks.torrent);
}
function mzOpenNativeList(movie, title, alt) {
  Lampa.Activity.push({
    url: '',
    title: 'Mazepa',
    component: 'torrents',
    search: title || alt,
    search_one: title || alt,
    search_two: alt || title,
    movie: movie,
    page: 1,
    mz_only: true
  });
}
// ===== Рядки на головній Lampa: «Новинки Mazepa» і «Популярне на Mazepa (IMDb)» =====
var mzRowTimeout = 6000;           // головна чекає на рядки, тому довго не тримаємо
var MZ_ROW_LIMIT = 20;
var MZ_ROW_TTL = {'new': 30 * 60 * 1000, top: 6 * 3600 * 1000};
var MZ_MIN_VOTES = 1000;           // відсікає невідомі фільми з єдиним голосом
var mzRowBusy = {};
var mzPrewarmDelay = 2500;         // прогріваємо рядки зразу після старту Lampa, до відкриття головної
function mzRowStatusSet(kind, text) {
  var all = mzJsonGet('mz_row_status') || {};
  all[kind] = {t: Date.now(), text: text};
  mzJsonSet('mz_row_status', all);
  mzLog('ROW', kind + ': ' + text);
}

function mzParseRelease(title) {
  var raw = String(title || '');
  var series = /сезон|сер[іиї]|season|(?:^|[^a-z])S\d{1,2}(?:E\d+)?(?![a-z0-9])|епізод|episodes?/i.test(raw);
  var year = '';
  var y1 = raw.match(/\(((?:19|20)\d{2})\)/);
  var y2 = raw.match(/(?:^|[\s\[,])((?:19|20)\d{2})(?=[\s\],)]|$)/);
  if (y1) year = y1[1]; else if (y2) year = y2[1];
  var head = raw.replace(/\[[^\]]*\]/g, ' ').split(/\s*[\(\|]\s*/)[0].replace(/\s+/g, ' ').trim();
  if (!head) return null;
  var parts = head.split(/\s+\/\s+/).map(function(p) {return p.trim();}).filter(Boolean);
  var name = parts[0] || '';
  var original = '';
  for (var i = 0; i < parts.length; i++) {
    if (/[A-Za-z]/.test(parts[i]) && !/[А-Яа-яІіЇїЄєҐґ]/.test(parts[i])) {original = parts[i]; break;}
  }
  if (!original && parts[1]) original = parts[1];
  if (name.length < 2 && original.length < 2) return null;
  return {title: name, original: original, year: year, series: series};
}
function mzRelKey(r) {
  return (String(r.original || r.title).toLowerCase() + '|' + r.year + '|' + (r.series ? 's' : 'm'));
}
function mzJsonGet(key) {
  try {return JSON.parse(localStorage.getItem(key) || 'null');} catch(e) {return null;}
}
function mzJsonSet(key, value) {
  try {localStorage.setItem(key, JSON.stringify(value)); return true;} catch(e) {return false;}
}
function mzTmdb(path, done) {
  try {
    var net = new Lampa.Reguest();
    net.timeout(8000);
    var lang = (Lampa.Storage && Lampa.Storage.field('tmdb_lang')) || 'uk';
    var url = Lampa.TMDB.api(path + (path.indexOf('?') >= 0 ? '&' : '?') + 'api_key=' + Lampa.TMDB.key() + '&language=' + lang);
    net.silent(url, function(json) {done(null, json);}, function() {done('tmdb');});
  } catch(e) {done(String(e));}
}
// Мінімальна картка для кешу (щоб localStorage не розпухав)
function mzSlimCard(c) {
  var keep = ['id','title','name','original_title','original_name','poster_path','backdrop_path','release_date',
    'first_air_date','vote_average','vote_count','genre_ids','media_type','original_language','source'];
  var o = {};
  keep.forEach(function(k) {if (c[k] !== undefined) o[k] = c[k];});
  if (c.overview) o.overview = String(c.overview).slice(0, 300);
  return o;
}
function mzCardCacheGet(key) {
  var all = mzJsonGet('mz_card_cache') || {};
  return all[key] || null;
}
function mzCardCachePut(key, card) {
  var all = mzJsonGet('mz_card_cache') || {};
  all[key] = mzSlimCard(card);
  var keys = Object.keys(all);
  if (keys.length > 300) keys.slice(0, keys.length - 300).forEach(function(k) {delete all[k];});
  mzJsonSet('mz_card_cache', all);
}
function mzFinishCard(c, rel) {
  c.source = 'tmdb';
  if (!c.media_type) c.media_type = rel && rel.series ? 'tv' : 'movie';
  return c;
}
// пошук картки TMDB за назвою і роком (для рядка «Новинки», без OMDb)
function mzResolveBySearch(rel, done) {
  var key = 's:' + mzRelKey(rel);
  var hit = mzCardCacheGet(key);
  if (hit) {done(mzFinishCard(hit, rel)); return;}
  var type = rel.series ? 'tv' : 'movie';
  var yearParam = rel.year ? '&' + (rel.series ? 'first_air_date_year' : 'year') + '=' + rel.year : '';
  var queries = [];
  if (rel.original) queries.push(rel.original);
  if (rel.title && rel.title !== rel.original) queries.push(rel.title);
  var idx = 0;
  function next() {
    if (idx >= queries.length) {done(null); return;}
    var q = queries[idx++];
    mzTmdb('search/' + type + '?query=' + encodeURIComponent(q) + yearParam, function(err, json) {
      var r = !err && json && json.results && json.results[0];
      if (!r || !r.poster_path) {next(); return;}
      mzCardCachePut(key, r);
      done(mzFinishCard(r, rel));
    });
  }
  next();
}
// картка TMDB за IMDb-ідентифікатором (точний збіг, для «Популярного»)
function mzResolveByImdb(imdbId, rel, done) {
  var key = 'i:' + imdbId;
  var hit = mzCardCacheGet(key);
  if (hit) {done(mzFinishCard(hit, rel)); return;}
  mzTmdb('find/' + imdbId + '?external_source=imdb_id', function(err, json) {
    var r = !err && json && ((rel.series ? (json.tv_results || []) : (json.movie_results || []))[0] ||
      (json.movie_results || [])[0] || (json.tv_results || [])[0]);
    if (!r) {done(null); return;}
    if (!r.media_type) r.media_type = (json.tv_results || []).indexOf(r) >= 0 ? 'tv' : 'movie';
    mzCardCachePut(key, r);
    done(mzFinishCard(r, rel));
  });
}
function mzWorkerPost(path, payload, done) {
  var token = localStorage.getItem('mz_device_token');
  if (!token) {done('not-paired'); return;}
  var x = new XMLHttpRequest();
  x.open('POST', API + path, true);
  x.timeout = 25000;
  x.setRequestHeader('Content-Type', 'application/json');
  x.setRequestHeader('Authorization', 'Bearer ' + token);
  x.onload = function() {
    var data = null;
    try {data = JSON.parse(x.responseText || '{}');} catch(e) {}
    if (x.status !== 200 || !data || data.error) {done((data && data.error) || ('HTTP ' + x.status), null, x.status); return;}
    done(null, data);
  };
  x.onerror = function() {done('network');};
  x.ontimeout = function() {done('timeout');};
  x.send(JSON.stringify(payload));
}
// проганяє worker(item, cb) по items із обмеженою паралельністю
function mzEachLimit(items, limit, worker, done) {
  var i = 0, active = 0, finished = 0, total = items.length;
  if (!total) {done(); return;}
  function pump() {
    while (active < limit && i < total) {
      (function(item) {
        active++;
        worker(item, function() {active--; finished++; if (finished === total) done(); else pump();});
      })(items[i++]);
    }
  }
  pump();
}
function mzUniqueReleases(results) {
  var seen = {}, out = [];
  (results || []).forEach(function(r) {
    var rel = mzParseRelease(r.title);
    if (!rel) return;
    var k = mzRelKey(rel);
    if (seen[k]) return;
    seen[k] = true;
    out.push(rel);
  });
  return out;
}
function mzBuildNew(done) {
  mzWorkerPost('/mazepa/feed', {kind: 'new', limit: 30}, function(err, data) {
    if (err) {mzRowStatusSet('new', 'стрічка Mazepa: ' + err); done([], err); return;}
    var rels = mzUniqueReleases(data.results);
    var cards = new Array(rels.length);
    mzEachLimit(rels.map(function(r, i) {return {r: r, i: i};}), 4, function(it, cb) {
      mzResolveBySearch(it.r, function(card) {cards[it.i] = card; cb();});
    }, function() {
      var seen = {}, out = [];
      cards.forEach(function(c) {
        if (c && !seen[c.id]) {seen[c.id] = true; out.push(c);}
      });
      mzRowStatusSet('new', 'стрічка ' + (data.results || []).length + ' → унікальних ' + rels.length + ' → карток TMDB ' + out.length);
      done(out.slice(0, MZ_ROW_LIMIT));
    });
  });
}
function mzBuildTop(done) {
  mzWorkerPost('/mazepa/feed', {kind: 'top', limit: 50}, function(err, data) {
    if (err) {mzRowStatusSet('top', 'стрічка Mazepa: ' + err); done([], err); return;}
    var rels = mzUniqueReleases(data.results);
    var stop = '';
    mzEachLimit(rels, 6, function(rel, cb) {
      if (stop) {cb(); return;}
      mzWorkerPost('/imdb', {title: rel.title, original: rel.original, year: rel.year, series: rel.series}, function(e, d, status) {
        if (e) {if (status === 503 || status === 429 || e === 'not-paired') stop = e; cb(); return;}
        rel.imdb = d.imdb_id; rel.rating = d.rating; rel.votes = d.votes;
        cb();
      });
    }, function() {
      if (stop) {mzRowStatusSet('top', 'зупинено на запиті рейтингу: ' + stop); done([], stop); return;}
      var ranked = rels.filter(function(r) {return r.imdb && r.rating > 0 && r.votes >= MZ_MIN_VOTES;});
      var seenIds = {};
      ranked = ranked.filter(function(r) {if (seenIds[r.imdb]) return false; seenIds[r.imdb] = true; return true;});
      ranked.sort(function(a, b) {return b.rating - a.rating || b.votes - a.votes;});
      var withImdb = rels.filter(function(r) {return r.imdb;}).length;
      ranked = ranked.slice(0, MZ_ROW_LIMIT);
      var cards = new Array(ranked.length);
      mzEachLimit(ranked.map(function(r, i) {return {r: r, i: i};}), 6, function(it, cb) {
        mzResolveByImdb(it.r.imdb, it.r, function(card) {
          if (card) {
            card = JSON.parse(JSON.stringify(card));
            card.imdb_rating = it.r.rating;
            card.vote_average = it.r.rating;
          }
          cards[it.i] = card; cb();
        });
      }, function() {
        var out = cards.filter(Boolean);
        mzRowStatusSet('top', 'стрічка ' + (data.results || []).length + ' → унікальних ' + rels.length + ' → з IMDb ' + withImdb + ' → з ≥' + MZ_MIN_VOTES + ' голосів ' + ranked.length + ' → карток TMDB ' + out.length);
        done(out);
      });
    });
  });
}
function mzRowCacheGet(kind) {
  var c = mzJsonGet('mz_row_' + kind);
  if (!c || !c.t || !Array.isArray(c.cards)) return null;
  return {cards: c.cards, fresh: (Date.now() - c.t) < (c.ttl || MZ_ROW_TTL[kind]), err: c.err || ''};
}
function mzRowCachePut(kind, cards, err) {
  // помилки кешуємо коротко: відсутній ключ/ліміт OMDb — 1 год, мережа та інше — 5 хв
  var ttl = err ? (/OMDb|ліміт/i.test(String(err)) ? 3600000 : 300000) : MZ_ROW_TTL[kind];
  mzJsonSet('mz_row_' + kind, {t: Date.now(), ttl: ttl, cards: cards.map(mzSlimCardKeepRating), err: err || ''});
}
function mzSlimCardKeepRating(c) {
  var o = mzSlimCard(c);
  if (c.imdb_rating !== undefined) o.imdb_rating = c.imdb_rating;
  return o;
}
function mzRowRefresh(kind, done) {
  if (mzRowBusy[kind]) {done(null); return;}
  mzRowBusy[kind] = true;
  (kind === 'top' ? mzBuildTop : mzBuildNew)(function(cards, err) {
    mzRowBusy[kind] = false;
    // помилку (напр. немає ключа OMDb) теж запам'ятовуємо на TTL, щоб не штурмувати сервер при кожному відкритті
    mzRowCachePut(kind, cards, err);
    done(cards);
  });
}
function mzRowDefinition(kind, title, index) {
  return {
    name: 'mazepa_' + kind,
    title: title,
    index: index,
    screen: ['main'],
    call: function() {
      if (!localStorage.getItem('mz_device_token')) return;
      return function(callback) {
        var cached = mzRowCacheGet(kind);
        function send(cards) {callback(cards && cards.length ? {results: cards, title: title} : {});}
        if (cached) {
          send(cached.cards);                                    // миттєво з кешу
          if (!cached.fresh) mzRowRefresh(kind, function() {});  // старий кеш оновлюємо у фоні
          return;
        }
        var answered = false;
        var timer = setTimeout(function() {
          if (!answered) {answered = true; mzLog('ROW', kind + ': таймаут ' + mzRowTimeout + ' мс, рядок з’явиться при наступному відкритті'); callback({});}
        }, mzRowTimeout);
        mzRowRefresh(kind, function(cards) {
          if (answered || cards === null) return;
          answered = true; clearTimeout(timer); send(cards);
        });
      };
    }
  };
}
function mzPrewarmRows() {
  if (!localStorage.getItem('mz_device_token')) return;
  ['new', 'top'].forEach(function(kind) {
    var c = mzRowCacheGet(kind);
    if (!c || !c.fresh) mzRowRefresh(kind, function() {});
  });
}
function mzShowRowStatus() {
  var all = mzJsonGet('mz_row_status') || {};
  var names = {'new': 'Новинки', top: 'Популярне'};
  var items = ['new', 'top'].map(function(k) {
    var st = all[k];
    var c = mzRowCacheGet(k);
    var when = st ? new Date(st.t).toLocaleTimeString() : '—';
    return {title: names[k] + (c ? ' (у кеші: ' + c.cards.length + ')' : ' (кешу немає)'), subtitle: st ? (when + ' · ' + st.text) : 'ще не збиралось', noenter: true};
  });
  mzShow({title: 'Статус рядків на головній', items: items, onSelect: function() {}, onBack: function() {openMenu();}});
}
var mzRowsAdded = false;
function mzAddRows() {
  if (mzRowsAdded || !window.Lampa || !Lampa.ContentRows || !Lampa.ContentRows.add) return;
  try {
    Lampa.ContentRows.add(mzRowDefinition('new', 'Новинки Mazepa', 0));
    Lampa.ContentRows.add(mzRowDefinition('top', 'Популярне на Mazepa (IMDb)', 1));
    mzRowsAdded = true;
    mzLog('ROW','рядки на головній додано');
    setTimeout(mzPrewarmRows, mzPrewarmDelay);
  } catch(e) {mzLog('ROW','не вдалося додати рядки: ' + e);}
}
function mzResetRows() {
  ['mz_row_new', 'mz_row_top'].forEach(function(k) {try {localStorage.removeItem(k);} catch(e) {}});
  notice('Mazepa: кеш рядків очищено, збираю заново (статус — в меню). Відкрийте головну за хвилину');
  mzPrewarmRows();
}

// ===== Діагностика позиції перегляду (лише в журналі, коли діагностика ввімкнена) =====
var mzPlayerDiagOn = false;
function mzStorageKb() {
  try {
    var n = 0;
    for (var i = 0; i < localStorage.length; i++) {var k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || '').length;}
    return Math.round(n * 2 / 1024);
  } catch(e) {return -1;}
}
function mzFileViewRecord(hash) {
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.indexOf('file_view') !== 0) continue;
      var all = JSON.parse(localStorage.getItem(k) || '{}');
      if (all && hash && all[hash]) return k + ': ' + JSON.stringify(all[hash]);
    }
  } catch(e) {return 'помилка читання: ' + e;}
  return 'запису для hash немає';
}
function mzInstallPlayerDiag() {
  if (mzPlayerDiagOn || !window.Lampa || !Lampa.Player || !Lampa.Player.listener) return;
  try {
    var cur = null, ticks = 0, lastLog = 0;
    function tlText(tl) {
      if (!tl) return 'timeline ВІДСУТНІЙ';
      return 'timeline hash=' + tl.hash + ', time=' + tl.time + ', percent=' + tl.percent + ', duration=' + tl.duration +
        ', stop_recording=' + !!tl.stop_recording + ', handler=' + (typeof tl.handler);
    }
    Lampa.Player.listener.follow('start', function(d) {
      if (!mzTraceActive) return;
      cur = d || null; ticks = 0; lastLog = 0;
      var tf = '', pt = '';
      try {tf = Lampa.Storage.field('torrserver_tracktimecode'); pt = Lampa.Storage.field('player_timecode');} catch(e) {}
      mzLog('PLAYER','start «' + (d && d.title) + '»: ' + tlText(d && d.timeline) + '; player_timecode=' + pt + '; torrserver_tracktimecode=' + tf);
    });
    if (Lampa.PlayerVideo && Lampa.PlayerVideo.listener) {
      Lampa.PlayerVideo.listener.follow('timeupdate', function(e) {
        if (!mzTraceActive || !cur) return;
        ticks++;
        var now = Date.now();
        if (ticks <= 3 || now - lastLog > 60000) {
          lastLog = now;
          var tl = cur && cur.timeline;
          mzLog('PLAYER','timeupdate #' + ticks + ': current=' + Math.round(e.current) + ', duration=' + e.duration +
            (tl ? ' | timeline.time=' + tl.time + ', percent=' + tl.percent + ', waiting=' + !!tl.waiting_for_user + ', continued=' + !!tl.continued : ''));
        }
      });
    }
    Lampa.Player.listener.follow('destroy', function() {
      if (!mzTraceActive || !cur) {cur = null; return;}
      var tl = cur && cur.timeline;
      mzLog('PLAYER','destroy: timeline.time=' + (tl && tl.time) + ', percent=' + (tl && tl.percent) +
        ' | file_view → ' + mzFileViewRecord(tl && tl.hash) + ' | localStorage ≈ ' + mzStorageKb() + ' КБ');
      cur = null;
    });
    mzPlayerDiagOn = true;
  } catch(e) {mzLog('PLAYER','діагностика недоступна: ' + e);}
}

// ===== Про пристрій і сумісність (для різних моделей ТВ) =====
// Версія рушія → покоління webOS (за таблицею LG: 108 → webOS 24, 120 → 25, 132 → 26). Це підказка, не гарантія.
var MZ_WEBOS_BY_CHROME = {108: 'webOS 24 (2024)', 120: 'webOS 25 (2025)', 132: 'webOS 26 (2026)'};
function mzParseUa(ua) {
  ua = String(ua || '');
  var m = ua.match(/Chrome\/(\d+)/);
  var chrome = m ? parseInt(m[1], 10) : 0;
  var isWebos = /Web0S|webOS/i.test(ua);
  var isTizen = /Tizen/i.test(ua);
  var family = isWebos ? 'LG webOS' : (isTizen ? 'Samsung Tizen' : 'інший');
  var gen = isWebos && chrome ? (MZ_WEBOS_BY_CHROME[chrome] || 'покоління невідоме (Chromium ' + chrome + ')') : '';
  return {family: family, chrome: chrome, generation: gen};
}
function mzCanPlay(type) {
  try {
    var v = document.createElement('video');
    var r = v.canPlayType(type);
    return r === 'probably' ? 'так' : (r === 'maybe' ? 'можливо' : 'ні');
  } catch(e) {return '?';}
}
var MZ_CODECS = [
  ['H.264', 'video/mp4; codecs="avc1.640028"'],
  ['HEVC (HDR10)', 'video/mp4; codecs="hvc1.2.4.L150.B0"'],
  ['VP9', 'video/webm; codecs="vp09.00.10.08"'],
  ['AV1', 'video/mp4; codecs="av01.0.08M.10"'],
  ['Dolby Vision', 'video/mp4; codecs="dvh1.05.06"'],
  ['AAC', 'audio/mp4; codecs="mp4a.40.2"'],
  ['AC-3', 'audio/mp4; codecs="ac-3"'],
  ['E-AC-3 (DD+)', 'audio/mp4; codecs="ec-3"'],
  ['DTS', 'audio/mp4; codecs="dtsc"'],
  ['Opus', 'audio/webm; codecs="opus"'],
  ['FLAC', 'audio/flac']
];
function mzDeviceReport(extra) {
  var ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  var p = mzParseUa(ua);
  var lines = [];
  lines.push(['Пристрій', p.family + (p.chrome ? ', Chromium ' + p.chrome : '') + (p.generation ? ' → ' + p.generation : '')]);
  var lv = '', pf = '';
  try {lv = Lampa.Manifest && Lampa.Manifest.app_version;} catch(e) {}
  try {pf = Lampa.Platform && Lampa.Platform.get && Lampa.Platform.get();} catch(e) {}
  lines.push(['Lampa', (lv || 'версія невідома') + (pf ? ', платформа ' + pf : '')]);
  try {lines.push(['Екран', window.screen.width + '×' + window.screen.height + ', DPR ' + (window.devicePixelRatio || 1)]);} catch(e) {}
  lines.push(['localStorage', mzStorageKb() + ' КБ зайнято']);
  lines.push(['Токен прив’язки', localStorage.getItem('mz_device_token') ? 'є' : 'немає']);
  lines.push(['TorrServer', torrBase() || 'адресу не задано']);
  if (extra) {
    lines.push(['Worker', extra.worker]);
    lines.push(['TorrServer /echo', extra.echo]);
  }
  MZ_CODECS.forEach(function(c) {lines.push([c[0], mzCanPlay(c[1])]);});
  return lines;
}
function mzProbeGet(url, ms, done) {
  var x = new XMLHttpRequest();
  x.open('GET', url, true);
  x.timeout = ms;
  x.onload = function() {done(x.status, (x.responseText || '').slice(0, 200));};
  x.onerror = function() {done(0, '');};
  x.ontimeout = function() {done(-1, '');};
  x.send();
}
function mzShowDevice() {
  notice('Mazepa: збираю дані про пристрій...');
  var extra = {worker: '…', echo: '…'};
  var pending = 2, shown = false;
  function finish() {
    if (shown) return;
    shown = true;
    var lines = mzDeviceReport(extra);
    mzLog('DEVICE', lines.map(function(l) {return l[0] + '=' + l[1];}).join(' | '));
    mzShow({
      title: 'Про пристрій і сумісність',
      items: lines.map(function(l) {return {title: l[0] + ': ' + l[1], noenter: true};}),
      onSelect: function() {},
      onBack: function() {mzMenuDiag();}
    });
  }
  function one() {if (--pending === 0) finish();}
  mzProbeGet(API + '/health', 8000, function(status, text) {
    if (status === 200) {
      var d = null; try {d = JSON.parse(text);} catch(e) {}
      extra.worker = d ? ('v' + d.version + ', OMDb ' + (d.omdb ? 'є' : 'немає') + ', KV ' + (d.kv ? 'є' : 'немає')) : 'відповідь некоректна';
    } else extra.worker = status === 0 ? 'недоступний (мережа/CORS)' : (status === -1 ? 'таймаут' : 'HTTP ' + status);
    one();
  });
  var base = torrBase();
  if (!base) {extra.echo = 'адресу не задано'; one();}
  else mzProbeGet(base + '/echo', 6000, function(status, text) {
    extra.echo = status === 200 ? ('відповідає: ' + text.replace(/\s+/g, ' ').trim().slice(0, 40)) :
      (status === 0 ? 'недоступний (мережа, змішаний вміст чи CORS)' : (status === -1 ? 'таймаут' : 'HTTP ' + status));
    one();
  });
  setTimeout(finish, 10000);
}
// Непіймані помилки — у журнал (лише коли діагностика ввімкнена): допомагає на ТВ, до яких немає доступу
function mzInstallErrorCapture() {
  try {
    window.addEventListener('error', function(e) {
      if (!mzTraceActive) return;
      mzLog('ERROR', String(e && e.message || '') + ' @ ' + String((e && e.filename) || '').split('/').pop() + ':' + (e && e.lineno));
    });
  } catch(e) {}
}

var mzLastCardTap = 0;
function addCardButton(e) {
  if (!e || e.type !== 'complite' || !window.$) return;
  var movie = (e.data && e.data.movie) || {};
  var title = String(movie.title || movie.name || '').trim();
  var alt = String(movie.original_title || movie.original_name || '').trim();
  if (!title && !alt) return;
  var root;
  try {root = e.object.activity.render();} catch(err) {root = e.body;}
  if (!root || !root.find) return;
  if (root.find('.button--mazepa').length) return;
  var holder = root.find('.full-start-new__buttons, .full-start__buttons').first();
  if (!holder.length) {mzLog('CARD','контейнер кнопок не знайдено'); return;}
  var btn = $('<div class="full-start__button selector button--mazepa"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span>Mazepa</span></div>');
  btn.on('hover:enter', function() {
    var nowTap = Date.now();
    if (nowTap - mzLastCardTap < 1500) {mzLog('CARD','повторне натискання проігноровано');return;}
    mzLastCardTap = nowTap;
    mzLog('CARD','search ' + (title || alt) + (mzHooks.parser && mzHooks.torrent && Lampa.Activity ? ' [штатний екран]' : ' [спливаючий список]'));
    if (mzHooks.parser && mzHooks.torrent && Lampa.Activity && Lampa.Activity.push) {
      try {mzOpenNativeList(movie, title, alt); return;} catch(err) {mzLog('CARD','штатний екран не відкрився: ' + err);}
    }
    searchMazepa(title || alt, {alt:alt, fromCard:true});
  });
  var play = holder.find('.button--play');
  if (play.length) play.after(btn); else holder.prepend(btn);
  mzLog('CARD','button added');
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
  mzInstallHooks();
  mzInstallPlayerDiag();
  mzInstallErrorCapture();
  mzAddRows();
  try {Lampa.Listener.follow('full', addCardButton);} catch(err) {mzLog('CARD','listener error');}
  notice('Mazepa: плагін завантажено');
}
if (window.appready) init();
else if (window.Lampa && Lampa.Listener) Lampa.Listener.follow('app',function(e){if(e.type==='ready')init();});
})();
