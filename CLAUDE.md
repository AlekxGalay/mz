# Plugin Mazepa

Плагін Lampa (LG webOS): пошук і перегляд релізів з Mazepa.to через TorrServer. Репозиторій: https://github.com/AlekxGalay/mz (гілка `main`), плагін віддає GitHub Pages: `https://alekxgalay.github.io/mz/m.js`.

## Поточний стан (2026-11-05)

**Працює й підтверджено користувачем на ТВ:** кнопка «Mazepa» в картці → штатний екран торрентів Lampa; рівні якості + кнопка «Рівень» + `[SDR]`; Back одним натисканням; адреса/авторизація TorrServer без прив'язки до пристрою; рядки «Новинки Mazepa» і «Популярне (IMDb)» на головній; пошук з меню на штатному екрані; меню з 7 груп; екран «Про пристрій».

**Відкрите:**
1. **Позиція перегляду не зберігається** (штатний екран; смужки прогресу немає). Відкладено. Діагностика в коді: при ввімкненій діагностиці журнал пише `PLAYER start/timeupdate/destroy` (timeline hash/time/percent/duration/stop_recording/handler, `duration` від плеєра, запис `file_view`, розмір localStorage). Гіпотези (не перевірені): плеєр віддає `duration` 0/NaN/Infinity для потоку TorrServer; запис вимкнено (`stop_recording`). Переповнення localStorage малоймовірне (на ТВ зайнято 1819 КБ). Як відновити: увімкнути діагностику (меню → Діагностика), 3–4 хв перегляду, вийти Back, взяти рядки `PLAYER` з журналу
2. Моделі LG 2025/2026 не перевірені (доступу немає); еталон — екран «Про пристрій» (див. нижче)
3. Не перевірено: відтворення Dolby Vision (веб-рушій каже «ні», але це лише `canPlayType`)
4. Етап 2 налаштувань TorrServer (DHT/PEX/uTP/UPnP → увімкнути) — лише якщо зависання повернуться на інших торрентах
5. Інфраструктура: `brew install ripgrep` (хук перевірки секретів пише «passed», але без `rg` не працює); GitHub Pages після пуша інколи довго збирається — тоді `gh api -X POST repos/AlekxGalay/mz/pages/builds`

## Робочі правила (важливо)

- **Після кожного пуша просити ПОВНІСТЮ закрити й знову відкрити Lampa** (ТВ тримає старий `m.js` з кешу й показує стару поведінку).
- Пуш у `main` і деплой Worker — лише після підтвердження користувача; перед змінами на ТВ/сервері — тест у `tests/`.
- Без секретів у репо й чаті. Ключ OMDb і `MZ_ADMIN_KEY` лише в секретах Worker (`npx wrangler secret put OMDB_KEY` виконується у ЗВИЧАЙНОМУ терміналі, не через `!`). Пароль TorrServer вводиться вручну (`curl -u torrserver`).
- Не робити запити до сторонніх API з ключами, знайденими у вихідному коді (система це блокувала — так було з ключем TMDB із Lampa); у плагіні TMDB іде через `Lampa.TMDB.api()/key()`.
- Код лишається **чистим ES5** (без let/const/=>/шаблонів/fetch/Promise): перевірено `acorn`.
- **Усі списки показувати лише через `mzShow()`**, не `Lampa.Select.show()`: Lampa сама не повертає фокус після закриття списку/вибору пункту, контролер лишається `select`, і Back повторно закриває невидимий список. `mzShow` запам'ятовує контролер-джерело і повертає його в `onBack`/`onSelect`.
- Вхід у штатну Lampa: усі селектори/API звірено з гілкою `main` lampa-source, яка має `app_version: '3.4.5'` (збігається з ТВ). Тегів версій у lampa-source немає.
- Тести: `tests/` (≈220 перевірок плагіна + 30 Worker), запуск у `tests/README.md`; це імітація, перевірка на ТВ обов'язкова.

## Стек і архітектура

- `m.js` — один файл (IIFE), підключається в Lampa як плагін. `worker/` — Cloudflare Worker `mz-api` (`https://mz-api.galajalexej.workers.dev`), KV `MZ_SESSIONS`, секрети `MZ_ADMIN_KEY`, `OMDB_KEY`.
- **Worker 0.7** (розгорнуто 2026-11-05, `wrangler deploy --keep-vars`; відкат `wrangler rollback <id>` у `worker/`: 0.6 = `d584312c-d848-40e9-9a93-aa0a4a64c1d0`, 0.5 = `c9e7d8b4-ae25-493f-a298-c6162410c757`). Ендпоінти: `/health` (є `omdb`), `/test`, `GET /pair` (HTML: підтвердження коду ТВ + вхід на Mazepa, за `X-Admin-Key`), `/pair/start|confirm|status`, `/auth/check`, `/mazepa/login`, `/mazepa/search`, `/mazepa/torrent`, `/mazepa/feed` ({kind:'new'|'top', limit}; розділи фільмів/серіалів/мультфільмів/документальних/аніме за Jackett `mazepa.yml`; KV-кеш 10 хв), `/imdb` ({title, original, year, series} → {imdb_id, rating, votes}; OMDb, KV-кеш 7 діб, промахи 1 доба, 429 при ліміті). Один спільний акаунт Mazepa для всіх ТВ (cookie-сесія в KV, шифрована AES-GCM з MZ_ADMIN_KEY), токен ТВ 30 днів. Парсер `tracker.php` (регулярки за селекторами Jackett: сіди `td.seedmed`, піри `td.leechmed`, розмір — текст посилання `dl.php`, дата — остання комірка) **підтверджено на живій сторінці**. `debug:true` повертає `debug_row`.
- **Штатний екран торрентів:** кнопка в картці/пошук з меню → `Activity.push({component:'torrents', mz_only:true, ...})` (з меню ще `from_search:true`, екран сам підставляє `movie`). `Lampa.Parser.get` підмінено для `mz_only` (результати Worker у форматі Jackett: `Title, Tracker, Size, Seeders, Peers, PublishDate, mz_id`). `Lampa.Torrent.start` підмінено для `mz_id`: `.torrent` через Worker → `POST /torrent/upload` у TorrServer → хеш → `MagnetUri=magnet:?xt=urn:btih:<hash>` → оригінальний `start` (далі штатні екран файлів і плеєр). Хуки: `mzInstallHooks()` у `init()`. Спливаючий список `searchMazepa` — запасний (хуки недоступні/екран не відкрився), він НЕ зберігає позицію.
- **TorrServer:** адреса `mz_torrserver_url` → `Lampa.Torserver.url()` → `Lampa.Storage` (`torrserver_url`/`_two`), дефолту немає (`torrReady()` підказує). Штатна Lampa користується СВОЇМИ налаштуваннями → пункт «Синхронізувати з налаштуваннями Lampa» (`mzSyncLampaTorrserver`) копіює адресу й логін/пароль у Lampa (лише порожнє, інший сервер не перезаписує). Авторизація: `mz_torrserver_auth`, інакше налаштування Lampa.
- **Рівні й фільтри:** рівні 0 (понад поріг розміру, за замовч. 35 ГБ), 1 (4K; 4K без HDR лишається там з `[SDR]` у назві), 2 (FHD), 3 (решта). Для фільмів «авто» = найвищий непорожній рівень, для серіалів і пошуку без картки — усі. Кнопка «Рівень» вставляється в `.torrent-filter`, вибір → `Activity.replace({mz_level})`; порожній вручну обраний рівень → показати всі. «Лише українська озвучка» (ukr/укр/ua у назві) **за замовчуванням ВИМКНЕНО** (рішення користувача; ризик хибно ховати). localStorage: `mz_max_size_gb`, `mz_only_ua`('1'=увімк.), `mz_best_only`.
- **Рядки на головній:** `Lampa.ContentRows.add` («Новинки Mazepa» index 0, «Популярне (IMDb)» index 1, `screen:['main']`); релізи з `/mazepa/feed` → `mzParseRelease` → TMDB (новинки: `search/movie|tv`; популярне: `/imdb` → `find/{imdb_id}`, поріг ≥1000 голосів, топ-20, `vote_average`=IMDb). **Головна чекає на перші рядки (`Progress` у `Api.partNext`)**, тому: кеш у localStorage (`mz_row_new` 30 хв, `mz_row_top` 6 год; помилки 5 хв / OMDb-ліміт 1 год), застарілий кеш віддається одразу й оновлюється у фоні, `mzRowTimeout` 6 с, прогрів `mzPrewarmRows` через 2,5 с після старту. Меню «Статус рядків» показує кроки збирання.
- **Меню** (`mzMenuShow`, 7 груп): Пошук, Повторити пошук, Фільтри й рівні, Рядки на головній, TorrServer, Прив'язка телевізора, Діагностика (журнал вкл/викл, Про пристрій і сумісність, Показати журнал, перевірка Worker, швидкість і буфер, журнал зависань).
- **Діагностика:** журнал (`mzLog`, лише коли ввімкнено): `KEY`, `STATE` (контролер після Back), `SELECT`, `BACK`, `PARSER`, `LEVEL`, `ROW`, `PLAYER`, `DEVICE`, `ERROR`.

## Сумісність з моделями LG

Вимога користувача: працювати на webOS 2024–2026. Рушії за сайтом розробників LG (сторінка була у кеші): webOS 24 → Chromium 108, 25 → 120, 26 → 132.
- **Перевірено лише на LG 55QNED86T6A** (модель 2024 року): екран «Про пристрій» показує Chromium 120 → webOS 25 (раніше помилково вважали webOS 24; ймовірно оновлення прошивки), Lampa 3.4.5 / платформа webos, екран 1920×1080 DPR 2, localStorage 1819 КБ, Worker v0.7, TorrServer `/echo` = MatriX.142.2.
- Еталон кодеків веб-рушія (`canPlayType`): H.264, HEVC, VP9, AV1, AAC, AC-3, E-AC-3, **DTS**, Opus, FLAC — «так»; Dolby Vision — «ні» (лише відповідь рушія на профіль 5 в mp4, не вердикт для ТВ).
- Ризик 2025+: LG прибрала DTS з ліній 2025 року (за відкритими даними; 2026 — даних немає) → реліз лише з DTS-доріжкою може йти без звуку. Попередження в списку не додано (немає моделей для перевірки).
- Інструмент для іншої моделі: Діагностика → «Про пристрій і сумісність» (покоління за Chromium, Lampa, екран, localStorage, кодеки, відповідь Worker і TorrServer) + `window.error` у журнал.

## TorrServer (MatriX.142.2, LG 55QNED86T6A, `192.168.0.110:8090`, Basic Auth, логін `torrserver`)

- Було: `CacheSize` 64 МБ, `ReaderReadAHead` 5, `PreloadCache` 0, `RetrackersMode` 0, `ResponsiveMode` false, `DisableUTP/UPNP/DHT/PEX`=true. Стандарти за кодом TorrServer: `ReaderReadAHead` 95, `PreloadCache` 50, `RetrackersMode` 1.
- **Етап 1 застосовано й перевірено:** `ReaderReadAHead` 5→95, `PreloadCache` 0→50 → тестовий 4K (Duplicity BDRemux) 3,5+ хв без зависань (раніше ~20 с). Причина «0 байтів прелоаду» була `PreloadCache`=0; гейт прелоаду знято (d0c35ea).
- Зміна: `POST /settings {"action":"set","sets":{...повний об'єкт...}}`, пароль вводиться вручну (`curl -u torrserver`), у файли не записується.

## Session Protocol

Перед завершенням сесії оновити цей файл: що зроблено; нові архітектурні рішення; зміни в конфігурації/стеку; поточний стан і відомі проблеми.

## Журнал сесій

### 2026-11-05 (перша сесія)
Підключено GitHub (`gh`, `origin`), вивантажено Worker у `worker/`, знайдено й виправлено причину зависань (налаштування TorrServer), адреса/авторизація без прив'язки до пристрою, кнопка в картці, виправлення Back (`mzShow`), штатний екран торрентів + рівні/фільтри, Worker 0.6→0.7 (`/mazepa/feed`, `/imdb`, секрет `OMDB_KEY`), рядки на головній, перебудоване меню, пошук з меню на штатному екрані, екран «Про пристрій» і README, збережені тести в `tests/`. Відкрите: позиція перегляду (див. «Поточний стан»).
