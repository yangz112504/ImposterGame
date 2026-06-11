package main

import (
	"encoding/json"
	"testing"
)

func TestGameSettingsJSONRoundTrip(t *testing.T) {
	settings := GameSettings{
		Players:       []string{"A", "B", "C"},
		TimerSeconds:  120,
		InfiniteTimer: true,
		ImposterFirst: true,
		SecretMode:    true,
		Category: Category{
			Type:   "custom",
			Prompt: "animals",
			Word:   "koala",
		},
		ClientID: "client-1",
	}

	data, err := json.Marshal(settings)
	if err != nil {
		t.Fatalf("json.Marshal returned error: %v", err)
	}

	var decoded GameSettings
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("json.Unmarshal returned error: %v", err)
	}

	if decoded.TimerSeconds != 120 {
		t.Fatalf("expected timerSeconds to round-trip, got %d", decoded.TimerSeconds)
	}
	if !decoded.InfiniteTimer {
		t.Fatal("expected infiniteTimer to round-trip as true")
	}
	if decoded.Category.Type != "custom" || decoded.Category.Prompt != "animals" || decoded.Category.Word != "koala" {
		t.Fatalf("unexpected category round-trip: %+v", decoded.Category)
	}
	if decoded.ClientID != "client-1" {
		t.Fatalf("expected clientId to round-trip, got %q", decoded.ClientID)
	}
}

func TestNormalizeGameSettingsAppliesDefaults(t *testing.T) {
	settings := GameSettings{}

	normalizeGameSettings(&settings)

	if settings.Category.Type != "general" {
		t.Fatalf("expected default category type to be general, got %q", settings.Category.Type)
	}
	if settings.TimerSeconds != 60 {
		t.Fatalf("expected default timerSeconds to be 60, got %d", settings.TimerSeconds)
	}
}
