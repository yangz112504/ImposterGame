package main

import (
	"net/http"
	"os"
)

func handlePreflight(w http.ResponseWriter, r *http.Request) bool {
	allowedOrigin := os.Getenv("FRONTEND_ORIGIN")

	w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return true
	}

	return false
}
