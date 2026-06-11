package main

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"
)

const portNum string = ":8080"

func main() {
	rand.Seed(time.Now().UnixNano())
	log.Println("Loading word banks...")
	loadWords("general", "generalWords.txt")
	loadWords("bowdoin", "bowdoinWords.txt")

	if err := InitGemini(); err != nil {
		log.Printf("Gemini initialization skipped: %v\n", err)
	}

	log.Println("Starting up http server")
	http.HandleFunc("/ws", ws)
	http.HandleFunc("/generate-custom-word", generateCustomWord)
	http.HandleFunc("/create-local-game", createLocalGame)
	http.HandleFunc("/games/", localGameRoutes)

	log.Println("Started on port", portNum)
	fmt.Println("To close connection CTRL+C :-)")

	err := http.ListenAndServe(portNum, nil)
	if err != nil {
		log.Fatal(err)
	}
}
