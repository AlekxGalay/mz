
const MAZEPA = 'https://mazepa.to/';
const TTL = 30 * 24 * 60 * 60;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store'
};

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json;charset=utf-8'
    }
  });
}

function hex(bytes = 32) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))]
    .map(n => n.toString(16).padStart(2, '0')).join('');
}

async function sha(value) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );
  return [...new Uint8Array(hash)]
    .map(n => n.toString(16).padStart(2, '0')).join('');
}

async function body(request) {
  try { return await request.json(); }
  catch { return {}; }
}

function cookiesFrom(res) {
  const list = res.headers.getSetCookie?.() || [];
  return list.map(x => x.split(';')[0]).filter(x => x.includes('='));
}

function mergeCookies(...sets) {
  const map = new Map();
  for (const set of sets) {
    for (const item of set) {
      const pos = item.indexOf('=');
      if (pos > 0) map.set(item.slice(0, pos), item.slice(pos + 1));
    }
  }
  return [...map].map(([k,v]) => k + '=' + v).join('; ');
}

async function cipherKey(admin) {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(admin)
  );
  return crypto.subtle.importKey(
    'raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']
  );
}

async function seal(text, admin) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    {name:'AES-GCM', iv},
    await cipherKey(admin),
    new TextEncoder().encode(text)
  );
  return JSON.stringify({
    iv:[...iv],
    ct:[...new Uint8Array(encrypted)]
  });
}

async function unseal(text, admin) {
  const {iv, ct} = JSON.parse(text);
  const decrypted = await crypto.subtle.decrypt(
    {name:'AES-GCM', iv:new Uint8Array(iv)},
    await cipherKey(admin),
    new Uint8Array(ct)
  );
  return new TextDecoder().decode(decrypted);
}

async function authenticated(env, request) {
  const token = (request.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '');
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  return !!(await env.MZ_SESSIONS.get('token:' + await sha(token)));
}

async function fetchMazepa(path, cookie, options = {}) {
  return fetch(MAZEPA + path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Cookie:cookie,
      'User-Agent':'Mozilla/5.0'
    },
    redirect:'manual'
  });
}

function pairPage() {
  const html = `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mazepa Worker</title>
<style>
body{background:#121820;color:#fff;font:17px system-ui;
display:grid;place-items:center;min-height:100vh;margin:0}
main{width:min(420px,90vw);background:#222c39;
padding:25px;border-radius:16px}
label{display:block;margin-top:15px}
input{display:block;box-sizing:border-box;width:100%;
padding:13px;margin-top:6px;border-radius:8px;border:0;font-size:17px}
button{padding:13px;width:100%;margin-top:20px;
border-radius:8px;border:0;font-size:17px;background:#6aa5ff}
#status{min-height:20px;margin-top:15px;line-height:1.5}
p{font-size:14px;color:#bec9d7}
</style>
</head>
<body>
<main>
<h1>Mazepa Worker</h1>
<p>Прив'язка телевізора та авторизація Mazepa.to</p>
<form id="pair">
<h3>Підтвердити телевізор</h3>
<label>Код із Lampa<input id="code" pattern="[0-9]{6}"
maxlength="6" required></label>
<label>Адміністративний секрет
<input id="pairkey" type="password" required></label>
<button>Підтвердити</button>
</form>
<form id="login">
<h3>Увійти на Mazepa.to</h3>
<label>Логін Mazepa
<input id="username" autocomplete="username" required></label>
<label>Пароль Mazepa
<input id="password" type="password"
autocomplete="current-password" required></label>
<label>Адміністративний секрет
<input id="loginkey" type="password" required></label>
<button>Увійти через Worker</button>
</form>
<div id="status" role="status"></div>
<p>Пароль не зберігається в KV. Cookie-сесія
зберігається зашифрованою.</p>
</main>
<script>
const st=document.getElementById('status');
async function send(path,data,key){
  st.textContent='Виконується…';
  try{
    const r=await fetch(path,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-Admin-Key':key
      },
      body:JSON.stringify(data)
    });
    const j=await r.json();
    st.textContent=r.ok
      ? 'Успішно: '+(j.message||j.status)
      : 'Помилка: '+(j.error||r.status);
    if(r.ok)document.getElementById('password').value='';
  }catch(e){st.textContent='Помилка мережі';}
}
document.getElementById('pair').onsubmit=e=>{
  e.preventDefault();
  send('/pair/confirm',
    {code:document.getElementById('code').value},
    document.getElementById('pairkey').value);
};
document.getElementById('login').onsubmit=e=>{
  e.preventDefault();
  send('/mazepa/login',{
    username:document.getElementById('username').value,
    password:document.getElementById('password').value
  },document.getElementById('loginkey').value);
};
</script>
</body>
</html>`;

  return new Response(html, {
    headers:{
      'Content-Type':'text/html;charset=utf-8',
      'Cache-Control':'no-store',
      'Referrer-Policy':'no-referrer',
      'X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; " +
        "script-src 'unsafe-inline'; connect-src 'self'; " +
        "form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, {status:204, headers:CORS});
    }

    if (path === '/health') {
      return response({
        status:'ok',
        service:'mz-api',
        version:'0.5',
        kv:!!env.MZ_SESSIONS,
        admin_secret:!!env.MZ_ADMIN_KEY
      });
    }

    if (path === '/pair' && request.method === 'GET') {
      return pairPage();
    }

    if (path === '/test') {
      try {
        const r = await fetch(MAZEPA + 'login.php', {
          redirect:'manual'
        });
        return response({status:'ok', mazepa_http:r.status});
      } catch {
        return response({error:'Mazepa unreachable'}, 502);
      }
    }

    if (!env.MZ_SESSIONS || !env.MZ_ADMIN_KEY) {
      return response({error:'Worker configuration missing'}, 503);
    }

    const admin = request.headers.get('X-Admin-Key') || '';

    if (path === '/pair/start' && request.method === 'POST') {
      const secret = hex();
      const deviceKey = await sha(secret);
      let code;

      for (let i = 0; i < 20; i++) {
        const n = crypto.getRandomValues(new Uint32Array(1))[0];
        const candidate = String(n % 1000000).padStart(6, '0');

        if (!await env.MZ_SESSIONS.get('code:' + candidate)) {
          code = candidate;
          break;
        }
      }

      if (!code) return response({error:'Code generation failed'},503);

      await env.MZ_SESSIONS.put(
        'code:' + code,
        JSON.stringify({deviceKey}),
        {expirationTtl:300}
      );

      await env.MZ_SESSIONS.put(
        'device:' + deviceKey,
        JSON.stringify({status:'pending'}),
        {expirationTtl:300}
      );

      return response({
        code,
        device_secret:secret,
        expires_in:300
      });
    }

    if (path === '/pair/confirm' && request.method === 'POST') {
      if (!admin || admin !== env.MZ_ADMIN_KEY) {
        return response({error:'Неправильний секрет'},401);
      }

      const data = await body(request);
      const code = String(data.code || '');

      if (!/^\d{6}$/.test(code)) {
        return response({error:'Некоректний код'},400);
      }

      const entry = await env.MZ_SESSIONS.get('code:' + code,'json');

      if (!entry) {
        return response({error:'Код не знайдено або прострочений'},404);
      }

      const token = hex();

      await env.MZ_SESSIONS.put(
        'token:' + await sha(token),
        JSON.stringify({created:Date.now()}),
        {expirationTtl:TTL}
      );

      await env.MZ_SESSIONS.put(
        'device:' + entry.deviceKey,
        JSON.stringify({status:'approved',token}),
        {expirationTtl:300}
      );

      await env.MZ_SESSIONS.delete('code:' + code);

      return response({
        status:'approved',
        message:'Телевізор підтверджено'
      });
    }

    if (path === '/pair/status' && request.method === 'POST') {
      const data = await body(request);
      const secret = String(data.device_secret || '');

      if (!/^[a-f0-9]{64}$/.test(secret)) {
        return response({error:'Invalid secret'},400);
      }

      const key = await sha(secret);
      const state = await env.MZ_SESSIONS.get('device:' + key,'json');

      if (!state) return response({status:'expired'});

      if (state.status === 'approved') {
        await env.MZ_SESSIONS.delete('device:' + key);
        return response({status:'approved',token:state.token});
      }

      return response({status:'pending'});
    }

    if (path === '/auth/check') {
      return response({
        authorized:await authenticated(env,request)
      });
    }

    if (path === '/mazepa/login' && request.method === 'POST') {
      if (!admin || admin !== env.MZ_ADMIN_KEY) {
        return response({error:'Неправильний ключ'},401);
      }

      const data = await body(request);
      const username = String(data.username || '');
      const password = String(data.password || '');

      if (!username || !password ||
          username.length > 128 || password.length > 256) {
        return response({error:'Некоректний логін або пароль'},400);
      }

      try {
        const first = await fetch(MAZEPA + 'login.php', {
          redirect:'manual'
        });

        const initial = cookiesFrom(first);

        const form = new URLSearchParams({
          login_username:username,
          login_password:password,
          autologin:'1',
          login:'Увійти'
        });

        const logged = await fetch(MAZEPA + 'login.php', {
          method:'POST',
          headers:{
            'Content-Type':'application/x-www-form-urlencoded',
            Cookie:mergeCookies(initial)
          },
          body:form.toString(),
          redirect:'manual'
        });

        const cookie = mergeCookies(initial,cookiesFrom(logged));

        if (!cookie) {
          return response({error:'Mazepa не видала cookie'},502);
        }

        const check = await fetchMazepa('index.php',cookie);
        const html = await check.text();

        if (!/login\.php\?logout(?:=1)?|logout=1/i.test(html)) {
          return response({
            error:'Авторизацію Mazepa не підтверджено',
            login_http:logged.status,
            check_http:check.status
          },401);
        }

        await env.MZ_SESSIONS.put(
          'mazepa:session',
          await seal(cookie,env.MZ_ADMIN_KEY),
          {expirationTtl:TTL}
        );

        return response({
          status:'ok',
          message:'Авторизацію Mazepa підтверджено'
        });
      } catch {
        return response({error:'Помилка входу Mazepa'},502);
      }
    }

    // AUTHORIZED TORRENT DOWNLOAD
    if (path === '/mazepa/torrent' && request.method === 'POST') {
      if (!await authenticated(env,request)) {
        return response({error:'Телевізор не авторизований'},401);
      }

      const saved = await env.MZ_SESSIONS.get('mazepa:session');

      if (!saved) {
        return response({error:'Сесія Mazepa відсутня'},409);
      }

      const data = await body(request);
      const id = String(data.id || '');

      if (!/^\d{1,12}$/.test(id)) {
        return response({error:'Некоректний ID релізу'},400);
      }

      try {
        const cookie = await unseal(saved,env.MZ_ADMIN_KEY);
        const upstream = await fetchMazepa(
          'dl.php?id=' + encodeURIComponent(id),
          cookie
        );

        if (upstream.status !== 200) {
          return response({
            error:'Mazepa не віддала torrent-файл',
            http:upstream.status
          },502);
        }

        const bytes = await upstream.arrayBuffer();

        if (bytes.byteLength < 20 ||
            bytes.byteLength > 5 * 1024 * 1024) {
          return response({
            error:'Некоректний розмір torrent-файлу'
          },502);
        }

        const raw = new Uint8Array(bytes);

        if (raw[0] !== 100 || raw[raw.length - 1] !== 101) {
          return response({
            error:'Mazepa повернула не .torrent. Перевір сесію'
          },502);
        }

        return new Response(bytes, {
          status:200,
          headers:{
            ...CORS,
            'Content-Type':'application/x-bittorrent',
            'Content-Disposition':
              'attachment; filename="mazepa-' + id + '.torrent"'
          }
        });
      } catch {
        return response({
          error:'Помилка отримання torrent-файлу'
        },502);
      }
    }

    // AUTHORIZED SEARCH
    if (path === '/mazepa/search' && request.method === 'POST') {
      if (!await authenticated(env,request)) {
        return response({error:'Телевізор не авторизований'},401);
      }

      const saved = await env.MZ_SESSIONS.get('mazepa:session');

      if (!saved) {
        return response({
          error:'Увійди в Mazepa на сторінці /pair'
        },409);
      }

      const data = await body(request);
      const query = String(data.query || '').trim().slice(0,100);

      if (query.length < 2) {
        return response({error:'Назва закоротка'},400);
      }

      try {
        const cookie = await unseal(saved,env.MZ_ADMIN_KEY);

        const form = new URLSearchParams({
          'f[]':'-1',
          prev_allw:'1',
          prev_a:'0',
          prev_dla:'0',
          prev_dlc:'0',
          prev_dld:'0',
          prev_dlw:'0',
          prev_my:'0',
          prev_new:'0',
          prev_sd:'0',
          prev_da:'1',
          prev_dc:'0',
          prev_df:'1',
          prev_ds:'0',
          prev_tor_type:'0',
          o:'1',s:'2',
          dc:'0',df:'1',da:'1',ds:'0',
          tm:'-1',sns:'-1',srg:'-1',
          nm:query,allw:'1'
        });

        const fetched = await fetchMazepa(
          'tracker.php',cookie,{
            method:'POST',
            headers:{
              'Content-Type':'application/x-www-form-urlencoded'
            },
            body:form.toString()
          }
        );

        const html = await fetched.text();

        if (fetched.status !== 200) {
          return response({
            error:'Помилка каталогу Mazepa',
            http:fetched.status
          },502);
        }

        if (/login_username|login_password/.test(html)) {
          return response({
            error:'Сесія Mazepa завершилась. Увійди повторно'
          },401);
        }

        const results = [];
        const rowRe =
          /<tr\b[^>]*\bid=["']tor_[^"']+["'][\s\S]*?<\/tr>/gi;

        let match;

        while ((match = rowRe.exec(html)) && results.length < 50) {
          const row = match[0];

          const dl = row.match(
            /href=["']\.\/dl\.php\?id=(\d+)/i
          );

          const name = row.match(
            /<a\b[^>]*class=["'][^"']*(?:genmed|seedmed|leechmed)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i
          );

          if (!dl || !name) continue;

          const title = name[1]
            .replace(/<[^>]+>/g,' ')
            .replace(/&nbsp;/g,' ')
            .replace(/&amp;/g,'&')
            .replace(/\s+/g,' ')
            .trim();

          if (title) {
            results.push({id:dl[1],title});
          }
        }

        return response({
          status:'ok',
          count:results.length,
          results,
          html_size:html.length
        });
      } catch {
        return response({error:'Помилка пошуку Mazepa'},502);
      }
    }

    return response({error:'Not found'},404);
  }
};
