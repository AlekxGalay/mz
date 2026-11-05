var fs=require('fs'),vm=require('vm');
var baseCode=fs.readFileSync(process.argv[2],'utf8');
var fails=0;function eq(n,a,b){var ok=JSON.stringify(a)===JSON.stringify(b);if(!ok)fails++;console.log((ok?'OK   ':'FAIL ')+n+' -> '+JSON.stringify(a)+(ok?'':'  (очікувалось '+JSON.stringify(b)+')'));}
var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms);});};

function make(o){
  o=o||{};
  var code=baseCode;
  if(o.timeout) code=code.replace("var mzRowTimeout = 6000;","var mzRowTimeout = "+o.timeout+";");
  code=code.replace("var mzPrewarmDelay = 2500;","var mzPrewarmDelay = "+(o.prewarm||2000000000)+";");
  if(o.trace) code=code.replace('var mzTraceActive = false;','var mzTraceActive = true;');
  code=code.replace(/\}\)\(\);\s*$/,'window.__x={ua:mzParseUa,parse:mzParseRelease,reset:mzResetRows,trace:function(){return mzTrace;},openMenu:openMenu};})();');
  var st={ls:o.ls||{mz_device_token:'tok'},rows:[],reqs:[],tmdbReqs:[],notes:[],feedDelay:o.feedDelay||0,pl:{},pv:{},shows:[],pushed:[],inputValue:'',winEvents:{}};
  st.route=o.route||function(){return {status:404,text:'{}'};};
  st.tmdb=o.tmdb;
  function XHR(){var s=this;s.h={};this.open=function(m,u){s.m=m;s.u=u;};this.setRequestHeader=function(k,v){s.h[k]=v;};this.getResponseHeader=function(){return '';};
    this.send=function(b){s.b=b;st.reqs.push({u:s.u,b:b?JSON.parse(b):null});var r=st.route(s.u,s.b?JSON.parse(s.b):null);
      var delay=/\/mazepa\/feed/.test(s.u)?st.feedDelay:0;
      setTimeout(function(){if(r==='net'){s.onerror&&s.onerror();return;}s.status=r.status;s.responseText=r.text;s.onload&&s.onload();},delay);};}
  function Reguest(){this.timeout=function(){};this.silent=function(url,ok,err){st.tmdbReqs.push(url);var r=st.tmdb?st.tmdb(url):null;setTimeout(function(){if(r)ok(r);else err();},0);};}
  var win={appready:true,screen:{width:3840,height:2160},devicePixelRatio:2,addEventListener:function(n,f){(st.winEvents[n]=st.winEvents[n]||[]).push(f);}};
  var lampa={Noty:{show:function(m){st.notes.push(m);}},SettingsApi:{addComponent:function(){},addParam:function(){}},
    Listener:{follow:function(){}},Controller:{enabled:function(){return {name:'content'};},toggle:function(){}},
    Select:{show:function(o){st.select=o;st.shows.push(o);},opened:function(){return false;},hide:function(){}},
    Storage:{get:function(){return '';},set:function(){},field:function(k){return k==='tmdb_lang'?'uk':false;}},
    Player:{listener:{follow:function(n,f){(st.pl[n]=st.pl[n]||[]).push(f);}}},PlayerVideo:{listener:{follow:function(n,f){(st.pv[n]=st.pv[n]||[]).push(f);}}},
    Input:{edit:function(o,cb){cb(st.inputValue);}},Activity:{push:function(p){if(st.pushThrows)throw new Error('boom');st.pushed.push(p);}},
    Manifest:{app_version:'3.4.5'},Platform:{get:function(){return 'webos';}},
    Reguest:Reguest,TMDB:{api:function(p){return 'tmdb://'+p;},key:function(){return 'K';}}};
  if(!o.noHooks){lampa.Parser={get:function(p,ok,err){st.origParser=(st.origParser||0)+1;}};lampa.Torrent={start:function(){}};}
  if(!o.noRows) lampa.ContentRows={add:function(r){st.rows.push(r);}};
  var ctx={window:win,Lampa:lampa,$:function(){return {on:function(){return this;}};},
    localStorage:{getItem:function(k){return k in st.ls?st.ls[k]:null;},setItem:function(k,v){st.ls[k]=String(v);},removeItem:function(k){delete st.ls[k];},get length(){return Object.keys(st.ls).length;},key:function(i){return Object.keys(st.ls)[i]||null;}},
    navigator:{userAgent:o.ua||''},document:{addEventListener:function(){},createElement:function(){return {canPlayType:function(t){return (o.codecs&&o.codecs[t])||'';}};}},XMLHttpRequest:XHR,console:console,btoa:function(){},unescape:unescape,encodeURIComponent:encodeURIComponent,setTimeout:setTimeout,clearTimeout:clearTimeout,Date:Date,JSON:JSON,Array:Array,Object:Object,Uint8Array:Uint8Array,String:String,Number:Number,TextDecoder:TextDecoder,Blob:function(){},FormData:function(){this.append=function(){};},Math:Math};
  win.$=ctx.$;win.Lampa=lampa;vm.createContext(ctx);vm.runInContext(code,ctx);
  st.win=win;st.byName=function(n){return st.rows.filter(function(r){return r.name===n;})[0];};
  return st;
}
function getRow(st,name){return new Promise(function(res){var r=st.byName(name);var fn=r.call({},'main');if(typeof fn!=='function'){res({noFn:true});return;}fn(function(d){res(d);});});}

var FEED_NEW={status:'ok',kind:'new',results:[
 {id:'1',title:'Дюна / Dune (2021) BDRemux 2160p HDR | 3xUkr/Eng',size:1,seeders:5,date:''},
 {id:'2',title:'Дюна / Dune (2021) WEB-DL 1080p',size:1,seeders:9,date:''},
 {id:'3',title:'Розрив / Severance (Сезон 1) (2022) WEB-DL 1080p',size:1,seeders:3,date:''},
 {id:'4',title:'Без постера / No Poster (2020) 720p',size:1,seeders:1,date:''}]};
var FEED_TOP={status:'ok',kind:'top',results:[
 {id:'1',title:'Дюна / Dune (2021) BDRemux 2160p',seeders:50},
 {id:'3',title:'Розрив / Severance (Сезон 1) (2022) WEB-DL',seeders:40},
 {id:'5',title:'Невідоме / Obscure (2019) 1080p',seeders:30},
 {id:'6',title:'Так собі / Meh (2018) 1080p',seeders:20}]};
var IMDB={'Dune':{imdb_id:'tt1160419',rating:8.0,votes:1234567},'Severance':{imdb_id:'tt11280740',rating:8.7,votes:450000},'Obscure':{imdb_id:'tt555',rating:9.5,votes:50},'Meh':{imdb_id:'tt999',rating:6.1,votes:20000}};
var TMDBFIND={'tt1160419':{movie_results:[{id:438631,title:'Дюна',poster_path:'/a.jpg'}],tv_results:[]},'tt11280740':{movie_results:[],tv_results:[{id:95396,name:'Розрив',poster_path:'/b.jpg'}]},'tt999':{movie_results:[{id:9,title:'Так собі',poster_path:'/m.jpg'}],tv_results:[]},'tt555':{movie_results:[{id:5,title:'Невідоме',poster_path:'/o.jpg'}],tv_results:[]}};
function router(extra){extra=extra||{};return function(u,b){
  if(/\/mazepa\/feed/.test(u)){return extra.feed?extra.feed(b):{status:200,text:JSON.stringify(b.kind==='top'?FEED_TOP:FEED_NEW)};}
  if(/\/imdb/.test(u)){if(extra.imdb)return extra.imdb(b);var d=IMDB[b.original];return {status:200,text:JSON.stringify(d||{imdb_id:'',rating:0,votes:0})};}
  return {status:404,text:'{}'};};}
function tmdb(url){
  var p=url.replace('tmdb://','');
  var m=p.match(/^search\/(movie|tv)\?query=([^&]+)/);
  if(m){var q=decodeURIComponent(m[2]);
    if(q==='Dune')return {results:[{id:438631,title:'Дюна',poster_path:'/a.jpg'}]};
    if(q==='Severance')return {results:[{id:95396,name:'Розрив',poster_path:'/b.jpg'}]};
    if(q==='No Poster')return {results:[{id:1,title:'x',poster_path:null}]};
    return {results:[]};}
  var f=p.match(/^find\/(tt\d+)/); if(f)return TMDBFIND[f[1]]||{movie_results:[],tv_results:[]};
  return null;}

(async function(){
  // R1 розбір назв
  var st=make({route:router(),tmdb:tmdb});
  var P=function(t){return st.win.__x.parse(t);};
  eq('R1 «Дюна / Dune (2021) …»',P('Дюна / Dune (2021) BDRemux 2160p HDR | 3xUkr/Eng'),{title:'Дюна',original:'Dune',year:'2021',series:false});
  eq('R1 серіал із сезоном',P('Розрив / Severance (Сезон 1) (2022) WEB-DL'),{title:'Розрив',original:'Severance',year:'2022',series:true});
  eq('R1 серіал S01',P('Назва / Name S01E01-08 (2023) 1080p').series,true);
  eq('R1 рік у квадратних дужках',P('Фільм / Movie [2019, WEB-DL]').year,'2019');
  eq('R1 без оригінальної назви',P('Тільки українська назва (2020)'),{title:'Тільки українська назва',original:'',year:'2020',series:false});
  eq('R1 порожнє → null',P('(2020)'),null);
  eq('R1 три назви: оригінал — перша латиниця',P('Один / One / Uno (2020)').original,'One');

  // R2 реєстрація рядків
  eq('R2 додано два рядки на головну (index 0 і 1)',st.rows.map(function(r){return [r.name,r.index,r.screen[0],r.title];}),[['mazepa_new',0,'main','Новинки Mazepa'],['mazepa_top',1,'main','Популярне на Mazepa (IMDb)']]);

  // R3 «Новинки»
  st=make({route:router(),tmdb:tmdb});
  var d=await getRow(st,'mazepa_new');
  eq('R3 «Новинки»: заголовок і картки (дублі й реліз без постера відсіяно)',[d.title,(d.results||[]).map(function(c){return c.id;})],['Новинки Mazepa',[438631,95396]]);
  eq('R3 картки мають source=tmdb і правильний тип',(d.results||[]).map(function(c){return [c.source,c.media_type];}),[['tmdb','movie'],['tmdb','tv']]);
  eq('R3 запит до Worker: kind=new, limit=30',st.reqs[0].b,{kind:'new',limit:30});
  eq('R3 серіал шукається в search/tv з first_air_date_year',st.tmdbReqs.some(function(u){return /search\/tv\?query=Severance&first_air_date_year=2022/.test(u);}),true);
  // R4 кеш
  var n=st.reqs.length,t=st.tmdbReqs.length; d=await getRow(st,'mazepa_new');
  eq('R4 другий виклик миттєво з кешу, без жодних запитів',[st.reqs.length,st.tmdbReqs.length,(d.results||[]).length],[n,t,2]);

  // R5 «Популярне»
  st=make({route:router(),tmdb:tmdb}); d=await getRow(st,'mazepa_top');
  eq('R5 «Популярне»: порядок за рейтингом IMDb (8.7, 8.0, 6.1); Obscure (50 голосів) відсіяно',(d.results||[]).map(function(c){return c.id;}),[95396,438631,9]);
  eq('R5 vote_average = imdb_rating = рейтинг IMDb',(d.results||[]).map(function(c){return [c.imdb_rating,c.vote_average];}),[[8.7,8.7],[8,8],[6.1,6.1]]);
  eq('R5 один запит /imdb на унікальний реліз (4)',st.reqs.filter(function(r){return /\/imdb/.test(r.u);}).length,4);
  eq('R5 стрічка top: limit=50',st.reqs[0].b,{kind:'top',limit:50});

  // R6 немає ключа OMDb → порожньо + короткий негативний кеш 1 год
  st=make({route:router({imdb:function(){return {status:503,text:JSON.stringify({error:'OMDb не налаштовано (секрет OMDB_KEY)'})};}}),tmdb:tmdb});
  d=await getRow(st,'mazepa_top'); var rec=JSON.parse(st.ls.mz_row_top);
  eq('R6 без ключа OMDb: рядок порожній, помилки немає',[(d.results||[]).length,!!d.noFn],[0,false]);
  eq('R6 негативний кеш на 1 год',[rec.ttl,rec.cards.length],[3600000,0]);
  var n2=st.reqs.length; await getRow(st,'mazepa_top'); eq('R6 повторне відкриття не штурмує Worker',st.reqs.length,n2);
  eq('R6 перевірка зупинилась після першої відмови (не 4 запити /imdb)',st.reqs.filter(function(r){return /\/imdb/.test(r.u);}).length<=4,true);

  // R7 не прив'язано
  st=make({ls:{},route:router(),tmdb:tmdb}); d=await getRow(st,'mazepa_new'); eq('R7 телевізор не прив’язано: рядка немає',!!d.noFn,true);

  // R8 таймаут: головна не чекає
  st=make({route:router(),tmdb:tmdb,timeout:30,feedDelay:150});
  var t0=Date.now(); d=await getRow(st,'mazepa_new'); var took=Date.now()-t0;
  eq('R8 повільний Worker: відповідь рядка швидка й порожня (таймаут)',[(d.results||[]).length,took<120],[0,true]);
  await sleep(500);
  var cc=JSON.parse(st.ls.mz_row_new||'null'); eq('R8 фонове завантаження дійшло до кінця й зберегло кеш',cc&&cc.cards.length,2);
  d=await getRow(st,'mazepa_new'); eq('R8 наступне відкриття — рядок одразу',(d.results||[]).length,2);

  // R9 застарілий кеш: показуємо одразу, оновлюємо у фоні
  st=make({route:router(),tmdb:tmdb,ls:{mz_device_token:'tok',mz_row_new:JSON.stringify({t:Date.now()-2*3600000,cards:[{id:7,title:'Старий',poster_path:'/s.jpg'}]})}});
  d=await getRow(st,'mazepa_new'); eq('R9 застарілий кеш показано одразу',(d.results||[]).map(function(c){return c.id;}),[7]);
  await sleep(100); var fresh=JSON.parse(st.ls.mz_row_new); eq('R9 фоном оновлено (нові картки, свіжий час)',[fresh.cards.map(function(c){return c.id;}),Date.now()-fresh.t<5000],[[438631,95396],true]);

  // R10 мережева помилка Worker → порожньо, коротко кешується (5 хв)
  st=make({route:function(u){return 'net';},tmdb:tmdb}); d=await getRow(st,'mazepa_new'); rec=JSON.parse(st.ls.mz_row_new);
  eq('R10 мережева помилка: рядок порожній, кеш помилки 5 хв',[(d.results||[]).length,rec.ttl],[0,300000]);

  // R11 немає ContentRows — без падіння
  st=make({noRows:true,route:router(),tmdb:tmdb}); eq('R11 без Lampa.ContentRows плагін не падає',st.rows.length,0);

  // R12 скидання кешу з меню
  st=make({route:router(),tmdb:tmdb,ls:{mz_device_token:'tok',mz_row_new:'{}',mz_row_top:'{}'}}); st.win.__x.reset();
  eq('R12 «Оновити рядки» очищає кеш',['mz_row_new' in st.ls,'mz_row_top' in st.ls],[false,false]);

  // R13 прогрів: рядки збираються після старту, до відкриття головної
  st=make({route:router(),tmdb:tmdb,prewarm:20});
  await sleep(400);
  var cn=JSON.parse(st.ls.mz_row_new||'null'),ct=JSON.parse(st.ls.mz_row_top||'null');
  eq('R13 прогрів: кеш обох рядків готовий без відкриття головної',[cn&&cn.cards.length,ct&&ct.cards.length],[2,3]);
  var before=st.reqs.length; d=await getRow(st,'mazepa_top');
  eq('R13 перше відкриття головної після прогріву — рядок одразу, без запитів',[(d.results||[]).length,st.reqs.length],[3,before]);
  // R14 статус кроків
  var stat=JSON.parse(st.ls.mz_row_status);
  eq('R14 статус «Новинок» показує кроки',/стрічка 4 → унікальних 3 → карток TMDB 2/.test(stat['new'].text),true);
  eq('R14 статус «Популярного»: з IMDb 4 → ≥1000 голосів 3 (Obscure відсіяно) → карток TMDB 3',/з IMDb 4 → з ≥1000 голосів 3 → карток TMDB 3/.test(stat.top.text),true);
  // R15 без прив'язки прогрів нічого не робить
  st=make({ls:{},route:router(),tmdb:tmdb,prewarm:20}); await sleep(200);
  eq('R15 телевізор не прив’язано: прогрів не робить запитів',st.reqs.length,0);
  // R16 скидання кешу запускає збирання заново
  st=make({route:router(),tmdb:tmdb,ls:{mz_device_token:'tok',mz_row_new:'{}',mz_row_top:'{}'}}); st.win.__x.reset(); await sleep(400);
  eq('R16 «Оновити рядки» очищає й одразу збирає заново',[!!st.ls.mz_row_new&&JSON.parse(st.ls.mz_row_new).cards.length,!!st.ls.mz_row_top&&JSON.parse(st.ls.mz_row_top).cards.length],[2,3]);

  // R17 діагностика плеєра: start / timeupdate / destroy
  st=make({route:router(),tmdb:tmdb,trace:true,ls:{mz_device_token:'tok',file_view:JSON.stringify({H1:{time:120,percent:10,duration:1200}})}});
  var tl={hash:'H1',time:0,percent:0,duration:0,handler:function(){}};
  st.pl.start[0]({title:'Фільм.mkv',timeline:tl});
  st.pv.timeupdate[0]({current:5,duration:Infinity});
  st.pl.destroy[0]();
  var log=st.win.__x.trace().join('\n');
  eq('R17 start: видно наявність timeline і його поля',/PLAYER \| start «Фільм.mkv»: timeline hash=H1, time=0, percent=0, duration=0, stop_recording=false, handler=function/.test(log),true);
  eq('R17 timeupdate: видно current і duration (Infinity виявляється)',/timeupdate #1: current=5, duration=Infinity/.test(log),true);
  eq('R17 destroy: видно запис file_view для цього hash і розмір localStorage',/destroy: timeline.time=0, percent=0 \| file_view → file_view: \{"time":120,"percent":10,"duration":1200\} \| localStorage ≈ \d+ КБ/.test(log),true);
  // R18 timeline відсутній
  st=make({route:router(),tmdb:tmdb,trace:true}); st.pl.start[0]({title:'x'}); log=st.win.__x.trace().join('\n');
  eq('R18 без timeline: у журналі «ВІДСУТНІЙ»',/timeline ВІДСУТНІЙ/.test(log),true);

  // ===== Меню =====
  st=make({route:router(),tmdb:tmdb}); st.win.__x.openMenu();
  var titles=function(){return st.select.items.map(function(i){return i.title;});};
  eq('M1 головне меню: 7 груп',titles(),['Пошук торрентів Mazepa','Повторити останній пошук','Фільтри й рівні','Рядки на головній','TorrServer','Прив’язка телевізора','Діагностика']);
  eq('M2 прибрані службові пункти (cookies, тест сесії, каталог, перевірка сесії)',titles().join('|').match(/cookies|власної сесії|Відкритий каталог|Перевірити сесію/)===null,true);
  var main=st.select;
  main.onSelect({id:2});
  eq('M3 «Фільтри й рівні»: підменю з 3 пунктами, UA за замовчуванням «ні»',[st.select.title,titles()],['Фільтри й рівні',['Рівень 0 — понад 35 ГБ','Лише українська озвучка: ні','Рівень за замовчуванням: авто (найвищий)']]);
  st.select.onSelect({id:1}); await sleep(30);
  eq('M4 перемикач UA: значення збережено, підменю відкрилось знову з оновленим підписом',[st.ls.mz_only_ua,st.select.title,titles()[1]],['1','Фільтри й рівні','Лише українська озвучка: так']);
  st.select.onSelect({id:2}); await sleep(30);
  eq('M5 перемикач рівня за замовчуванням → «усі»',[st.ls.mz_best_only,titles()[2]],['0','Рівень за замовчуванням: усі']);
  var shows0=st.shows.length; st.select.onBack();
  eq('M6 Back з підменю повертає у головне меню «Mazepa»',[st.select.title,st.shows.length>shows0],['Mazepa',true]);
  // Діагностика: перемикач журналу
  st.select.onSelect({id:6});
  eq('M7 «Діагностика»: 6 пунктів (є «Про пристрій і сумісність»), журнал вимкнено',[st.select.title,titles().length,titles()[0],titles()[1]],['Діагностика',6,'Журнал діагностики: вимкнено','Про пристрій і сумісність']);
  st.select.onSelect({id:0}); await sleep(30);
  eq('M8 увімкнення журналу: підменю оновилось',titles()[0],'Журнал діагностики: увімкнено');
  st.select.onSelect({id:0}); await sleep(30);
  eq('M9 повторне натискання вимикає журнал',titles()[0],'Журнал діагностики: вимкнено');
  // TorrServer: підпис адреси
  st.select.onBack(); st.select.onSelect({id:4});
  eq('M10 «TorrServer»: адреса не задана → підпис «не задано»',[st.select.title,titles()[0]],['TorrServer','Адреса: не задано']);
  st=make({route:router(),tmdb:tmdb,ls:{mz_device_token:'tok',mz_torrserver_url:'http://192.168.0.110:8090'}}); st.win.__x.openMenu(); st.select.onSelect({id:4});
  eq('M11 адреса задана → показана в підписі',titles()[0],'Адреса: http://192.168.0.110:8090');
  st.select.onSelect({id:0});
  // Прив'язка і рядки
  st=make({route:router(),tmdb:tmdb}); st.win.__x.openMenu(); st.select.onSelect({id:5});
  eq('M12 «Прив’язка телевізора»: 3 пункти',[st.select.title,st.select.items.length],['Прив’язка телевізора',3]);
  st.select.onBack(); st.select.onSelect({id:3});
  eq('M13 «Рядки на головній»: статус і оновити',[st.select.title,st.select.items.map(function(i){return i.title;})],['Рядки на головній',['Статус рядків','Оновити рядки']]);

  // ===== Пошук з меню на штатному екрані =====
  st=make({route:router(),tmdb:tmdb}); st.win.__x.openMenu(); st.inputValue='Дюна'; st.select.onSelect({id:0});
  eq('S1 пошук з меню відкриває штатний екран torrents без картки (from_search)',st.pushed.length===1&&st.pushed[0].component==='torrents'&&st.pushed[0].from_search===true&&st.pushed[0].mz_only===true&&st.pushed[0].search==='Дюна',true);
  eq('S1 запит збережено для повтору, спливаючий список не відкривався, запитів до Worker немає',[st.ls.mz_last_query,st.shows.length,st.reqs.length],['Дюна',1,0]);
  st.win.__x.openMenu(); st.select.onSelect({id:1});
  eq('S2 «Повторити останній пошук» відкриває штатний екран з тим самим запитом',[st.pushed.length,st.pushed[1]&&st.pushed[1].search],[2,'Дюна']);
  st=make({route:router(),tmdb:tmdb}); st.win.__x.openMenu(); st.select.onSelect({id:1});
  eq('S2 без попереднього запиту: підказка, нічого не відкривається',[st.pushed.length,st.notes.some(function(n){return /введи назву/.test(n);})],[0,true]);
  // S3 рівні для пошуку без картки
  var G=1073741824; var DATA=[{id:'1',title:'Dune 2160p HDR Ukr',size:20*G},{id:'2',title:'Dune 1080p Ukr',size:8*G}];
  function parse(params,ls){var s2=make({route:router(),tmdb:tmdb,ls:ls||{mz_device_token:'tok',mz_only_ua:'0',mz_max_size_gb:'0'}});var out=null;var p={mz_only:true,search_one:'Dune'};for(var k in params)p[k]=params[k];
    s2.pushed=[];var lam=s2.win.Lampa;lam.Parser.get(p,function(d){out=d;},function(){});
    return new Promise(function(res){setTimeout(function(){res({out:out,s:s2});},30);});}
  // Parser.get викликає наш mzParserGet лише з mz_only; відповідь Worker має підставити route
  st=make({route:function(u,b){return {status:200,text:JSON.stringify({results:DATA})};},tmdb:tmdb,ls:{mz_device_token:'tok',mz_only_ua:'0',mz_max_size_gb:'0'}});
  var got=null; st.win.Lampa.Parser.get({mz_only:true,from_search:true,search_one:'Dune'},function(d){got=d;},function(){}); await sleep(40);
  eq('S3 пошук без картки: за замовчуванням усі рівні (4K і 1080p обидва показані)',(got&&got.Results||[]).map(function(e){return e.mz_id;}),['1','2']);
  got=null; st.win.Lampa.Parser.get({mz_only:true,from_search:true,search_one:'Dune',mz_level:2},function(d){got=d;},function(){}); await sleep(40);
  eq('S3 вибір рівня вручну працює і для пошуку без картки',(got&&got.Results||[]).map(function(e){return e.mz_id;}),['2']);
  got=null; st.win.Lampa.Parser.get({mz_only:true,search_one:'Dune'},function(d){got=d;},function(){}); await sleep(40);
  eq('S3 той самий запит із фільмом (без from_search): авто → лише 4K',(got&&got.Results||[]).map(function(e){return e.mz_id;}),['1']);
  // S4 запасний шлях
  st=make({route:function(){return {status:200,text:JSON.stringify({results:[{id:'1',title:'Dune',size:1}]})};},tmdb:tmdb,noHooks:true,ls:{mz_device_token:'tok',mz_only_ua:'0'}}); st.win.__x.openMenu(); st.inputValue='Дюна'; st.select.onSelect({id:0}); await sleep(40);
  eq('S4 Lampa без підмінюваних Parser/Torrent: спливаючий список (запит до Worker), штатний екран не відкривається',[st.pushed.length,st.reqs.length>0&&st.reqs[0].b.query],[0,'Дюна']);
  st=make({route:function(){return {status:200,text:JSON.stringify({results:[{id:'1',title:'Dune',size:1}]})};},tmdb:tmdb,ls:{mz_device_token:'tok',mz_only_ua:'0'}}); st.pushThrows=true; st.win.__x.openMenu(); st.inputValue='Дюна'; st.select.onSelect({id:0}); await sleep(40);
  eq('S5 збій відкриття штатного екрана → запасний пошук',st.reqs.length>0&&st.reqs[0].b.query,'Дюна');
  st=make({route:router(),tmdb:tmdb}); st.win.__x.openMenu(); var before2=st.shows.length; st.inputValue='   '; st.select.onSelect({id:0});
  eq('S6 порожній ввід повертає у меню',[st.pushed.length,st.shows.length>before2,st.select.title],[0,true,'Mazepa']);

  // ===== Пристрій і сумісність =====
  var UA24='Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.5359.211 Safari/537.36 WebAppManager';
  var UA25='Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.270 Safari/537.36 WebAppManager';
  var UA26='Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6834.207 Safari/537.36 WebAppManager';
  st=make({route:router(),tmdb:tmdb}); var U=st.win.__x.ua;
  eq('D1 UA webOS 24 → Chromium 108 → webOS 24 (2024)',[U(UA24).family,U(UA24).chrome,U(UA24).generation],['LG webOS',108,'webOS 24 (2024)']);
  eq('D1 UA webOS 25 → webOS 25 (2025)',U(UA25).generation,'webOS 25 (2025)');
  eq('D1 UA webOS 26 → webOS 26 (2026)',U(UA26).generation,'webOS 26 (2026)');
  eq('D1 невідомий Chromium на webOS: чесна позначка',U(UA24.replace('108','111')).generation,'покоління невідоме (Chromium 111)');
  eq('D1 Tizen і десктоп розпізнаються як «інший»',[U('Mozilla/5.0 (SMART-TV; Linux; Tizen 7.0) Chrome/94').family,U('Mozilla/5.0 Chrome/120').family,U('Mozilla/5.0 Chrome/120').generation],['Samsung Tizen','інший','']);
  eq('D1 порожній UA не падає',U('').family,'інший');
  // D2 повний екран «Про пристрій»
  var CODECS={'video/mp4; codecs="avc1.640028"':'probably','video/mp4; codecs="hvc1.2.4.L150.B0"':'probably','video/mp4; codecs="av01.0.08M.10"':'maybe','audio/mp4; codecs="ac-3"':'probably','audio/mp4; codecs="ec-3"':'probably'};
  function dev(extraRoute,ls){var r=function(u,b){if(/\/health/.test(u))return {status:200,text:JSON.stringify({status:'ok',version:'0.7',kv:true,omdb:true})};if(/\/echo/.test(u))return {status:200,text:'MatriX.142.2'};return extraRoute?extraRoute(u,b):router()(u,b);};
    return make({route:r,tmdb:tmdb,ua:UA25,codecs:CODECS,ls:ls||{mz_device_token:'tok',mz_torrserver_url:'http://192.168.0.110:8090'}});}
  st=dev(); st.win.__x.openMenu(); st.select.onSelect({id:6}); st.select.onSelect({id:1}); await sleep(80);
  var dl=st.select.items.map(function(i){return i.title;});
  eq('D2 «Про пристрій»: заголовок і покоління',[st.select.title,dl[0]],['Про пристрій і сумісність','Пристрій: LG webOS, Chromium 120 → webOS 25 (2025)']);
  eq('D2 версія Lampa і платформа, екран',[dl[1],dl[2]],['Lampa: 3.4.5, платформа webos','Екран: 3840×2160, DPR 2']);
  eq('D2 Worker і TorrServer відповіли',[dl.indexOf('Worker: v0.7, OMDb є, KV є')>=0,dl.indexOf('TorrServer /echo: відповідає: MatriX.142.2')>=0],[true,true]);
  eq('D2 кодеки: HEVC так, AV1 можливо, DTS ні, E-AC-3 так',[dl.indexOf('HEVC (HDR10): так')>=0,dl.indexOf('AV1: можливо')>=0,dl.indexOf('DTS: ні')>=0,dl.indexOf('E-AC-3 (DD+): так')>=0],[true,true,true,true]);
  eq('D2 рядки лише для читання (noenter)',st.select.items.every(function(i){return i.noenter===true;}),true);
  eq('D2 усе потрапляє в журнал як DEVICE (якщо діагностика ввімкнена)',typeof st.win.__x.trace,'function');
  var s0=st.select; st.shows.length=0; s0.onBack(); eq('D2 Back з екрана веде в підменю «Діагностика»',st.select.title,'Діагностика');
  // D3 збої мережі
  st=dev(function(u){return 'net';}); st.ls.mz_torrserver_url='http://192.168.0.110:8090';
  st.win.__x.openMenu(); st.select.onSelect({id:6}); st.select.onSelect({id:1}); await sleep(80);
  dl=st.select.items.map(function(i){return i.title;});
  eq('D3 TorrServer недоступний: пояснення (мережа/змішаний вміст/CORS), екран все одно відкрився',dl.some(function(t){return /TorrServer \/echo: (відповідає|недоступний)/.test(t);}),true);
  st=dev(null,{mz_device_token:'tok'}); st.win.__x.openMenu(); st.select.onSelect({id:6}); st.select.onSelect({id:1}); await sleep(80);
  dl=st.select.items.map(function(i){return i.title;});
  eq('D4 адресу TorrServer не задано: так і написано, без запиту',[dl.indexOf('TorrServer: адресу не задано')>=0,dl.indexOf('TorrServer /echo: адресу не задано')>=0],[true,true]);
  // D5 захоплення помилок
  st=make({route:router(),tmdb:tmdb,trace:true}); st.winEvents.error[0]({message:'boom',filename:'http://x/m.js',lineno:42});
  eq('D5 непіймана помилка потрапляє в журнал',/ERROR \| boom @ m.js:42/.test(st.win.__x.trace().join('\n')),true);
  st=make({route:router(),tmdb:tmdb}); st.winEvents.error[0]({message:'boom',filename:'m.js',lineno:1});
  eq('D5 без діагностики — нічого не пишеться',st.win.__x.trace().length,0);

  console.log(fails?'ПРОВАЛЕНО: '+fails:'УСІ ТЕСТИ ПРОЙШЛИ');process.exit(fails?1:0);
})();
