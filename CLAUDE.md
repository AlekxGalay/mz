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
- Ключі Lampa взято з вихідного коду lampa-source (`src/interaction/torserver.js`, `src/utils/reguest.js`)
- Перевірено на LG webOS 24 (коміт 975a722): адреса введена вручну через меню, фільм запустився і працює. Автопідхоплення адреси з налаштувань Lampa на реальному ТВ не перевірено (адресу вводили вручну); на інших ТВ не перевірено

## План (за пріоритетом обговорення)

1. **Кнопка Mazepa в картці фільму Lampa** (вимога користувача). Підхід за lampa-source: `Lampa.Listener.follow('full', e => e.type === 'complite')`, `e.data.movie` (назва/рік/оригінальна назва), кнопка додається в контейнер кнопок картки (`.full-start-new__buttons`, у новіших версіях ще `.buttons--container`), `hover:enter` → пошук Mazepa за назвою фільму. Селектори залежать від версії Lampa — перевірити на ТВ; потрібна версія Lampa
2. Фільтр 4K/HDR і пріоритет української озвучки за назвою релізу (тільки `m.js`)
3. Парсер Worker: сіди, розмір, сортування, ліміт 35 ГБ (потребує деплою Worker — тільки після підтвердження)
4. Прибрати зайву діагностику прелоаду
5. Етап 2 налаштувань TorrServer (DHT/PEX/uTP/UPnP) — лише якщо зависання повернуться на інших торрентах

## Worker (`worker/`, вивантажено з Cloudflare через `wrangler init --from-dash mz-api`)

- Версія 0.5, KV `MZ_SESSIONS`, секрет `MZ_ADMIN_KEY` (значення не в коді; в KV лежить cookie-сесія Mazepa, зашифрована AES-GCM ключем з MZ_ADMIN_KEY)
- Ендпоінти: `/health`, `/test`, `GET /pair` (HTML-сторінка: підтвердження коду ТВ + логін Mazepa, обидва за `X-Admin-Key`), `/pair/start|confirm|status`, `/auth/check`, `/mazepa/login`, `/mazepa/search`, `/mazepa/torrent`
- Один спільний акаунт Mazepa для всіх ТВ (`mazepa:session`), токен ТВ діє 30 днів
- Пошук парсить HTML tracker.php регулярками; повертає тільки `{id,title}` — без сідів, розміру, дати
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
- Прелоад TorrServer показував 0 завантажених байтів (незавершено; гейт прелоаду знято в останньому коміті)
- У `m.js` регулярки з `\\.` і `'\\n'` (схоже на подвійне екранування) — не перевірено на пристрої
