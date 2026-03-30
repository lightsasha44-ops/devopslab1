FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json
COPY package.json .

# Устанавливаем зависимости
RUN npm install

# Копируем всё остальное
COPY . .

# Собираем проект
RUN npm run build

# Финальный этап
FROM nginx:alpine

# Копируем собранные файлы
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]