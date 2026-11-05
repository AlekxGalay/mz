# Тести

Це самодостатні перевірки в імітованому середовищі (без реального ТВ): фальшиві `Lampa`, `localStorage`,
`XMLHttpRequest`, TMDB та Worker. Вони перевіряють логіку плагіна, але **не замінюють перевірку на ТВ**.

Запуск із кореня репозиторію (потрібен лише Node):

```
node tests/harness.js  m.js      # адреса/авторизація TorrServer (12)
node tests/harness2.js m.js      # спливаючий список, дебаунс, busy (17)
node tests/harness4.js m.js      # кнопка в картці, штатний екран, рівні й фільтри (85)
node tests/harness5.js m.js      # рядки на головній, меню, пошук з меню, екран пристрою (80)
node tests/worker_test.mjs       # Worker: пошук, feed, /imdb, пара/авторизація (30)
git show 0dd43d3:m.js > /tmp/m_old.js && node tests/harness3.js /tmp/m_old.js m.js   # Back: стара версія застрягає, нова — ні
```

Кожен набір друкує `OK`/`FAIL` по кожній перевірці й підсумок; код завершення ненульовий при провалі.
`harness3` порівнює з комітом `0dd43d3`, у якому ще немає виправлення Back (`mzShow`).
