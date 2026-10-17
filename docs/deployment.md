# Запуск Fate с backend

Frontend обращается к `/api/` и `/hubs/chat` на том же адресе, с которого открыт сайт. Nginx передаёт эти запросы контейнеру `api:8080`, в том числе WebSocket для SignalR. В браузере нет адресов PostgreSQL, Redis или Docker-сервисов.

## Запустить текущую рабочую копию

Нужны Git, Node.js и работающий Docker с Compose v2 и Linux-контейнерами. На Windows подойдёт Docker Desktop. Команды выполняются из корня frontend-репозитория; подходят Git Bash, PowerShell и терминал Linux.

```bash
node integration/prepare.mjs
docker compose --env-file .tmp/runtime/compose.env -f compose.integration.yaml config --quiet
docker compose --env-file .tmp/runtime/compose.env -f compose.integration.yaml up --build -d
docker compose --env-file .tmp/runtime/compose.env -f compose.integration.yaml ps
```

Откройте <http://127.0.0.1:8080>. Зарегистрируйте свой аккаунт: готовых пользователей и демонстрационных переписок в этой базе нет.

В `compose ps` сервис `web` должен стать `healthy`: проверка запрашивает страницу сайта и `/api/health`, который проверяет соединение API с PostgreSQL. При первом запуске дождитесь завершения сборки и migrations.

`integration/prepare.mjs` скачивает [backend](https://github.com/Perry-Utkonos/Perry-Utkonos-backend) на commit `bf8010db3b4256915dd0d05de93ea7fa29957e2e`, применяет `integration/backend.patch` и создаёт локальные секреты. Повторный запуск сохраняет секреты и распознаёт уже применённый patch. Если исходники несовместимы с patch, скрипт останавливается без сброса локальных правок.

Получается такая структура:

```text
.tmp/runtime/
├── backend/      # отдельная копия backend с integration/backend.patch
└── compose.env   # пароль локальной БД, JWT signing key, WEB_PORT
```

Эти файлы исключены из Git. Порт меняется через `WEB_PORT` в `.tmp/runtime/compose.env`. Не удаляйте и не пересоздавайте секреты при сохранённой базе: её пароль тоже останется прежним.

Compose собирает frontend из текущей папки. Backend получает настройки через переменные окружения и применяет EF Core migrations при `Database__ApplyMigrations=true`. PostgreSQL и Redis хранят данные в Docker volumes. Подключение к ранее выданной удалённой базе и VPN для этого запуска не используются.

Наружу открыт только web на `127.0.0.1:8080`; API, PostgreSQL и Redis остаются во внутренней сети Compose. Для доступа с другого компьютера серверу нужен отдельный внешний reverse proxy с HTTPS либо осознанное изменение привязки порта под вашу VPN-сеть.

## Обновления и диагностика

После изменений frontend повторите `up --build -d` из первого блока. Список контейнеров и журналы:

```bash
docker compose --env-file .tmp/runtime/compose.env -f compose.integration.yaml ps
docker compose --env-file .tmp/runtime/compose.env -f compose.integration.yaml logs --tail=100 api web
```

Если сайт открывается, но API возвращает `502`, проверьте журнал `api`: при первом запуске сервер ещё может применять migrations. Ответ `401` от защищённого `/api/` означает, что запрос дошёл до backend, но нужна авторизация. Адреса `api:8080`, `postgres:5432` и `redis:6379` доступны контейнерам; их нельзя указывать как адрес API в браузере.

Nginx записывает в access log метод, путь без query-параметров и статус ответа. JWT, который SignalR передаёт в `access_token`, туда не попадает. Для `/hubs/chat` подробный Nginx error log отключён: сообщения upstream-ошибок тоже могут содержать полный URL. Compose также повышает минимальный уровень ASP.NET `Hosting.Diagnostics` до `Warning`, чтобы обычные записи входящих запросов не печатали полный URL с токеном. Статусы запросов чата остаются в access log, серверные ошибки доступны в журнале `api`.

Остановка с сохранением базы:

```bash
docker compose --env-file .tmp/runtime/compose.env -f compose.integration.yaml down
```

Не добавляйте `-v`, если данные нужны: этот флаг удаляет volumes с базой и Redis.

## Разрабатывать frontend вне Docker

Оставьте стек работающим. В отдельном терминале frontend:

```bash
npm ci
npm run dev
```

Vite проксирует `/api/` и `/hubs/chat` в `http://127.0.0.1:8080`. Если web работает на другом адресе, задайте `API_PROXY_TARGET` в `.env` по примеру `.env.example` и перезапустите Vite. Эта настройка действует на сервер разработки; в Docker адреса остаются относительными и обрабатываются Nginx.

## Использовать существующий DevOps-репозиторий

В [DevOps](https://github.com/Perry-Utkonos/Perry-Utkonos-devops) на commit `d685b09b85f55e9947c32e460246ef180c7d6772` подготовка закреплена за старыми версиями исходников. Она перезаписывает frontend Dockerfile и ожидает отсутствующий в текущем backend `appsettings.json`. Поэтому одного прежнего `prepare_sources.sh` недостаточно для этой интеграции.

`integration/devops.patch` исправляет подготовку: принимает полный SHA frontend, использует совместимую версию backend с bundled patch, сохраняет файлы Docker/Nginx из frontend и проверяет поддержку migrations. Patch не отправлен в удалённый DevOps-репозиторий.

После публикации текущих изменений frontend на GitHub, в соседней папке на машине с Docker и Python 3:

```bash
git clone https://github.com/Perry-Utkonos/Perry-Utkonos-devops.git
cd Perry-Utkonos-devops
git checkout d685b09b85f55e9947c32e460246ef180c7d6772
git apply ../Perry-Utkonos-frontend/integration/devops.patch
FRONTEND_SHA=$(git -C ../Perry-Utkonos-frontend rev-parse HEAD) bash scripts/prepare_sources.sh
python3 scripts/init_env.py
docker compose config --quiet
docker compose up --build -d
```

Этот блок рассчитан на Bash/Linux; замените `../Perry-Utkonos-frontend` на путь к вашей frontend-копии. `FRONTEND_SHA` должен уже существовать на GitHub. Если `.env` в DevOps уже создан, пропустите `init_env.py`: он намеренно не перезаписывает секреты. На Linux Docker может требовать `sudo` согласно настройке системы.

Для запуска ещё не опубликованных изменений используйте первый вариант с `compose.integration.yaml`.

## Границы проверки

API-клиент и SignalR проверены с реальным backend и PostgreSQL, в том числе через локальный Nginx: авторизация, анкеты, лайки, история и доставка сообщений, переподключение и сохранение ожидающего платежа. Конфигурация Nginx прошла проверку синтаксиса; для локальной проверки менялись только адрес upstream, порт и путь к `dist`.

Docker и WSL в рабочей среде отсутствуют. Сборка контейнеров, DNS внутри Docker и запуск всего Compose ещё требуют отдельной проверки на машине с Docker.
