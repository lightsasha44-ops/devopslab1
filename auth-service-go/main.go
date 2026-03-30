package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
)

func main() {
	// Маршруты
	http.HandleFunc("/api/auth/health", corsMiddleware(healthHandler))
	http.HandleFunc("/api/auth/register", corsMiddleware(registerHandler))
	http.HandleFunc("/api/auth/login", corsMiddleware(loginHandler))
	http.HandleFunc("/health", corsMiddleware(healthHandler))
	http.HandleFunc("/register", corsMiddleware(registerHandler))
	http.HandleFunc("/login", corsMiddleware(loginHandler))

	port := "8081"
	log.Printf("Auth service starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next(w, r)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("Register: %s %s", r.Method, r.URL.Path)
	
	body, _ := io.ReadAll(r.Body)
	log.Printf("Body: %s", string(body))
	
	var req map[string]string
	json.Unmarshal(body, &req)
	
	email := req["email"]
	if email == "" {
		email = "admin"
	}
	
	// Формат ответа, который ожидает фронтенд
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Registration successful",
		"token":   "mock-token-" + email,
	})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("Login: %s %s", r.Method, r.URL.Path)
	
	body, _ := io.ReadAll(r.Body)
	log.Printf("Body: %s", string(body))
	
	var req map[string]string
	json.Unmarshal(body, &req)
	
	email := req["email"]
	if email == "" {
		email = "admin"
	}
	
	// Проверяем, если admin, даём админские права
	isAdmin := email == "admin"
	
	// Формат ответа, который ожидает фронтенд
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":    true,
		"message":    "Login successful",
		"token":      "mock-token-" + email,
		"user": map[string]interface{}{
			"email":   email,
			"isAdmin": isAdmin,
			"name":    email,
		},
	})
}