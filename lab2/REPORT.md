# Лабораторная работа №2 — Развёртывание приложения в Kubernetes

**Студент:** *Плотникова Серафима Романовна*  
**Группа:** *9 группа*  

---

## Введение

Цель данной лабораторной работы — освоить практику контейнеризации приложений и их развёртывания в кластере Kubernetes с использованием Minikube. В ходе работы необходимо:

1. Развернуть локальный кластер Kubernetes (Minikube).
2. Написать простое REST-приложение на Python (Flask), которое возвращает HTML-страницу с контентом из переменной окружения.
3. Собрать Docker-образ и опубликовать его на Docker Hub.
4. Применить манифесты Kubernetes: `Deployment`, `ConfigMap`, `Service`, `Ingress`.
5. Проверить работоспособность приложения.

---

## 1. Установка и настройка Minikube

### 1.1 Используемые инструменты

- ОС: Windows 11 Pro
- Docker Desktop 29.2.0
- Minikube v1.38.1
- kubectl v1.34.1

### 1.2 Запуск кластера

```bash
minikube start --driver=docker
```

Вывод:
```
* minikube v1.38.1 на Microsoft Windows 11 Pro
* Using Docker Desktop driver with root privileges
* Starting "minikube" primary control-plane node in "minikube" cluster
* Подготавливается Kubernetes v1.35.1 на Docker 29.2.1 ...
* Готово! kubectl настроен для использования кластера "minikube"
```

### 1.3 Включение Ingress-аддона

```bash
minikube addons enable ingress
kubectl get pods -n ingress-nginx
```

Вывод:
```
NAME                                        READY   STATUS      RESTARTS   AGE
ingress-nginx-admission-create-4v9hv        0/1     Completed   0          93s
ingress-nginx-admission-patch-n5r89         0/1     Completed   0          93s
ingress-nginx-controller-596f8778bc-bdcqf   1/1     Running     0          93s
```

---

## 2. Разработка приложения

### 2.1 Структура проекта

```
lab2/
├── app/
│   ├── app.py            # Flask-приложение
│   ├── requirements.txt  # Зависимости Python
│   └── Dockerfile        # Образ контейнера
├── k8s/
│   ├── configmap.yaml    # Конфигурация
│   ├── deployment.yaml   # Развёртывание
│   ├── service.yaml      # Сервис
│   └── ingress.yaml      # Ingress
└── REPORT.md
```

### 2.2 Flask-приложение

Приложение читает переменные окружения `NAME` и `BG_COLOR` из ConfigMap и подставляет их в HTML-ответ:

```python
import os
from flask import Flask

app = Flask(__name__)

@app.route("/")
def index():
    name = os.environ.get("NAME", "World")
    color = os.environ.get("BG_COLOR", "#1a1a2e")
    return f"""<!DOCTYPE html>
<html lang="en">
<head><title>Hello from K8s</title></head>
<body style="background:{color}">
    <h1>Hello, {name}!</h1>
    <p>Running on Kubernetes</p>
</body>
</html>"""

@app.route("/health")
def health():
    return {"status": "ok"}, 200
```

Эндпоинт `/health` используется Kubernetes для liveness и readiness проверок.

### 2.3 Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]
```

---

## 3. Сборка и публикация образа на Docker Hub

### 3.1 Сборка образа

```bash
docker build -t qmayone/hello-k8s:latest .
```

Вывод:
```
[+] Building 39.9s (11/11) FINISHED
 => [1/5] FROM docker.io/library/python:3.12-slim
 => [4/5] RUN pip install --no-cache-dir -r requirements.txt
 => exporting to image
 => naming to docker.io/qmayone/hello-k8s:latest
```

### 3.2 Публикация на Docker Hub

```bash
docker login
docker push qmayone/hello-k8s:latest
```

Вывод:
```
The push refers to repository [docker.io/qmayone/hello-k8s]
f37933f66bed: Pushed
e113665b194b: Pushed
latest: digest: sha256:26d7eec214b1663c7903bd141ecb1ac826867c336c3db200f9badaafa3afcd5a size: 856
```

Образ доступен по адресу: `docker.io/qmayone/hello-k8s:latest`

---

## 4. Манифесты Kubernetes

### 4.1 ConfigMap

ConfigMap хранит конфигурацию приложения отдельно от образа:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hello-app-config
  namespace: default
data:
  NAME: "Kubernetes"
  BG_COLOR: "#0f172a"
```

```bash
kubectl apply -f configmap.yaml
# configmap/hello-app-config created
```

### 4.2 Deployment

Deployment управляет жизненным циклом подов — 2 реплики, health checks, переменные из ConfigMap:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hello-app
  template:
    spec:
      containers:
        - name: hello-app
          image: qmayone/hello-k8s:latest
          envFrom:
            - configMapRef:
                name: hello-app-config
          livenessProbe:
            httpGet:
              path: /health
              port: 5000
```

```bash
kubectl apply -f deployment.yaml
# deployment.apps/hello-app created

kubectl get pods
# NAME                         READY   STATUS    RESTARTS   AGE
# hello-app-6467bb7f49-cdrw5   1/1     Running   0          68s
# hello-app-6467bb7f49-kzkxq   1/1     Running   0          68s
```

### 4.3 Service

Service типа ClusterIP обеспечивает стабильный внутрикластерный адрес:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: hello-app-service
spec:
  selector:
    app: hello-app
  ports:
    - port: 80
      targetPort: 5000
  type: ClusterIP
```

```bash
kubectl apply -f service.yaml
# service/hello-app-service created
```

### 4.4 Ingress

Ingress маршрутизирует внешний HTTP-трафик на Service:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hello-app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: hello-app.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: hello-app-service
                port:
                  number: 80
```

```bash
kubectl apply -f ingress.yaml
# ingress.networking.k8s.io/hello-app-ingress created

kubectl get ingress
# NAME                CLASS   HOSTS             ADDRESS        PORTS   AGE
# hello-app-ingress   nginx   hello-app.local   192.168.49.2   80      4m
```

---

## 5. Проверка работоспособности

### 5.1 Проверка подов и ресурсов

```bash
kubectl get pods
# NAME                         READY   STATUS    RESTARTS   AGE
# hello-app-6467bb7f49-cdrw5   1/1     Running   0          5m
# hello-app-6467bb7f49-kzkxq   1/1     Running   0          5m
```

### 5.2 Доступ через port-forward

На Windows Minikube с драйвером Docker не пробрасывает порты напрямую,
поэтому использован kubectl port-forward:

```bash
kubectl port-forward service/hello-app-service 8080:80
```

### 5.3 Результат в браузере

При открытии `http://localhost:8080` отображается страница с тёмным фоном
и приветственным текстом "Привет, Kubernetes!" — браузер автоматически
перевёл "Hello" на русский язык. Текст сформирован из значения переменной
`NAME=Kubernetes` в ConfigMap.

---

## 6. Архитектура решения

```
        Браузер
           │
    localhost:8080
    (port-forward)
           │
    ┌──────▼───────┐
    │   Ingress    │  nginx, hello-app.local
    └──────┬───────┘
           │
    ┌──────▼───────┐
    │   Service    │  ClusterIP :80 → :5000
    └──────┬───────┘
        ┌──┴──┐
    ┌───▼─┐ ┌─▼───┐
    │Pod 1│ │Pod 2│   replicas: 2
    └───┬─┘ └─┬───┘
        └──┬──┘
    ┌──────▼───────┐
    │  ConfigMap   │  NAME=Kubernetes
    └──────────────┘
```

---

## Выводы

В ходе лабораторной работы были выполнены следующие задачи:

1. **Развёрнут локальный кластер Kubernetes** с помощью Minikube на Windows 11 с включённым Ingress-контроллером (nginx).

2. **Разработано REST-приложение** на Python (Flask), которое читает переменные окружения (`NAME`, `BG_COLOR`) и отображает их в HTML-странице, демонстрируя принцип конфигурирования через окружение.

3. **Собран и опубликован Docker-образ** `qmayone/hello-k8s:latest` на Docker Hub.

4. **Применены ключевые ресурсы Kubernetes:**
   - `ConfigMap` — внешнее хранение конфигурации отдельно от кода
   - `Deployment` — управление репликами (2 шт.), rolling updates, health checks
   - `Service` (ClusterIP) — балансировка нагрузки между подами
   - `Ingress` — маршрутизация внешнего трафика по hostname

5. **Подтверждена работоспособность** приложения через `kubectl port-forward`: страница отображает приветствие из ConfigMap. Изменение ConfigMap и перезапуск Deployment меняют отображаемые данные без пересборки образа.

Полученные навыки позволяют развёртывать приложения в Kubernetes, разделять конфигурацию от кода и обеспечивать отказоустойчивость через реплики.
