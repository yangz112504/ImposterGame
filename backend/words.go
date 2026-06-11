package main

import (
	"log"
	"os"
	"strings"
)

var wordBanks = map[string][]string{}

func loadWords(categoryType, filePath string) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		log.Fatal("Failed to load words:", err)
	}

	words := make([]string, 0)
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			words = append(words, line)
		}
	}
	wordBanks[categoryType] = words
	log.Printf("Loaded %d %s words\n", len(words), categoryType)
}

func getWordBank(categoryType string) []string {
	if words, exists := wordBanks[categoryType]; exists && len(words) > 0 {
		return words
	}
	return wordBanks["general"]
}
