import worker from '../worker/src/worker.js';
const kv=new Map();
const env={MZ_ADMIN_KEY:'test-admin',MZ_SESSIONS:{
  async get(k,t){const v=kv.get(k);if(v===undefined)return null;return t==='json'?JSON.parse(v):v;},
  async put(k,v){kv.set(k,v);},async delete(k){kv.delete(k);}}};
const rows=`
<table>
<tr id="tor_101" class="x"><td><a class="gen" href="tracker.php?f=22">Фільми</a></td>
 <td><a class="genmed" href="./viewtopic.php?t=101"><b>Дюна / Dune (2021) 2160p HDR</b> UKR</a></td>
 <td><a href="./dl.php?id=101"><span>46,5&nbsp;GB</span></a></td>
 <td class="seedmed"><b>15</b></td><td class="leechmed"><b>3</b></td><td>Сьогодні 06:40 4-Лис-23</td></tr>
<tr id="tor_102"><td><a class="gen" href="tracker.php?f=22">Фільми</a></td>
 <td><a class="seedmed" href="./viewtopic.php?t=102">Dune Part Two (2024) 1080p</a></td>
 <td><a href="./dl.php?id=102">12.3 ГБ</a></td>
 <td class="seedmed">0</td><td class="leechmed">1</td><td>11:51 31-Жов-23</td></tr>
<tr id="tor_103"><td><a class="leechmed" href="./viewtopic.php?t=103">Без полів</a></td><td><a href="./dl.php?id=103">?</a></td></tr>
</table>`;
let searchBody=null;let trackerBodies=[];let omdbUrls=[];let omdbMode='ok';
globalThis.fetch=async(url,opt={})=>{
  url=String(url);
  if(url.endsWith('login.php')&&(!opt.method||opt.method==='GET'))return new Response('',{status:200,headers:{'set-cookie':'sid=1; path=/'}});
  if(url.endsWith('login.php'))return new Response('',{status:302,headers:{'set-cookie':'auth=2; path=/'}});
  if(url.endsWith('index.php'))return new Response('<a href="login.php?logout=1">x</a>',{status:200});
  if(url.endsWith('tracker.php')){searchBody=opt.body;trackerBodies.push(String(opt.body));return new Response('<html>'+rows+'</html>',{status:200});}
  if(url.startsWith('https://www.omdbapi.com/')){omdbUrls.push(url);
    const u=new URL(url);const t=u.searchParams.get('t');
    if(omdbMode==='limit')return new Response(JSON.stringify({Response:'False',Error:'Request limit reached!'}),{status:200});
    if(t==='Dune'&&u.searchParams.get('y')==='2021')return new Response(JSON.stringify({Response:'True',imdbID:'tt1160419',imdbRating:'8.0',imdbVotes:'1,234,567',Title:'Dune'}),{status:200});
    if(t==='Severance')return new Response(JSON.stringify({Response:'True',imdbID:'tt11280740',imdbRating:'8.7',imdbVotes:'450,000'}),{status:200});
    return new Response(JSON.stringify({Response:'False',Error:'Movie not found!'}),{status:200});}
  return new Response('?',{status:404});
};
const call=async(path,body,h={})=>{const r=await worker.fetch(new Request('https://w.test'+path,{method:'POST',headers:{'Content-Type':'application/json',...h},body:JSON.stringify(body)}),env);return {s:r.status,j:await r.json().catch(()=>null)};};
let fails=0;const eq=(n,a,b)=>{const ok=JSON.stringify(a)===JSON.stringify(b);if(!ok)fails++;console.log((ok?'OK   ':'FAIL ')+n+' -> '+JSON.stringify(a)+(ok?'':'  (очікувалось '+JSON.stringify(b)+')'));};
const st=await call('/pair/start',{});
const conf=await call('/pair/confirm',{code:st.j.code},{'X-Admin-Key':'test-admin'});
const ps=await call('/pair/status',{device_secret:st.j.device_secret});
const token=ps.j.token;
const login=await call('/mazepa/login',{username:'u',password:'p'},{'X-Admin-Key':'test-admin'});
eq('логін Mazepa',login.s,200);
const r=await call('/mazepa/search',{query:'dune'},{Authorization:'Bearer '+token});
eq('пошук 200',r.s,200);
eq('кількість результатів',r.j.results.length,3);
eq('реліз 1: розмір 46,5 GB, сіди, піри, дата',r.j.results[0],{id:'101',title:'Дюна / Dune (2021) 2160p HDR UKR',size:Math.round(46.5*1024**3),seeders:15,leechers:3,date:'2023-11-04T06:40:00'});
eq('реліз 2: ГБ, 0 сідів, дата',r.j.results[1],{id:'102',title:'Dune Part Two (2024) 1080p',size:Math.round(12.3*1024**3),seeders:0,leechers:1,date:'2023-10-31T11:51:00'});
eq('реліз 3 без полів — не ламається',r.j.results[2],{id:'103',title:'Без полів',size:0,seeders:0,leechers:0,date:''});
eq('без debug немає debug_row',('debug_row' in r.j),false);
const d=await call('/mazepa/search',{query:'dune',debug:true},{Authorization:'Bearer '+token});
eq('з debug:true є debug_row',typeof d.j.debug_row,'string');
const noauth=await call('/mazepa/search',{query:'dune'},{});
eq('без токена 401',noauth.s,401);
const h=await (await worker.fetch(new Request('https://w.test/health'),env)).json();
eq('версія Worker',h.version,'0.7');eq('health: omdb false без ключа',h.omdb,false);

// ===== /mazepa/feed =====
const A={Authorization:'Bearer '+token};
const feedNew=await call('/mazepa/feed',{kind:'new',limit:30},A);
eq('Feed new: 200 і 3 релізи',[feedNew.s,feedNew.j.results.length,feedNew.j.kind],[200,3,'new']);
const body1=trackerBodies[trackerBodies.length-1];
const p1=new URLSearchParams(body1);
eq('Feed new: категорії f[] повторюються (27 розділів)',p1.getAll('f[]').length,27);
eq('Feed new: це розділи фільмів/серіалів (є 37 і 175, немає -1)',[p1.getAll('f[]').includes('37'),p1.getAll('f[]').includes('175'),p1.getAll('f[]').includes('-1')],[true,true,false]);
eq('Feed new: сортування за датою (o=1), спадання (s=2), порожній пошук',[p1.get('o'),p1.get('s'),p1.get('nm')],['1','2','']);
const before=trackerBodies.length;
const feedNew2=await call('/mazepa/feed',{kind:'new',limit:30},A);
eq('Feed new: другий запит береться з KV-кешу, Mazepa не чіпається',[feedNew2.j.cached,trackerBodies.length],[true,before]);
const feedTop=await call('/mazepa/feed',{kind:'top',limit:50},A);
const p2=new URLSearchParams(trackerBodies[trackerBodies.length-1]);
eq('Feed top: сортування за сідами (o=10)',[feedTop.s,feedTop.j.kind,p2.get('o')],[200,'top','10']);
eq('Feed без токена 401',(await call('/mazepa/feed',{kind:'new'},{})).s,401);
eq('Feed: limit обмежується 50',(await call('/mazepa/feed',{kind:'new',limit:999},A)).j.results.length<=50,true);

// ===== /imdb =====
let r2=await call('/imdb',{title:'Дюна',original:'Dune',year:'2021'},A);
eq('IMDb без ключа → 503 з поясненням',[r2.s,/OMDB_KEY/.test(r2.j.error)],[503,true]);
const env2={...env,OMDB_KEY:'SECRET-KEY-123'};
const callK=async(path,b,h={})=>{const r=await worker.fetch(new Request('https://w.test'+path,{method:'POST',headers:{'Content-Type':'application/json',...h},body:JSON.stringify(b)}),env2);return {s:r.status,j:await r.json().catch(()=>null),raw:null};};
r2=await callK('/imdb',{title:'Дюна',original:'Dune',year:'2021'},A);
eq('IMDb: знайдено за оригінальною назвою і роком',[r2.s,r2.j.imdb_id,r2.j.rating,r2.j.votes],[200,'tt1160419',8,1234567]);
eq('IMDb: перший запит до OMDb — оригінальна назва, тип movie, рік',[omdbUrls[0].includes('t=Dune'),omdbUrls[0].includes('y=2021'),omdbUrls[0].includes('type=movie')],[true,true,true]);
eq('IMDb: ключ не потрапляє у відповідь',JSON.stringify(r2.j).includes('SECRET-KEY-123'),false);
const n=omdbUrls.length;
r2=await callK('/imdb',{title:'Дюна',original:'Dune',year:'2021'},A);
eq('IMDb: повторний запит із KV-кешу, OMDb не чіпається',[r2.j.cached,omdbUrls.length],[true,n]);
r2=await callK('/imdb',{title:'Розрив',original:'Severance',year:'2022',series:true},A);
eq('IMDb: серіал — type=series',[r2.j.imdb_id,omdbUrls[omdbUrls.length-1].includes('type=series')],['tt11280740',true]);
r2=await callK('/imdb',{title:'Невідомий',original:'Unknown Film',year:'2020'},A);
eq('IMDb: не знайдено → порожній результат (200), не помилка',[r2.s,r2.j.imdb_id,r2.j.rating],[200,'',0]);
omdbMode='limit';
r2=await callK('/imdb',{title:'Інший',original:'Other Movie',year:'2019'},A);
eq('IMDb: ліміт OMDb → 429',r2.s,429);
omdbMode='ok';
eq('IMDb: порожня назва → 400',(await callK('/imdb',{title:'',original:''},A)).s,400);
eq('IMDb без токена → 401',(await callK('/imdb',{title:'x'},{})).s,401);
const h2=await (await worker.fetch(new Request('https://w.test/health'),env2)).json();
eq('health: omdb true з ключем',h2.omdb,true);
console.log(fails?'ПРОВАЛЕНО: '+fails:'УСІ ТЕСТИ WORKER ПРОЙШЛИ');process.exit(fails?1:0);
