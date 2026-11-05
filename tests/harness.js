var fs=require('fs'),vm=require('vm');
var code=fs.readFileSync(process.argv[2],'utf8');
// розкриваємо внутрішні функції для тесту
code=code.replace(/\}\)\(\);\s*$/, 'window.__t={torrBase:torrBase,torrReady:torrReady,torrAuthHeader:torrAuthHeader,torrAuth:function(u,p){torrAuth={user:u,pass:p};}};})();');
function run(opts){
  var store=opts.ls||{}, notes=[], lstore=opts.lampa||{};
  var win={appready:true};
  var lampa={Noty:{show:function(m){notes.push(m);}},SettingsApi:{addComponent:function(){},addParam:function(){}},
    Storage:{get:function(k){return lstore[k];},field:function(k){return lstore[k];}}};
  if(opts.torserver) lampa.Torserver={url:function(){return opts.torserver;}};
  var ctx={window:win,Lampa:lampa,localStorage:{getItem:function(k){return k in store?store[k]:null;},setItem:function(k,v){store[k]=v;},removeItem:function(k){delete store[k];}},
    document:{addEventListener:function(){}},XMLHttpRequest:function(){},console:console,btoa:function(s){return Buffer.from(s,'binary').toString('base64');},
    unescape:unescape,encodeURIComponent:encodeURIComponent,setTimeout:setTimeout,Date:Date,JSON:JSON,Array:Array,Uint8Array:Uint8Array,String:String,Number:Number};
  win.Lampa=lampa; ctx.window=win; vm.createContext(ctx);
  vm.runInContext(code,ctx);
  return {t:win.__t,notes:notes};
}
var fails=0;function eq(name,a,b){var ok=JSON.stringify(a)===JSON.stringify(b);if(!ok)fails++;console.log((ok?'OK   ':'FAIL ')+name+' -> '+JSON.stringify(a)+(ok?'':' (очікувалось '+JSON.stringify(b)+')'));}
var r;
r=run({}); eq('1 нічого не задано: base','"'+r.t.torrBase()+'"','""'); eq('1 torrReady',r.t.torrReady(),false); eq('1 є підказка',r.notes.some(function(n){return /адресу не задано/.test(n);}),true);
r=run({torserver:'192.168.1.5:8090'}); eq('2 Lampa.Torserver.url',r.t.torrBase(),'http://192.168.1.5:8090');
r=run({lampa:{torrserver_url:'10.0.0.2:8090/'}}); eq('3 Lampa.Storage torrserver_url',r.t.torrBase(),'http://10.0.0.2:8090');
r=run({lampa:{torrserver_url_two:'http://srv:8090'}}); eq('3b torrserver_url_two',r.t.torrBase(),'http://srv:8090');
r=run({ls:{mz_torrserver_url:'http://own:8090'},torserver:'1.1.1.1:1'}); eq('4 власна адреса важливіша',r.t.torrBase(),'http://own:8090');
r=run({ls:{mz_torrserver_url:'сміття з пробілом'},torserver:'1.1.1.1:8090'}); eq('4b некоректна власна -> fallback',r.t.torrBase(),'http://1.1.1.1:8090');
r=run({}); eq('5 без авторизації',r.t.torrAuthHeader(),'');
r=run({lampa:{torrserver_auth:true,torrserver_login:'torrserver',torrserver_password:'p'}}); eq('6 креди Lampa',r.t.torrAuthHeader(),'Basic '+Buffer.from('torrserver:p').toString('base64'));
r=run({lampa:{torrserver_auth:false,torrserver_login:'a',torrserver_password:'b'}}); eq('6b Lampa auth вимкнена',r.t.torrAuthHeader(),'');
r=run({lampa:{torrserver_auth:true,torrserver_login:'a',torrserver_password:'b'}}); r.t.torrAuth('own','x'); eq('7 власні креди важливіші',r.t.torrAuthHeader(),'Basic '+Buffer.from('own:x').toString('base64'));
console.log(fails?('ПРОВАЛЕНО: '+fails):'УСІ ТЕСТИ ПРОЙШЛИ');
