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
function openMenu() {
  Lampa.Select.show({
    title: 'Mazepa',
    items: [{title:'Перевірити сесію Mazepa.to', id:'session'}],
    onSelect: function(item) { if (item && item.id === 'session') sessionCheck(); },
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
