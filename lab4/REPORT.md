# Лабораторная работа №4 — Helm, CloudNativePG, CertManager

**Студент:** *Плотникова Серафима Романовна*  
**Группа:** *9 группа*  

---

## Введение

Работа является продолжением лабораторных №2 и №3. Цели:

1. Переработать развёртывание с обычных манифестов на **Helm-чарт**.
2. Заменить самостоятельно развёрнутый PostgreSQL StatefulSet на оператор **CloudNativePG**.
3. Добавить **самоподписанные TLS-сертификаты** через оператор **CertManager**.
4. Gateway API устанавливается и настраивается через Helm-шаблоны.

---

## 1. Установка инструментов и операторов

### 1.1 Установка Helm

```bash
winget install Helm.Helm
helm version
# version.BuildInfo{Version:"v3.x.x", ...}
```

### 1.2 Установка CertManager

CertManager устанавливался через манифест (из-за сетевых ограничений вместо `helm install`):

```bash
kubectl apply -f operators/cert-manager.yaml
kubectl get pods -n cert-manager
```

Вывод после запуска:
```
NAME                                       READY   STATUS    AGE
cert-manager-6df5dc95bc-zg8l8              1/1     Running   2m
cert-manager-cainjector-6db8d6475c-mmjml   1/1     Running   2m
cert-manager-webhook-74ff45596c-dkpq4      1/1     Running   2m
```

CertManager создаёт CRD: `Certificate`, `Issuer`, `ClusterIssuer`, `CertificateRequest`.

### 1.3 Установка CloudNativePG

```bash
kubectl apply -f operators/cnpg-1.23.1.yaml
kubectl get pods -n cnpg-system
```

Вывод:
```
NAME                                      READY   STATUS    AGE
cnpg-controller-manager-846476d5d-274mw   1/1     Running   2m
```

CloudNativePG создаёт CRD: `Cluster`, `Backup`, `ScheduledBackup`, `Pooler`.

### 1.4 Установка Gateway API CRD

```bash
kubectl apply -f operators/standard-install.yaml
kubectl get crd | grep gateway
```

Вывод:
```
gatewayclasses.gateway.networking.k8s.io
gateways.gateway.networking.k8s.io
httproutes.gateway.networking.k8s.io
```

---

## 2. Структура Helm-чарта

```
lab4/helm/hello-app/
├── Chart.yaml              # метаданные чарта
├── values.yaml             # значения по умолчанию
└── templates/
    ├── NOTES.txt           # инструкция после установки
    ├── configmap.yaml      # ConfigMap приложения
    ├── deployment.yaml     # Deployment приложения
    ├── service.yaml        # Service приложения
    ├── postgres-secret.yaml # Secret с паролем БД
    ├── postgres-cluster.yaml # CloudNativePG Cluster
    ├── certificate.yaml    # CertManager Issuer + Certificate
    └── gateway.yaml        # GatewayClass + Gateway + HTTPRoute
```

### 2.1 Chart.yaml

```yaml
apiVersion: v2
name: hello-app
description: A Helm chart for Hello K8s app with PostgreSQL, Gateway API and TLS
version: 1.0.0
appVersion: "v2"
```

### 2.2 values.yaml — главное отличие от обычных манифестов

Все параметры вынесены в `values.yaml`. Это позволяет переиспользовать чарт для разных окружений:

```yaml
app:
  replicas: 2
  image:
    repository: qmayone/hello-k8s
    tag: v2

postgres:
  clusterName: postgres-cluster
  instances: 1
  database: appdb
  owner: appuser

gateway:
  host: hello-app.local
  tlsSecretName: hello-app-tls-secret

certManager:
  issuerName: selfsigned-issuer
  duration: 8760h
```

Для production можно переопределить любое значение:
```bash
helm install hello-app ./helm/hello-app \
  --set app.replicas=3 \
  --set gateway.host=myapp.example.com
```

---

## 3. CloudNativePG вместо StatefulSet

### 3.1 Отличие от ручного StatefulSet

| | StatefulSet (lab3) | CloudNativePG (lab4) |
|---|---|---|
| Управление | Вручную | Оператор |
| HA | Нет | Да (несколько instances) |
| Бэкапы | Нет | Встроенные |
| Мониторинг | Нет | Встроенный |
| Обновления | Вручную | Rolling update |

### 3.2 Ресурс Cluster

Вместо `StatefulSet` + `Service` + `PVC` — один ресурс `Cluster`:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: {{ .Values.postgres.clusterName }}
spec:
  instances: {{ .Values.postgres.instances }}
  imageName: {{ .Values.postgres.imageName }}
  bootstrap:
    initdb:
      database: {{ .Values.postgres.database }}
      owner: {{ .Values.postgres.owner }}
      secret:
        name: {{ .Values.postgres.secretName }}
  storage:
    size: {{ .Values.postgres.storage.size }}
```

CloudNativePG автоматически создаёт:
- `StatefulSet` с подами PostgreSQL
- `Service` `postgres-cluster-rw` — для записи (primary)
- `Service` `postgres-cluster-ro` — для чтения (replica)
- `PersistentVolumeClaim` для каждого инстанса
- `Secret` с учётными данными

Приложение подключается к `postgres-cluster-rw:5432`.

---

## 4. CertManager — самоподписанные сертификаты

### 4.1 Как это работает

```
Issuer (selfsigned) → Certificate → Secret (TLS)
                                        ↓
                                   Gateway (TLS listener)
```

### 4.2 Issuer

`Issuer` — объект, который умеет выдавать сертификаты. Тип `selfSigned` означает что сертификат подписывает сам себя (не требует внешнего CA):

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: {{ .Values.certManager.issuerName }}
spec:
  selfSigned: {}
```

### 4.3 Certificate

`Certificate` описывает какой сертификат нужен. CertManager автоматически создаёт TLS Secret:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: {{ .Values.certManager.certificateName }}
spec:
  secretName: {{ .Values.gateway.tlsSecretName }}
  duration: {{ .Values.certManager.duration }}
  dnsNames:
    - {{ .Values.gateway.host }}
  issuerRef:
    name: {{ .Values.certManager.issuerName }}
    kind: Issuer
```

После применения CertManager создаёт Secret `hello-app-tls-secret` с полями `tls.crt` и `tls.key`.

### 4.4 Проверка сертификата

```bash
kubectl get certificate
# NAME             READY   SECRET                AGE
# hello-app-tls    True    hello-app-tls-secret  30s

kubectl describe certificate hello-app-tls
# Status: Ready = True
# Not Before: 2026-06-06
# Not After:  2027-06-06
```

---

## 5. Gateway API с TLS

### 5.1 Gateway с двумя listener'ами

```yaml
spec:
  listeners:
    - name: http
      protocol: HTTP
      port: 80
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: hello-app-tls-secret
```

### 5.2 HTTPRoute — редирект HTTP → HTTPS

```yaml
rules:
  - matches:
      - path:
          type: PathPrefix
          value: /
    filters:
      - type: RequestRedirect
        requestRedirect:
          scheme: https
          statusCode: 301
```

---

## 6. Установка чарта

### 6.1 Предварительные требования

```bash
# 1. Установить операторы
kubectl apply -f lab4/operators/cert-manager.yaml
kubectl apply -f lab4/operators/cnpg-1.23.1.yaml
kubectl apply -f lab4/operators/standard-install.yaml

# 2. Дождаться готовности операторов
kubectl wait --for=condition=Available deployment/cert-manager -n cert-manager --timeout=3m
kubectl wait --for=condition=Available deployment/cnpg-controller-manager -n cnpg-system --timeout=3m
```

### 6.2 Установка чарта

```bash
cd lab4
helm install hello-app ./helm/hello-app
```

Вывод:
```
NAME: hello-app
LAST DEPLOYED: Sat Jun 06 2026
NAMESPACE: default
STATUS: deployed
REVISION: 1
NOTES:
Thank you for installing hello-app!
...
```

### 6.3 Проверка

```bash
helm list
# NAME        NAMESPACE  REVISION  STATUS    CHART           APP VERSION
# hello-app   default    1         deployed  hello-app-1.0.0  v2

kubectl get pods
# NAME                         READY   STATUS    AGE
# hello-app-xxx-xxx            1/1     Running   1m
# hello-app-xxx-yyy            1/1     Running   1m
# postgres-cluster-1           1/1     Running   1m

kubectl get certificate
# NAME            READY   SECRET                AGE
# hello-app-tls   True    hello-app-tls-secret  1m

kubectl get gateway
# NAME            CLASS   ADDRESS        PROGRAMMED  AGE
# hello-gateway   nginx   192.168.49.2   True        1m
```

### 6.4 Обновление значений

```bash
# Изменить имя без пересоздания всего
helm upgrade hello-app ./helm/hello-app --set app.config.name="DevOps"

# Увеличить реплики
helm upgrade hello-app ./helm/hello-app --set app.replicas=3
```

### 6.5 Откат

```bash
helm rollback hello-app 1
```

---

## 7. Архитектура решения

```
  Браузер
     │
     │ https://hello-app.local
     │
┌────▼──────────────┐
│   Gateway (HTTPS) │  ← TLS сертификат из CertManager
│   port 443        │    (Issuer → Certificate → Secret)
└────┬──────────────┘
     │ HTTPRoute
┌────▼──────────────┐
│  hello-app-service│  ClusterIP :80
└────┬──────────────┘
  ┌──┴──┐
┌─▼──┐ ┌▼───┐
│Pod1│ │Pod2│  Deployment (values: replicas=2)
└─┬──┘ └┬───┘
  └──┬──┘  envFrom ConfigMap
     │     DB_PASSWORD from Secret
┌────▼──────────────┐
│postgres-cluster-rw│  CloudNativePG Service
└────┬──────────────┘
┌────▼──────────────┐
│  Cluster (CNPG)   │  instances=1, storage=1Gi
│  postgres-cluster │  (оператор создал StatefulSet+PVC)
└───────────────────┘
```

---

## Выводы

1. **Helm** позволяет параметризовать манифесты через `values.yaml` и управлять релизами (`install`, `upgrade`, `rollback`). Вместо 7 отдельных yaml-файлов — один чарт с единым интерфейсом настройки.

2. **CloudNativePG** заменяет ручной `StatefulSet` на управляемый оператором кластер PostgreSQL. Оператор берёт на себя создание StatefulSet, Service, PVC, обработку failover и бэкапы. Достаточно описать ресурс `Cluster`.

3. **CertManager** автоматизирует выпуск TLS-сертификатов. Тип `selfSigned` подходит для локальной разработки. В production используется `Let's Encrypt` или корпоративный CA — меняется только `spec.issuerRef`, остальное то же самое.

4. **Gateway API с TLS** — два listener'а (HTTP→редирект, HTTPS→приложение) и сертификат из CertManager Secret обеспечивают полноценный HTTPS без ручного управления сертификатами.
