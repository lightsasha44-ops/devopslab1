FROM golang:1.21-alpine

WORKDIR /app

# Копируем go.mod
COPY go.mod ./

# Копируем main.go
COPY main.go ./

# Собираем
RUN go build -o auth-service main.go

EXPOSE 8081

CMD ["./auth-service"]