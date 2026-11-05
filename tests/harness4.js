var fs=require('fs'),vm=require('vm');
var code=fs.readFileSync(process.argv[2],'utf8');
var fails=0;function eq(n,a,b){var ok=JSON.stringify(a)===JSON.stringify(b);if(!ok)fails++;console.log((ok?'OK   ':'FAIL ')+n+' -> '+JSON.stringify(a)+(ok?'':'  (очікувалось '+JSON.stringify(b)+')'));}
function make(o){
  o=o||{};
  var st={notes:[],xhrs:[],pushed:[],origParser:[],origStart:[],handlers:{},store:{},lstore:o.lstore||{},tsUrl:o.tsUrl===undefined?'http://192.168.0.5:8090':o.tsUrl};
  st.ls=o.ls||{mz_device_token:'tok',mz_torrserver_url:'http://192.168.0.5:8090',mz_only_ua:'0',mz_max_size_gb:'0',mz_best_only:'0'};
  function XHR(){var s=this;s.h={};this.open=function(m,u){s.m=m;s.u=u;};this.setRequestHeader=function(k,v){s.h[k]=v;};this.getResponseHeader=function(){return '';};this.send=function(b){s.b=b;st.xhrs.push(s);};}
  var win={appready:true};
  var lampa={Noty:{show:function(m){st.notes.push(m);}},SettingsApi:{addComponent:function(){},addParam:function(){}},
    Listener:{follow:function(n,f){win.__full=f;}},
    Controller:{enabled:function(){return {name:'full_start'};},toggle:function(){}},
    Select:{show:function(sel){st.select=sel;},opened:function(){return false;},hide:function(){}},
    Storage:{get:function(k){return st.lstore[k]===undefined?'':st.lstore[k];},set:function(k,v){st.lstore[k]=v;},field:function(k){return !!st.lstore[k];}},
    Utils:{strToTime:function(d){return new Date(d).getTime();},hash:function(t){return 'h'+t.length;},bytesToSize:function(b){return (b/1024/1024/1024).toFixed(1)+' GB';}},
    Activity:{push:function(p){st.pushed.push(p);}}};
  if(!o.noParser) lampa.Parser={get:function(p,ok,err){st.origParser.push(p);}};
  if(!o.noTorrent) lampa.Torrent={start:function(el,mv){st.origStart.push({el:el,mv:mv});}};
  lampa.Torserver={url:function(){return st.tsUrl;}};
  var ctx={window:win,Lampa:lampa,$:o.jq||function(){return {on:function(ev,fn){st.handlers[ev]=fn;return this;}};},
    localStorage:{getItem:function(k){return k in st.ls?st.ls[k]:null;},setItem:function(k,v){st.ls[k]=v;},removeItem:function(k){delete st.ls[k];}},
    document:{addEventListener:function(){}},XMLHttpRequest:XHR,console:console,btoa:function(s){return Buffer.from(s,'binary').toString('base64');},unescape:unescape,encodeURIComponent:encodeURIComponent,setTimeout:setTimeout,Date:Date,JSON:JSON,Array:Array,Uint8Array:Uint8Array,String:String,Number:Number,
    TextDecoder:TextDecoder,Blob:function(){},FormData:function(){this.append=function(){};},Math:Math};
  win.$=ctx.$;win.Lampa=lampa;vm.createContext(ctx);vm.runInContext(code,ctx);
  st.lampa=lampa;st.win=win;return st;
}
var root=function(){var holder={length:1,first:function(){return holder;},find:function(){return {length:1,after:function(){}};}};return {find:function(sel){return sel==='.button--mazepa'?{length:0}:holder;}};};
function card(st,movie){st.win.__full({type:'complite',data:{movie:movie||{title:'Дюна',original_title:'Dune'}},object:{activity:{render:root}}});}
var st,r;

// Т1: хуки
st=make(); r=st.lampa.Parser.mzHooked&&st.lampa.Torrent.mzHooked; eq('Т1 хуки Parser і Torrent встановлено',!!r,true);

// Т2: кнопка → штатний екран
st=make(); var movie={title:'Дюна',original_title:'Dune',id:438631}; card(st,movie); st.handlers['hover:enter']();
eq('Т2 відкрито штатний екран torrents',st.pushed.length===1&&st.pushed[0].component==='torrents'&&st.pushed[0].mz_only===true,true);
eq('Т2 параметри пошуку і картка',[st.pushed[0].search_one,st.pushed[0].search_two,st.pushed[0].movie.id],['Дюна','Dune',438631]);
eq('Т2 спливаючий список не відкривався',st.select===undefined,true);

// Т3: Parser.get (mz_only) → елементи у форматі Lampa
st=make(); var got=null; st.lampa.Parser.get({mz_only:true,search_one:'Дюна S01',search_two:'Dune',search:'Dune Дюна'},function(d){got=d;},function(e){got={err:e};});
eq('Т3 запит до Worker з очищеним запитом (без S01)',JSON.parse(st.xhrs[0].b).query,'Дюна');
st.xhrs[0].status=200;st.xhrs[0].responseText=JSON.stringify({results:[{id:'101',title:'Дюна (2021) 2160p',size:49928994816,seeders:15,leechers:3,date:'2023-11-04T06:40:00'}]});st.xhrs[0].onload();
var e0=got.Results[0];
eq('Т3 поля торрента',[e0.Title,e0.Tracker,e0.Size,e0.Seeders,e0.Peers,e0.mz_id,e0.PublishDate],['[SDR] Дюна (2021) 2160p','Mazepa',49928994816,15,3,'101','2023-11-04T06:40:00']);
eq('Т3 службові поля Lampa (hash, viewed, size-рядок, PublisTime)',[typeof e0.hash,e0.viewed,e0.size,typeof e0.PublisTime],['string',false,'46.5 GB','number']);
eq('Т3 оригінальний парсер Lampa не викликався',st.origParser.length,0);

// Т4: порожньо → другий кандидат
st=make(); got=null; st.lampa.Parser.get({mz_only:true,search_one:'Дюна',search_two:'Dune'},function(d){got=d;},function(e){got={err:e};});
st.xhrs[0].status=200;st.xhrs[0].responseText='{"results":[]}';st.xhrs[0].onload();
eq('Т4 при порожньому результаті пробує оригінальну назву',JSON.parse(st.xhrs[1].b).query,'Dune');
st.xhrs[1].status=200;st.xhrs[1].responseText=JSON.stringify({results:[{id:'7',title:'Dune'}]});st.xhrs[1].onload();
eq('Т4 результат другого пошуку',got.Results.length,1);

// Т5: уточнення (clarification) — тільки search
st=make(); st.lampa.Parser.get({mz_only:true,clarification:true,search:'точна назва',search_one:'a1',search_two:'b2'},function(){},function(){});
eq('Т5 clarification використовує лише search',JSON.parse(st.xhrs[0].b).query,'точна назва');

// Т6: звичайний пошук Lampa не чіпається
st=make(); st.lampa.Parser.get({search:'x'},function(){},function(){}); eq('Т6 без mz_only викликається оригінальний Parser.get',st.origParser.length,1);

// Т7: помилка Worker передається в Lampa
st=make(); got=null; st.lampa.Parser.get({mz_only:true,search_one:'Дюна'},function(d){got=d;},function(e){got={err:e};});
st.xhrs[0].status=409;st.xhrs[0].responseText=JSON.stringify({error:'Увійди в Mazepa'});st.xhrs[0].onload(); eq('Т7 помилка Worker → onerror',got.err,'Mazepa: Увійди в Mazepa');

// Т8: Torrent.start для чужого торрента
st=make(); st.lampa.Torrent.start({Title:'x'},{id:1}); eq('Т8 чужий торрент іде в оригінальний start',st.origStart.length,1);

// Т9: Lampa без адреси TorrServer
st=make({tsUrl:''}); st.lampa.Torrent.start({Title:'x',mz_id:'5'},{id:1});
eq('Т9 без адреси в Lampa: підказка, start не викликано',[st.origStart.length,st.notes.some(function(n){return /Синхронізувати/.test(n);})],[0,true]);

// Т10: є власна авторизація, а в Lampa вона вимкнена
st=make({ls:{mz_device_token:'tok',mz_torrserver_url:'http://192.168.0.5:8090',mz_torrserver_auth:JSON.stringify({user:'torrserver',pass:'p'}),mz_only_ua:'0',mz_best_only:'0'}});
st.lampa.Torrent.start({Title:'x',mz_id:'5'},{id:1});
eq('Т10 авторизація вимкнена в Lampa: блокує з підказкою',[st.origStart.length,st.notes.some(function(n){return /авторизац/.test(n);})],[0,true]);

// Т11: повний шлях — .torrent → TorrServer → magnet → штатний start
st=make(); var el={Title:'Дюна 4K',mz_id:'101'}; st.lampa.Torrent.start(el,{id:9});
eq('Т11 крок 1: запит .torrent у Worker',[st.xhrs[0].u.indexOf('/mazepa/torrent')>0,JSON.parse(st.xhrs[0].b).id],[true,'101']);
st.xhrs[0].status=200;st.xhrs[0].response=new Uint8Array([100,101]).buffer;st.xhrs[0].onload();
eq('Т11 крок 2: завантаження в TorrServer',st.xhrs[1].u,'http://192.168.0.5:8090/torrent/upload');
st.xhrs[1].status=200;st.xhrs[1].responseText=JSON.stringify({hash:'abcdef0123456789abcdef0123456789abcdef01'});st.xhrs[1].onload();
eq('Т11 крок 3: штатний Torrent.start з magnet за хешем',[st.origStart.length,st.origStart[0].el.MagnetUri,st.origStart[0].mv.id],[1,'magnet:?xt=urn:btih:abcdef0123456789abcdef0123456789abcdef01&dn='+encodeURIComponent('Дюна 4K'),9]);

// Т12: захист від подвійного запуску
st=make(); st.lampa.Torrent.start({Title:'a',mz_id:'1'},{}); st.lampa.Torrent.start({Title:'a',mz_id:'1'},{});
eq('Т12 другий запуск, поки готується, ігнорується',st.xhrs.length,1);

// Т13: помилка .torrent знімає busy
st=make(); st.lampa.Torrent.start({Title:'a',mz_id:'1'},{}); st.xhrs[0].status=502;st.xhrs[0].response=new TextEncoder().encode(JSON.stringify({error:'Mazepa не віддала torrent-файл'})).buffer;st.xhrs[0].onload();
st.lampa.Torrent.start({Title:'a',mz_id:'1'},{});
eq('Т13 після помилки: оригінал не викликано, повторний запуск можливий',[st.origStart.length,st.xhrs.length],[0,2]);

// Т14: синхронізація налаштувань Lampa (функцію відкриваємо для тесту)
var codeSync=code.replace(/\}\)\(\);\s*$/,'window.__sync=mzSyncLampaTorrserver;})();');
var realCode=code; code=codeSync;
st=make({tsUrl:'',ls:{mz_device_token:'tok',mz_torrserver_url:'http://192.168.0.5:8090',mz_torrserver_auth:JSON.stringify({user:'torrserver',pass:'p'})}});
st.win.__sync();
eq('Т14 синхронізація записала адресу, логін, пароль і ввімкнула авторизацію',[st.lstore.torrserver_url,st.lstore.torrserver_login,st.lstore.torrserver_password,st.lstore.torrserver_auth],['http://192.168.0.5:8090','torrserver','p',true]);
st=make({tsUrl:'http://other:8090',lstore:{torrserver_url:'http://other:8090'},ls:{mz_device_token:'tok',mz_torrserver_url:'http://192.168.0.5:8090'}});
st.win.__sync();
eq('Т15 інша адреса вже є в Lampa: не перезаписується, є повідомлення',[st.lstore.torrserver_url,st.notes.some(function(n){return /вже задано інший/.test(n);})],['http://other:8090',true]);
code=realCode;

// Т16: запасний шлях — Lampa без Parser/Torrent
st=make({noParser:true,noTorrent:true}); card(st,{title:'Дюна',original_title:'Dune'}); st.handlers['hover:enter']();
eq('Т16 без хуків: штатний екран не відкривається, іде запасний пошук (запит до Worker)',[st.pushed.length,st.xhrs.length>0&&JSON.parse(st.xhrs[0].b).query],[0,'Дюна']);

// Т17: помилка при відкритті штатного екрана → запасний пошук
st=make(); st.lampa.Activity.push=function(){throw new Error('boom');}; card(st,{title:'Дюна',original_title:'Dune'}); st.handlers['hover:enter']();
eq('Т17 збій Activity.push → запасний пошук',st.xhrs.length>0&&JSON.parse(st.xhrs[0].b).query,'Дюна');

// ===== Рівні якості =====
var GB=1073741824;
function search(lsExtra,results,params){var ls={mz_device_token:'tok',mz_torrserver_url:'http://192.168.0.5:8090',mz_only_ua:'0'};for(var k in lsExtra)ls[k]=lsExtra[k];
  var s=make({ls:ls});var out=null;var p={mz_only:true,search_one:'Дюна'};for(var q in (params||{}))p[q]=(params||{})[q];
  s.lampa.Parser.get(p,function(d){out=d;},function(e){out={err:e};});
  s.xhrs[0].status=200;s.xhrs[0].responseText=JSON.stringify({results:results});s.xhrs[0].onload();return {out:out,s:s};}
function ids(t){return t.out.Results.map(function(e){return e.mz_id;});}
var A={id:'A',title:'Дюна 2160p HDR10 Ukr',size:20*GB},B={id:'B',title:'Дюна 2160p SDR Ukr',size:20*GB},C={id:'C',title:'Дюна 1080p Ukr',size:8*GB},D={id:'D',title:'Дюна 720p Ukr',size:3*GB},E={id:'E',title:'Дюна 2160p HDR Ukr',size:60*GB};
var ALL=[A,B,C,D,E];
var t=search({},ALL);
eq('Л1 авто (фільм): рівень 1 = 4K (A, B)',ids(t),['A','B']);
eq('Л1 4K без HDR отримує позначку [SDR], 4K HDR — ні',t.out.Results.map(function(e){return e.Title.indexOf('[SDR] ')===0;}),[false,true]);
eq('Л1 повідомлення: «рівень авто: 4K — 2 з 5»',t.s.notes.some(function(n){return /рівень авто: 4K — 2 з 5/.test(n);}),true);
eq('Л2 немає 4K → авто бере рівень 2 (C)',ids(search({},[C,D,E])),['C']);
eq('Л2 немає 4K і FHD → авто бере рівень 3 (D)',ids(search({},[D,E])),['D']);
eq('Л2 лишилося тільки понад ліміт → авто показує рівень 0 (E)',ids(search({},[E])),['E']);
eq('Л3 рівень 2 вручну',ids(search({},ALL,{mz_level:2})),['C']);
eq('Л3 рівень 0 вручну (понад 35 ГБ)',ids(search({},ALL,{mz_level:0})),['E']);
eq('Л3 рівень 3 вручну',ids(search({},ALL,{mz_level:3})),['D']);
eq('Л3 усі рівні вручну',ids(search({},ALL,{mz_level:'all'})).length,5);
eq('Л3 «auto» вручну = авто',ids(search({},ALL,{mz_level:'auto'})),['A','B']);
t=search({},[A,B,D],{mz_level:2});
eq('Л4 обраний рівень порожній → показано всі + повідомлення',[ids(t).length,t.s.notes.some(function(n){return /на обраному рівні порожньо/.test(n);})],[3,true]);
eq('Л5 серіал: авто показує всі рівні (включно з 0)',ids(search({},ALL,{movie:{number_of_seasons:2}})).length,5);
eq('Л5 серіал: рівень вручну працює',ids(search({},ALL,{movie:{number_of_seasons:2},mz_level:2})),['C']);
eq('Л6 «за замовчуванням усі» (mz_best_only=0): усі 5',ids(search({mz_best_only:'0'},ALL)).length,5);
t=search({mz_max_size_gb:'0'},ALL); eq('Л7 ліміт 0: рівня 0 немає, E стає 4K (A, B, E)',ids(t),['A','B','E']);
t=search({mz_only_ua:'1'},[A,{id:'X',title:'Dune 2160p HDR Rus',size:10*GB},C]);
eq('Л8 лише UA: Rus прихований, є повідомлення',[ids(t),t.s.notes.some(function(n){return /приховано 1 без української/.test(n);})],[['A'],true]);
t=search({mz_only_ua:'1'},[{id:'X',title:'Dune Rus',size:5*GB}]); eq('Л9 усе приховано UA: порожній список без помилки',ids(t).length,0);
t=search({mz_best_only:'0'},ALL); eq('Л9б «усі за замовчуванням»: повідомлення про рівень немає',t.s.notes.some(function(n){return /рівень/.test(n);}),false);
t=search({mz_only_ua:'0'},[{id:'1',title:'Дюна 1080p',size:3.4*GB},{id:'2',title:'Дюна 1080p',size:3.6*GB}],{mz_level:0,}); // без ліміту через mz_max_size_gb нижче
t=search({mz_max_size_gb:'3,5'},[{id:'1',title:'Дюна 1080p',size:3.4*GB},{id:'2',title:'Дюна 1080p',size:3.6*GB}],{mz_level:0}); eq('Л10 ліміт з комою «3,5»: рівень 0 = лише 3,6 ГБ',ids(t),['2']);
t=search({mz_max_size_gb:'abc'},[{id:'1',title:'Дюна 1080p',size:34*GB},{id:'2',title:'Дюна 1080p',size:36*GB}],{mz_level:0}); eq('Л10 некоректний ліміт → стандартні 35 ГБ',ids(t),['2']);
// Фоллтру до наступної назви, коли UA відсіяв усе
(function(){var s=make({ls:{mz_device_token:'tok',mz_torrserver_url:'http://192.168.0.5:8090',mz_only_ua:'1'}});var out=null;
 s.lampa.Parser.get({mz_only:true,search_one:'Дюна',search_two:'Dune'},function(d){out=d;},function(e){out={err:e};});
 s.xhrs[0].status=200;s.xhrs[0].responseText=JSON.stringify({results:[{id:'1',title:'Дюна Rus',size:5*GB}]});s.xhrs[0].onload();
 eq('Л11 UA відсіяв усе за першою назвою → другий запит (оригінальна назва)',JSON.parse(s.xhrs[1].b).query,'Dune');
 s.xhrs[1].status=200;s.xhrs[1].responseText=JSON.stringify({results:[{id:'2',title:'Dune 2021 Ukr 1080p',size:5*GB}]});s.xhrs[1].onload();
 eq('Л11 результат другого запиту показано',out.Results.map(function(e){return e.mz_id;}),['2']);})();

// Кнопка «Рівень» у панелі фільтрів і вибір рівня
(function(){
 var appended=null,btnHandlers={},btnText='';
 var lineStub={length:1,last:function(){return lineStub;},find:function(){return {remove:function(){}};},append:function(b){appended=b;}};
 function jq(arg){
   if(arg==='.torrent-filter')return lineStub;
   var el={find:function(){return {text:function(t){btnText=t;return this;}};},on:function(ev,fn){btnHandlers[ev]=fn;return el;}};
   return el;
 }
 var st=make({ls:{mz_device_token:'tok',mz_torrserver_url:'http://192.168.0.5:8090',mz_only_ua:'0'},jq:jq});
 st.lampa.Parser.get({mz_only:true,search_one:'Дюна'},function(){},function(){});
 st.xhrs[0].status=200;st.xhrs[0].responseText=JSON.stringify({results:ALL});st.xhrs[0].onload();
 eq('Л12 кнопку додано в панель фільтрів',[!!appended,btnText],[true,'Рівень: авто 1']);
 btnHandlers['hover:enter']();
 eq('Л12 натискання відкриває вибір рівня (6 пунктів) з лічильниками',[st.select&&st.select.items.length,st.select&&st.select.items[1].title],[6,'Рівень 1 — 4K · 2']);
 var replaced=null; st.lampa.Activity.replace=function(p){replaced=p;};
 st.select.onSelect({id:2});
 eq('Л12 вибір рівня 2 → Activity.replace({mz_level:2})',replaced,{mz_level:2});
 st.select.onSelect({id:'auto'}); eq('Л12 «Авто» → mz_level:"auto"',replaced,{mz_level:'auto'});
})();

// таблиці розпізнавання
var codeF=code; code=code.replace(/\}\)\(\);\s*$/,'window.__d={ua:mzIsUa,k4:mzIs4k,hdr:mzIsHdr,fhd:mzIsFhd};})();'); var sd=make(); code=codeF;
[['3xUkr/Eng',true,'ua'],['2xUkr',true,'ua'],['Ukrainian dub',true,'ua'],['Укр',true,'ua'],['Українська озвучка',true,'ua'],['UA',true,'ua'],['(UA)',true,'ua'],['Dua Lipa',false,'ua'],['Aquaman 2018 1080p',false,'ua'],['Rus/Eng',false,'ua'],['Ukraine documentary',true,'ua'],
 ['2160p',true,'k4'],['4K',true,'k4'],['UHD',true,'k4'],['UHD BDRemux',true,'k4'],['4Kids',false,'k4'],['1080p',false,'k4'],
 ['HDR',true,'hdr'],['HDR10+',true,'hdr'],['Dolby Vision',true,'hdr'],['DV P7',true,'hdr'],['HDRip',false,'hdr'],['DVDRip',false,'hdr'],['DVD5',false,'hdr'],['SDR',false,'hdr'],
 ['1080p',true,'fhd'],['1080i',true,'fhd'],['FHD',true,'fhd'],['Full HD',true,'fhd'],['720p',false,'fhd'],['2160p',false,'fhd']
].forEach(function(c){eq('Д '+c[2]+'(«'+c[0]+'»)',sd.win.__d[c[2]](c[0]),c[1]);});
// Л13: фільтр української озвучки за замовчуванням вимкнено
(function(){var ls={mz_device_token:'tok',mz_torrserver_url:'http://192.168.0.5:8090',mz_best_only:'0',mz_max_size_gb:'0'};
 var s=make({ls:ls});var out=null;s.lampa.Parser.get({mz_only:true,search_one:'Дюна'},function(d){out=d;},function(){});
 s.xhrs[0].status=200;s.xhrs[0].responseText=JSON.stringify({results:[{id:'1',title:'Dune Rus 1080p',size:5*1073741824},{id:'2',title:'Dune 1080p Ukr',size:5*1073741824}]});s.xhrs[0].onload();
 eq('Л13 за замовчуванням фільтр UA вимкнено: показано обидва',out.Results.map(function(e){return e.mz_id;}),['1','2']);
 eq('Л13 повідомлення про приховане UA немає',s.notes.some(function(n){return /без української/.test(n);}),false);})();
console.log(fails?'ПРОВАЛЕНО: '+fails:'УСІ ТЕСТИ ПРОЙШЛИ');
process.exit(fails?1:0);
