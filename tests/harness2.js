var fs=require('fs'),vm=require('vm');
var code=fs.readFileSync(process.argv[2],'utf8');
var fails=0;function eq(n,a,b){var ok=JSON.stringify(a)===JSON.stringify(b);if(!ok)fails++;console.log((ok?'OK   ':'FAIL ')+n+' -> '+JSON.stringify(a)+(ok?'':' (очікувалось '+JSON.stringify(b)+')'));}
var opened=false,hides=0,t=100000,reqs=[],notes=[],selects=[],menus=0,handlers={},added=0,followed=null;
function XHR(){var self=this;this.open=function(m,u){self.m=m;self.u=u;};this.setRequestHeader=function(){};this.send=function(b){reqs.push({u:self.u,b:b,x:self});};}
var holder={length:1,first:function(){return holder;},find:function(sel){return sel==='.button--play'?{length:1,after:function(b){added++;}}:{length:0};},prepend:function(){added++;}};
var root={find:function(sel){if(sel==='.button--mazepa')return {length:added};return holder;}};
var win={appready:true};
var lampa={Noty:{show:function(m){notes.push(m);}},SettingsApi:{addComponent:function(){},addParam:function(){}},
 Listener:{follow:function(n,f){followed=f;}},Select:{show:function(o){selects.push(o);opened=true;},opened:function(){return opened;},hide:function(){hides++;opened=false;}},Storage:{get:function(){},field:function(){}}};
var ctx={window:win,Lampa:lampa,$:function(h){return {on:function(ev,fn){handlers[ev]=fn;return this;}};},
 localStorage:{getItem:function(k){return k==='mz_device_token'?'tok':((k==='mz_only_ua'||k==='mz_best_only')?'0':null);},setItem:function(){},removeItem:function(){}},
 document:{addEventListener:function(){}},XMLHttpRequest:XHR,console:console,btoa:function(){},unescape:unescape,encodeURIComponent:encodeURIComponent,setTimeout:setTimeout,Date:(function(){function D(){this.toISOString=function(){return 'x';};}D.now=function(){return t;};return D;})(),JSON:JSON,Array:Array,Uint8Array:Uint8Array,String:String,Number:Number,Blob:function(){},FormData:function(){}};
win.$=ctx.$;win.Lampa=lampa;vm.createContext(ctx);vm.runInContext(code,ctx);
eq('слухач події full зареєстровано',typeof followed,'function');
var ev={type:'complite',data:{movie:{title:'Дюна',original_title:'Dune'}},object:{activity:{render:function(){return root;}}}};
followed({type:'start',data:ev.data,object:ev.object}); eq('інший тип події ігнорується',added,0);
followed(ev); eq('кнопку додано',added,1);
followed(ev); eq('без дублів (зараз у root вже є кнопка)',added,1);
followed({type:'complite',data:{movie:{}},object:ev.object}); eq('без назви кнопку не додає',added,1);
handlers['hover:enter'](); eq('пошук за локальною назвою',JSON.parse(reqs[0].b).query,'Дюна');
reqs[0].x.status=200;reqs[0].x.responseText=JSON.stringify({results:[],html_size:5});reqs[0].x.onload();
eq('нічого не знайдено → пошук за оригінальною назвою',JSON.parse(reqs[1].b).query,'Dune');
reqs[1].x.status=200;reqs[1].x.responseText=JSON.stringify({results:[{id:'1',title:'Dune 2021'}]});reqs[1].x.onload();
eq('список релізів показано',selects.length===1&&selects[0].items[0].title,'Dune 2021');
eq('Back з картки не відкриває меню плагіна',(function(){var before=selects.length;selects[0].onBack();return selects.length===before;})(),true);
eq('дублю пошуку немає (рівно 2 запити)',reqs.length,2);

// --- нові перевірки: захист від накопичення ---
reqs.length=0;selects.length=0;opened=false;hides=0;
t=200000;handlers['hover:enter'](); eq('Н1 перше натискання → 1 запит',reqs.length,1);
t=200100;handlers['hover:enter'](); eq('Н2 швидке повторне натискання ігнорується (debounce)',reqs.length,1);
t=210000;handlers['hover:enter'](); eq('Н3 пошук ще триває → новий не стартує (busy)',reqs.length,1);
reqs[0].x.status=200;reqs[0].x.responseText=JSON.stringify({results:[{id:'1',title:'A'}]});reqs[0].x.onload();
eq('Н4 список показано один раз',selects.length,1);
t=220000;handlers['hover:enter'](); eq('Н5 після завершення новий пошук дозволений',reqs.length,2);
reqs[1].x.status=200;reqs[1].x.responseText=JSON.stringify({results:[{id:'2',title:'B'}]});reqs[1].x.onload();
eq('Н6 другий список: попередній закрито (hide викликано), стек не росте',hides,1);
// помилка мережі знімає busy
t=230000;handlers['hover:enter'](); reqs[2].x.onerror(); t=240000;handlers['hover:enter'](); eq('Н7 після помилки мережі пошук знову можливий',reqs.length,4);

console.log(fails?'ПРОВАЛЕНО: '+fails:'УСІ ТЕСТИ ПРОЙШЛИ');
