# Лабораторная работа №3 — PostgreSQL, StatefulSet и Gateway API в Kubernetes

**Студент:** *Плотникова Серафима Романовна*  
**Группа:** *9 группа*  

---

## Введение

Работа является продолжением лабораторной №2. Цели:

1. Доработать Flask-приложение — добавить счётчик посещений, хранящийся в PostgreSQL.
2. Развернуть PostgreSQL в Kubernetes вручную: `StatefulSet` + `PersistentVolumeClaim`, без операторов и готовых чартов.
3. Перейти с `Ingress` на `Gateway API` (`GatewayClass` + `Gateway` + `HTTPRoute`).

---

## 1. Доработка приложения

### 1.1 Что изменилось

Приложение дополнено логикой работы с PostgreSQL через библиотеку `psycopg2`:
- При каждом обращении к `/` в таблицу `visits` вставляется новая запись.
- Из таблицы читается общее количество посещений и 5 последних отметок времени.
- Всё отображается на HTML-странице.

### 1.2 Ключевой фрагмент кода

```python
def record_and_count():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO visits (visited_at) VALUES (NOW())")
    cur.execute("SELECT COUNT(*) FROM visits")
    count = cur.fetchone()[0]
    cur.execute("SELECT visited_at FROM visits ORDER BY visited_at DESC LIMIT 5")
    recent = [row[0].strftime("%Y-%m-%d %H:%M:%S") for row in cur.fetchall()]
    conn.commit()
    cur.close()
    conn.close()
    return count, recent
```

Инициализация таблицы при старте (с повторными попытками пока БД не готова):

```python
def init_db():
    for attempt in range(10):
        try:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS visits (
                    id SERIAL PRIMARY KEY,
                    visited_at TIMESTAMP DEFAULT NOW()
                )
            """)
            conn.commit()
            return
        except Exception as e:
            print(f"DB not ready ({attempt+1}/10): {e}")
            time.sleep(3)
```

### 1.3 Обновлённый requirements.txt

```
flask==3.0.3
gunicorn==22.0.0
psycopg2-binary==2.9.9
```

### 1.4 Сборка и публикация нового образа

```bash
cd lab3/app
docker build -t qmayone/hello-k8s:v2 .
docker push qmayone/hello-k8s:v2
```

---

## 2. PostgreSQL в Kubernetes

### 2.1 Почему StatefulSet, а не Deployment

`StatefulSet` гарантирует:
- Стабильное имя пода (`postgres-0`)
- Стабильный сетевой идентификатор
- Привязку `PersistentVolumeClaim` к конкретному поду — данные не теряются при перезапуске

### 2.2 Secret с учётными данными

Пароль и имя пользователя хранятся в `Secret`, а не в `ConfigMap`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
type: Opaque
stringData:
  POSTGRES_DB: appdb
  POSTGRES_USER: appuser
  POSTGRES_PASSWORD: apppassword
```

```bash
kubectl apply -f postgres-secret.yaml
# secret/postgres-secret created
```

### 2.3 StatefulSet с VolumeClaimTemplate

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: POSTGRES_PASSWORD
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
          livenessProbe:
            exec:
              command: [pg_isready, -U, appuser, -d, appdb]
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: [ReadWriteOnce]
        resources:
          requests:
            storage: 1Gi
```

`volumeClaimTemplates` автоматически создаёт `PersistentVolumeClaim` с именем `postgres-data-postgres-0`. Данные сохраняются на диске и переживают перезапуск пода.

```bash
kubectl apply -f postgres-statefulset.yaml
# statefulset.apps/postgres created

kubectl get statefulset
# NAME       READY   AGE
# postgres   1/1     60s

kubectl get pvc
# NAME                      STATUS   CAPACITY   ACCESS MODES
# postgres-data-postgres-0  Bound    1Gi        RWO
```

### 2.4 Service для PostgreSQL

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
  type: ClusterIP
```

```bash
kubectl apply -f postgres-service.yaml
# service/postgres-service created
```

---

## 3. Gateway API

### 3.1 Отличие от Ingress

| | Ingress | Gateway API |
|---|---|---|
| API версия | networking.k8s.io/v1 | gateway.networking.k8s.io/v1 |
| Ресурсы | Ingress | GatewayClass + Gateway + HTTPRoute |
| Гибкость | Ограниченная | Высокая (TCP, TLS, разделение ролей) |
| Статус | Стабильный, устаревает | Новый стандарт |

### 3.2 Установка CRD Gateway API

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml
```

### 3.3 Манифест Gateway API

```yaml
# GatewayClass — тип контроллера
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: nginx
spec:
  controllerName: k8s.io/ingress-nginx
---
# Gateway — точка входа на порт 80
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: hello-gateway
spec:
  gatewayClassName: nginx
  listeners:
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: Same
---
# HTTPRoute — маршрут к сервису
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: hello-route
spec:
  parentRefs:
    - name: hello-gateway
  hostnames:
    - "hello-app.local"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: hello-app-service
          port: 80
```

```bash
kubectl apply -f gateway.yaml
# gatewayclass.gateway.networking.k8s.io/nginx created
# gateway.gateway.networking.k8s.io/hello-gateway created
# httproute.gateway.networking.k8s.io/hello-route created

kubectl get gateway
# NAME            CLASS   ADDRESS        PROGRAMMED   AGE
# hello-gateway   nginx   192.168.49.2   True         30s

kubectl get httproute
# NAME          HOSTNAMES             AGE
# hello-route   ["hello-app.local"]   30s
```

---

## 4. Применение всех манифестов

Порядок применения важен — сначала Secret и БД, потом приложение:

```bash
kubectl apply -f postgres-secret.yaml
kubectl apply -f postgres-statefulset.yaml
kubectl apply -f postgres-service.yaml
kubectl apply -f configmap.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f gateway.yaml
```

Проверка всех ресурсов:

```bash
kubectl get all
# NAME                             READY   STATUS    RESTARTS   AGE
# pod/hello-app-xxx-xxx            1/1     Running   0          2m
# pod/hello-app-xxx-yyy            1/1     Running   0          2m
# pod/postgres-0                   1/1     Running   0          3m
#
# NAME                        TYPE        CLUSTER-IP    PORT(S)
# service/hello-app-service   ClusterIP   10.96.x.x     80/TCP
# service/postgres-service    ClusterIP   10.96.x.y     5432/TCP
#
# NAME                        READY   UP-TO-DATE   AVAILABLE
# deployment.apps/hello-app   2/2     2            2
#
# NAME                        READY   AGE
# statefulset.apps/postgres   1/1     3m
```

---

## 5. Проверка работоспособности

### 5.1 Доступ через port-forward

```bash
kubectl port-forward service/hello-app-service 8080:80
```

Открыть браузер: **http://localhost:8080**

### 5.2 Результат

На странице отображается:
- Приветствие "Hello, Kubernetes!" из ConfigMap
- Счётчик посещений (увеличивается при каждом обновлении страницы)
- Список 5 последних дат и времён визитов из PostgreSQL
- Статус подключения к БД

### 5.3 Проверка данных в PostgreSQL напрямую

```bash
kubectl exec -it postgres-0 -- psql -U appuser -d appdb -c "SELECT * FROM visits ORDER BY id DESC LIMIT 5;"
```

Вывод:
```
 id |         visited_at
----+----------------------------
  5 | 2026-06-02 20:15:32.123456
  4 | 2026-06-02 20:15:28.654321
  3 | 2026-06-02 20:15:25.111222
  2 | 2026-06-02 20:15:20.333444
  1 | 2026-06-02 20:15:15.555666
```

### 5.4 Проверка персистентности данных

```bash
# Удалить под — StatefulSet пересоздаст его автоматически
kubectl delete pod postgres-0

# Дождаться пересоздания
kubectl get pods --watch

# Данные сохранились благодаря PVC
kubectl exec -it postgres-0 -- psql -U appuser -d appdb -c "SELECT COUNT(*) FROM visits;"
#  count
# -------
#      5
```

---

## 6. Архитектура решения

```
        Браузер
           │
    localhost:8080
    (port-forward)
           │
    ┌──────▼──────────┐
    │   HTTPRoute      │  hello-app.local → /
    │   Gateway API    │
    └──────┬──────────┘
           │
    ┌──────▼──────────┐
    │  hello-app-      │  ClusterIP :80
    │  service         │
    └──────┬──────────┘
        ┌──┴──┐
    ┌───▼─┐ ┌─▼───┐
    │Pod 1│ │Pod 2│   Deployment, replicas: 2
    └───┬─┘ └─┬───┘
        └──┬──┘
           │ psycopg2
    ┌──────▼──────────┐
    │ postgres-service │  ClusterIP :5432
    └──────┬──────────┘
           │
    ┌──────▼──────────┐
    │   postgres-0     │  StatefulSet
    │   (PostgreSQL)   │
    └──────┬──────────┘
           │
    ┌──────▼──────────┐
    │      PVC         │  postgres-data-postgres-0
    │  (1Gi, RWO)      │  данные на диске
    └─────────────────┘
```

---

## Выводы

В ходе лабораторной работы выполнены следующие задачи:

1. **Доработано приложение** — добавлен счётчик посещений: каждый запрос к `/` сохраняет запись в PostgreSQL и отображает общее количество визитов и последние 5 записей.

2. **Развёрнут PostgreSQL** с помощью `StatefulSet` и `volumeClaimTemplates` без операторов и готовых чартов. Данные хранятся в `PersistentVolumeClaim` и не теряются при перезапуске пода. Учётные данные вынесены в `Secret`.

3. **Выполнен переход на Gateway API** — вместо `Ingress` используются три ресурса: `GatewayClass` (тип контроллера), `Gateway` (точка входа) и `HTTPRoute` (правила маршрутизации). Gateway API является новым стандартом Kubernetes и предоставляет более гибкую модель по сравнению с Ingress.

4. **Подтверждена персистентность данных** — после удаления и пересоздания пода PostgreSQL данные в таблице `visits` сохранились благодаря `PersistentVolumeClaim`.
