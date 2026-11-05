# Plugin Mazepa

plugin for lampa

## Стек

- Vanilla JS (ES5, без збірки), один файл `m.js` (IIFE), підключається в Lampa як плагін
- Lampa API: `Lampa.SettingsApi`, `Lampa.Player`, `Lampa.Noty`, `Lampa.Listener`
- Бекенд-проксі: Cloudflare Worker `mz-api.galajalexej.workers.dev` (код Worker у цьому репо відсутній)
  - Ендпоінти: `/pair/start`, `/pair/status`, `/mazepa/search`, `/mazepa/torrent`, `/test`
- TorrServer — стрім через `/stream`
- Репозиторій: https://github.com/AlekxGalay/mz (гілка `main`)
- Стан у `localStorage`: `mz_device_token`, `mz_device_secret`, `mz_pair_code`, `mz_torrserver_auth`, `mz_last_query`, `mz_last_torrent_hash`, `mz_playback_samples`

## Архітектура

- Авторизація через код пари: ТВ отримує код → підтвердження на іншому пристрої → `device_token`
- Потік: пошук → вибір торрента → додавання в TorrServer → опитування статусу → вибір файлу → `Lampa.Player.play`
- Діагностика: журнал подій/клавіш, моніторинг швидкості й пірів, перевірка Worker/cookies/TorrServer

## Вимоги та архітектурні рішення

- **Плагін працює тільки на телевізорі і не залежить від конкретного пристрою** (LG webOS 24 — лише тестовий). Жодних захардкоджених адрес/пристроїв у `m.js`; MacBook/VPS не потрібні
- Адреса TorrServer: `mz_torrserver_url` (меню Mazepa → Адреса TorrServer) → `Lampa.Torserver.url()` → `Lampa.Storage` (`torrserver_url`/`_two`) → якщо порожньо, `torrReady()` повідомляє користувача. Дефолтної адреси немає
- Авторизація TorrServer: власні `mz_torrserver_auth`, інакше логін/пароль з налаштувань Lampa (`torrserver_auth`, `torrserver_login`, `torrserver_password`)
- Код лишається ES5 (без let/const/arrow/template), бо на старих ТВ (webOS/Tizen) новий синтаксис може не працювати
- **Навігація Back (правило):** усі списки показувати ТІЛЬКИ через `mzShow()`, не через `Lampa.Select.show()`. Lampa сама не повертає фокус після закриття списку чи вибору пункту (див. її docs `06-ui-components.md`): контролер лишається `select`, і кожен Back повторно закриває той самий невидимий список. `mzShow` запам'ятовує контролер-джерело і повертає його в `onBack` та `onSelect`; також закриває відкритий список перед показом нового. Пошук блокується, поки йде запит (`mzSearchBusy`), кнопка в картці має debounce 1,5 с
- Перевірено на ТВ (коміт 67d4517): Back у картці, у меню налаштувань і після вибору пункту працює одним натисканням (раніше 10–70). Причину знайдено за журналом діагностики (`STATE`/`BACK`/`SELECT show #N`)
- **Штатний екран торрентів Lampa (коміт 947220d):** кнопка в картці робить `Activity.push({component:'torrents', mz_only:true, ...})`. `Lampa.Parser.get` підмінено: для `mz_only` віддає результати Worker у форматі Jackett-елементів (`Title`, `Tracker:'Mazepa'`, `Size`, `Seeders`, `Peers`, `PublishDate`, `mz_id`); решту запитів віддає оригіналу. `Lampa.Torrent.start` підмінено: для елементів з `mz_id` спершу `.torrent` через Worker → `POST /torrent/upload` у TorrServer → хеш → `MagnetUri = magnet:?xt=urn:btih:<hash>` → оригінальний `start` (далі штатні екран файлів і плеєр Lampa). Хуки ставить `mzInstallHooks()` в `init()`. Спливаючий список (`searchMazepa`) лишився запасним і для пошуку з головного меню
- Штатна Lampa користується СВОЇМИ налаштуваннями TorrServer (`torrserver_url`, `torrserver_auth`, `torrserver_login`, `torrserver_password`), тому пункт меню «Синхронізувати TorrServer з Lampa» (`mzSyncLampaTorrserver`) копіює туди адресу й логін/пароль плагіна. Заповнює лише порожнє, інший сервер не перезаписує; без синхронізації `Torrent.start` блокується з підказкою
- Перевірено на LG (Lampa 3.4.5): після синхронізації штатний екран торрентів і запуск працюють («працює поки що»). Не перевірено окремо: чи реальна розмітка Mazepa дає сіди/розмір/дату в списку (парсер перевірений лише на фікстурі за селекторами Jackett); відтворення через штатний `/stream` на 4K
- Ключі Lampa взято з вихідного коду lampa-source (`src/interaction/torserver.js`, `src/utils/reguest.js`)
- Перевірено на LG webOS 24 (коміт 975a722): адреса введена вручну через меню, фільм запустився і працює. Автопідхоплення адреси з налаштувань Lampa на реальному ТВ не перевірено (адресу вводили вручну); на інших ТВ не перевірено

## План (за пріоритетом обговорення)

1. ~~Кнопка Mazepa в картці фільму~~ — зроблено й перевірено на ТВ (Lampa 3.4.5)
2. ~~Результати у штатному екрані торрентів Lampa~~ — зроблено (947220d), на ТВ «працює поки що»; перевірити: сіди/розмір у списку (реальна розмітка), 4K через `/stream`
3. Фільтри/сортування: штатний екран Lampa сам сортує за сідами/розміром і фільтрує за якістю/озвучкою за назвою; ліміт 35 ГБ і пріоритет української озвучки — окремо, за потреби
4. Пошук з головного меню плагіна (без картки) досі у спливаючому списку — за потреби перевести на штатний екран
5. Прибрати зайву діагностику з меню (лишити потрібне)
6. Етап 2 налаштувань TorrServer (DHT/PEX/uTP/UPnP) — лише якщо зависання повернуться на інших торрентах
7. Інфраструктура: `brew install ripgrep` (хук перевірки секретів пише «passed», але без `rg` не працює); після пуша GitHub Pages інколи довго збирається — тоді `gh api -X POST repos/AlekxGalay/mz/pages/builds`

## Worker (`worker/`, вивантажено з Cloudflare через `wrangler init --from-dash mz-api`)

- Версія **0.6** (розгорнуто 2026-11-05 через `wrangler deploy --keep-vars`; 0.5 = version `c9e7d8b4-ae25-493f-a298-c6162410c757`, відкат: `wrangler rollback <id>` у `worker/`), KV `MZ_SESSIONS`, секрет `MZ_ADMIN_KEY` (значення не в коді; в KV лежить cookie-сесія Mazepa, зашифрована AES-GCM ключем з MZ_ADMIN_KEY)
- Ендпоінти: `/health`, `/test`, `GET /pair` (HTML-сторінка: підтвердження коду ТВ + логін Mazepa, обидва за `X-Admin-Key`), `/pair/start|confirm|status`, `/auth/check`, `/mazepa/login`, `/mazepa/search`, `/mazepa/torrent`
- Один спільний акаунт Mazepa для всіх ТВ (`mazepa:session`), токен ТВ діє 30 днів
- Пошук парсить HTML tracker.php регулярками; повертає `{id,title,size,seeders,leechers,date}` (селектори взято з Jackett `mazepa.yml`: `td.seedmed`, `td.leechmed`, розмір — текст посилання `dl.php`, дата — остання комірка `HH:MM D-Мес-YY`); відсутні поля = 0/порожньо. `debug:true` у запиті повертає `debug_row` (сирий перший рядок) для діагностики парсера. Реальну розмітку Mazepa не бачили
- Деплой Worker — тільки після підтвердження користувача (`wrangler` авторизований OAuth, scopes workers_scripts write тощо)

## Session Protocol

Перед завершенням сесії оновити цей файл:
- Що зроблено
- Нові архітектурні рішення
- Зміни в конфігурації/стеку
- Поточний стан та відомі проблеми

## Журнал сесій

### 2026-11-05
- Підключено GitHub: `gh` авторизований як AlekxGalay, `git init -b main`, `origin` → AlekxGalay/mz, `main` злитий з `origin/main` (отримано `m.js`, `README.md`)
- Claude GitHub App ще треба встановити вручну на `AlekxGalay/mz` (github.com/apps/claude/installations/new)
- Заповнено «Стек» за результатами огляду коду
- `wrangler` авторизований (OAuth), код Worker вивантажено в `worker/` (тільки читання, деплою не було); додано `.gitignore`
- Ще не отримано від користувача: модель ТВ/ОС, версія Lampa, версія і налаштування TorrServer, URL завантаження `m.js`

**TorrServer (MatriX.142.2, на LG webOS 24, 192.168.0.110:8090, Basic Auth, логін `torrserver`)**
- Початкові налаштування: `CacheSize` 64 МБ, `ReaderReadAHead` 5, `PreloadCache` 0, `ConnectionsLimit` 100, `RetrackersMode` 0, `ResponsiveMode` false, `DisableUTP/UPNP/DHT/PEX` = true. Копія: scratchpad `ts_backup.json` (тимчасова)
- Стандарти TorrServer (за кодом): `ReaderReadAHead` 95, `PreloadCache` 50, `RetrackersMode` 1, DHT/PEX/UTP/UPNP увімкнені
- Етап 1 (застосовано, перевірено): `ReaderReadAHead` 5→95, `PreloadCache` 0→50. Результат тесту (Duplicity 2160p BDRemux): 3,5+ хв без зависань (раніше ~20 с). Зафіксовано як вирішення зависань для цього торрента; на інших роздачах не перевірено
- Етап 2 (не застосовано, потрібне підтвердження): `DisableUTP/UPNP/DHT/PEX`→false, `RetrackersMode`→1
- Зміна налаштувань: `POST /settings {"action":"set","sets":{...повний об'єкт...}}`, пароль вводиться вручну (`curl -u torrserver`), у файли не записується

**Відомі проблеми**
- Прелоад TorrServer показував 0 завантажених байтів: причина — `PreloadCache`=0 на TorrServer, виправлено етапом 1 налаштувань; гейт прелоаду знято (d0c35ea)
- У `m.js` регулярки з `\\.` і `'\\n'` (схоже на подвійне екранування) — не перевірено на пристрої
