# Лабораторная работа: Microshop Platform

## История задачи
Вы команда платформенной разработки, которой передали прототип интернет-магазина. Бизнес хочет запустить MVP быстро, но с заделом на масштабирование. Поэтому архитектура уже микросервисная: разные языки, отдельные сервисы, очередь, кэш, объектное хранилище и API-gateway.

Ваша задача как DevOps-инженеров: собрать это в воспроизводимый контейнерный стенд, где весь магазин поднимается одной командой и работает как единая система.

## Что нужно сделать
1. Докеризовать каждый прикладной сервис (собственный `Dockerfile`).
2. Поднять весь стек через `docker compose`.
3. Настроить межсервисную сеть и переменные окружения.
4. Настроить `nginx-gateway` как единую точку входа.
5. Обеспечить работоспособность пользовательских сценариев: регистрация, логин, витрина, корзина, заказ, кабинет, обработка заказа воркером.

## Прикладные сервисы
- `auth-service-go`
Цель: регистрация/логин пользователя.
Технологии: Go, etcd (пользователи), Redis (сессии).

- `backend-java`
Цель: API магазина (товары, заказы, кабинет, админ-функции).
Технологии: Java/Spring Boot, PostgreSQL, Redis cache, RabbitMQ publisher, MinIO client.

- `order-worker-python`
Цель: асинхронная обработка заказов из очереди.
Технологии: Python, RabbitMQ consumer, PostgreSQL.

- `frontend-react`
Цель: UI витрины/кабинета/админки.
Технологии: React.

- `nginx-gateway`
Цель: единая точка входа в систему (frontend + API + media).

## Инфраструктурные сервисы, которые нужно поднять
- `postgres`
Основная БД магазина (товары, заказы).

- `redis`
Сессии и кэш.

- `rabbitmq`
Очередь для событий заказа (backend -> worker).

- `etcd`
Хранилище пользователей auth-сервиса.

- `minio`
S3-совместимое объектное хранилище изображений товаров.

## Nginx Gateway: что и куда должно проксироваться
Нужна единая точка входа, например `http://localhost:3000`.

Минимальная маршрутизация:
- `location /api/auth/` -> `auth-service:8081`
- `location /api/` -> `backend-service:8080`
- `location /media/` -> `minio:9000`
- `location /` -> `frontend:80`

### Пример конфигурации `nginx-gateway/nginx.conf`
```nginx
server {
  listen 80;
  server_name _;

  # Docker DNS resolver (важно для пересоздания контейнеров)
  resolver 127.0.0.11 ipv6=off valid=10s;

  location /api/auth/ {
    proxy_pass http://auth-service:8081/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /api/ {
    set $backend_upstream http://backend-service:8080;
    proxy_pass $backend_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Session-Token $http_x_session_token;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /media/ {
    proxy_pass http://minio:9000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    set $frontend_upstream http://frontend:80;
    proxy_pass $frontend_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### Короткая справка по Nginx (для старта)
- `location` выбирает блок по URL пути.
- `proxy_pass` пересылает запрос в другой сервис.
- `proxy_set_header` пробрасывает служебные заголовки.
- `resolver 127.0.0.11` нужен в Docker-сети для актуального DNS при пересоздании контейнеров.

Полезные материалы:
- https://nginx.org/en/docs/
- https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/
- https://docs.docker.com/network/

## Справка по инфраструктурным сервисам

### Redis
Зачем здесь: хранение сессий пользователя и кэша товаров.
Что проверить:
- сервис доступен по `redis:6379` из контейнеров.
- после логина появляются ключи сессий (`session:*`).

Материалы:
- https://redis.io/docs/latest/
- https://hub.docker.com/_/redis

### PostgreSQL
Зачем здесь: основная транзакционная БД магазина.
Что проверить:
- backend и worker используют один и тот же `POSTGRES_DB/USER/PASSWORD`.
- таблицы создаются и читаются.
- данные не теряются между рестартами (volume).

Материалы:
- https://www.postgresql.org/docs/
- https://hub.docker.com/_/postgres

### MinIO
Зачем здесь: хранение изображений товаров.
Что проверить:
- объект доступен по URL через gateway: `/media/...`.
- bucket создан и имеет доступ на чтение (или настроены подписанные URL).

Материалы:
- https://min.io/docs/minio/container/index.html
- https://min.io/docs/minio/linux/reference/minio-mc.html

### RabbitMQ
Зачем здесь: асинхронная обработка заказов.
Поток:
- backend публикует событие заказа в очередь,
- worker читает и обновляет статус.

Что проверить:
- очередь существует,
- сообщения потребляются worker-ом,
- статус заказа меняется после обработки.

Материалы:
- https://www.rabbitmq.com/docs
- https://hub.docker.com/_/rabbitmq

## Рекомендуемая структура deliverables
- `Dockerfile` для каждого прикладного сервиса.
- `compose.yml` (или `docker-compose.yml`) для всего стека.
- `nginx-gateway/nginx.conf`.
- `.env.example` с обязательными переменными.
- краткий `docs/runbook.md` с командами запуска и проверок.

## Acceptance Criteria
1. Проект запускается одной командой `docker compose up --build` без ручного запуска отдельных сервисов.
2. Все сервисы контейнеризированы и имеют собственные `Dockerfile`.
3. Конфигурация сервисов управляется через env-переменные и/или конфиг-файлы.
4. Шлюз (Nginx) является единой точкой входа для frontend и API.
5. На главной странице отображается витрина товаров с изображениями.
6. В шапке есть название/логотип и кнопки `Вход` и `Регистрация` справа.
7. Логин и регистрация доступны на отдельных страницах и работают через auth-сервис.
8. Сессия пользователя создается после успешного логина и используется при заказе.
9. Заказ оформляется из корзины (товар + количество).
10. После оформления заказ появляется в личном кабинете.
11. Python worker обрабатывает заказ из очереди и меняет его статус.
12. Во frontend отображается финальный статус: `Заказ доставлен в магазин по адресу Университетская площадь, д.1`.
13. Backend хранит основные данные в PostgreSQL, сессии/кэш в Redis, очередь в RabbitMQ.
14. Пользователи auth-сервиса хранятся в etcd.
15. Изображения товаров хранятся в MinIO и отдаются через gateway.
16. Админ-панель позволяет добавить товар и загрузить изображение.
17. Добавленный админом товар появляется на витрине без ручного изменения кода.

## Обязательные проверки (чеклист)
1. `docker compose ps` — все ключевые сервисы в статусе `Up`.
2. Открывается `http://localhost:3000`, главная страница рендерится без ошибок.
3. Витрина показывает минимум 3 товара с картинками.
4. `GET /api/products` через gateway возвращает `200` и JSON массив.
5. `POST /api/auth/register` создает нового пользователя (`201` или корректный ответ при повторе).
6. `POST /api/auth/login` возвращает токен сессии.
7. После логина доступно оформление заказа из корзины.
8. `POST /api/orders/checkout` с токеном возвращает успешный ответ (`201`).
9. `GET /api/orders/my` показывает созданный заказ в кабинете.
10. Через короткое время (после worker) в кабинете статус меняется на текст доставки.
11. Изображение товара доступно по URL `/media/...` (ответ `200`).
12. Вход под `admin` и создание товара через админ-форму работает.
13. Новый товар после создания отображается на витрине.
14. При перезапуске контейнеров данные PostgreSQL и MinIO не теряются (volumes работают).
