var fs=require('fs'),vm=require('vm');
function scenario(file,label){
  var code=fs.readFileSync(file,'utf8');
  var cur='full_start',activeSel=null,handlers={},reqs=[],notes=[];
  function XHR(){var s=this;this.open=function(){};this.setRequestHeader=function(){};this.send=function(b){reqs.push(s);};}
  var holder={length:1,first:function(){return holder;},find:function(){return {length:1,after:function(){}};}};
  var root={find:function(sel){return sel==='.button--mazepa'?{length:0}:holder;}};
  var win={appready:true};
  var lampa={Noty:{show:function(m){notes.push(m);}},SettingsApi:{addComponent:function(){},addParam:function(){}},
    Listener:{follow:function(n,f){win.__f=f;}},
    Controller:{enabled:function(){return {name:cur};},toggle:function(n){cur=n;}},
    Select:{show:function(o){activeSel=o;cur='select';},opened:function(){return false;},hide:function(){}},
    Storage:{get:function(){},field:function(){}}};
  var ctx={window:win,Lampa:lampa,$:function(){return {on:function(ev,fn){handlers[ev]=fn;return this;}};},
    localStorage:{getItem:function(k){return k==='mz_device_token'?'tok':((k==='mz_only_ua'||k==='mz_best_only')?'0':null);},setItem:function(){},removeItem:function(){}},
    document:{addEventListener:function(){}},XMLHttpRequest:XHR,console:console,btoa:function(){},unescape:unescape,encodeURIComponent:encodeURIComponent,setTimeout:setTimeout,Date:Date,JSON:JSON,Array:Array,Uint8Array:Uint8Array,String:String,Number:Number,Blob:function(){},FormData:function(){}};
  win.$=ctx.$;win.Lampa=lampa;vm.createContext(ctx);vm.runInContext(code,ctx);
  win.__f({type:'complite',data:{movie:{title:'Дюна',original_title:'Dune'}},object:{activity:{render:function(){return root;}}}});
  handlers['hover:enter']();                      // натиснули кнопку Mazepa в картці
  reqs[0].status=200;reqs[0].responseText=JSON.stringify({results:[{id:'1',title:'Dune'}]});reqs[0].onload(); // з'явився список
  // Lampa: кожен Back, поки контролер 'select', викликає close() → onBack (без повернення фокуса)
  var presses=0;
  while(cur==='select' && presses<100){presses++; if(activeSel.onBack)activeSel.onBack();}
  var out=(cur==='select')?'ЗАСТРЯГ (>100 натискань)':presses+' натискань до повернення в «'+cur+'»';
  console.log(label+': '+out);
  return {presses:presses,cur:cur};
}
var oldR=scenario(process.argv[2],'СТАРА версія ');
var newR=scenario(process.argv[3],'НОВА версія  ');
// сценарій меню: вибір пункту, що лише показує повідомлення
function menu(file,label){
  var code=fs.readFileSync(file,'utf8');
  var cur='settings_component',activeSel=null,notes=[];
  var win={appready:true},btn={};
  var lampa={Noty:{show:function(m){notes.push(m);}},SettingsApi:{addComponent:function(){},addParam:function(p){btn=p;}},
    Listener:{follow:function(){}},Controller:{enabled:function(){return {name:cur};},toggle:function(n){cur=n;}},
    Select:{show:function(o){activeSel=o;cur='select';},opened:function(){return false;},hide:function(){}},Storage:{get:function(){},field:function(){}}};
  var ctx={window:win,Lampa:lampa,$:function(){return {on:function(){return this;}};},localStorage:{getItem:function(){return null;},setItem:function(){},removeItem:function(){}},
    document:{addEventListener:function(){}},XMLHttpRequest:function(){this.open=function(){};this.setRequestHeader=function(){};this.send=function(){};},console:console,btoa:function(){},unescape:unescape,encodeURIComponent:encodeURIComponent,setTimeout:setTimeout,Date:Date,JSON:JSON,Array:Array,Uint8Array:Uint8Array,String:String,Number:Number,Blob:function(){},FormData:function(){}};
  win.Lampa=lampa;vm.createContext(ctx);vm.runInContext(code,ctx);
  btn.onChange();                                   // Налаштування → «Відкрити Mazepa»
  var presses=0;while(cur==='select'&&presses<100){presses++;if(activeSel.onBack)activeSel.onBack();}
  console.log(label+': '+((cur==='select')?'ЗАСТРЯГ (>100 натискань)':presses+' натискань до повернення в «'+cur+'»'));
  return {presses:presses,cur:cur};
}
var m1=menu(process.argv[2],'МЕНЮ стара   ');var m2=menu(process.argv[3],'МЕНЮ нова    ');
// після вибору пункту, що лише показує повідомлення
function pick(file,label){
  var code=fs.readFileSync(file,'utf8');
  var cur='settings_component',activeSel=null,btn={};
  var win={appready:true};
  var lampa={Noty:{show:function(){}},SettingsApi:{addComponent:function(){},addParam:function(p){btn=p;}},Listener:{follow:function(){}},
    Controller:{enabled:function(){return {name:cur};},toggle:function(n){cur=n;}},
    Select:{show:function(o){activeSel=o;cur='select';},opened:function(){return false;},hide:function(){}},Storage:{get:function(){},field:function(){}}};
  var ctx={window:win,Lampa:lampa,$:function(){return {on:function(){return this;}};},localStorage:{getItem:function(){return null;},setItem:function(){},removeItem:function(){}},
    document:{addEventListener:function(){}},XMLHttpRequest:function(){this.open=function(){};this.setRequestHeader=function(){};this.send=function(){};},console:console,btoa:function(){},unescape:unescape,encodeURIComponent:encodeURIComponent,setTimeout:setTimeout,Date:Date,JSON:JSON,Array:Array,Uint8Array:Uint8Array,String:String,Number:Number,Blob:function(){},FormData:function(){}};
  win.Lampa=lampa;vm.createContext(ctx);vm.runInContext(code,ctx);
  btn.onChange();
  // Lampa при виборі пункту: hide() (контролер не міняє) → onSelect
  activeSel.onSelect({id:1});
  console.log(label+': після вибору пункту «Повторити останній пошук» контролер = «'+cur+'»'+(cur==='select'?'  ← ЗАСТРЯГ на невидимому списку':''));
  return cur;
}
var p1=pick(process.argv[2],'ВИБІР стара  ');var p2=pick(process.argv[3],'ВИБІР нова   ');
var ok=newR.cur==='full_start'&&newR.presses===1&&m2.cur==='settings_component'&&m2.presses===1&&p2==='settings_component';
console.log(ok?'ПІДСУМОК: нова версія повертає фокус одним Back у всіх 3 сценаріях':'ПІДСУМОК: ПРОВАЛ');
process.exit(ok?0:1);
