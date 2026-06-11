package main

import (
	"errors"
	"fmt"
	"testing"
	"time"
)

func TestRateLimiterAllow(t *testing.T) {
	limiter := NewRateLimiter(2, time.Minute)

	if !limiter.Allow("player-1") {
		t.Fatal("first request should be allowed")
	}

	if !limiter.Allow("player-1") {
		t.Fatal("second request should be allowed")
	}

	if limiter.Allow("player-1") {
		t.Fatal("third request should be rate limited")
	}
}

func TestGeminiErrorMessageForRejection(t *testing.T) {
	err := fmt.Errorf("%w: category is too specific", ErrGeminiRejected)
	result := &CategoryResponse{Reason: "category is too specific"}

	if got := geminiErrorMessage(err, result); got != "category is too specific" {
		t.Fatalf("unexpected message: %q", got)
	}
}

func TestGeminiHTTPStatus(t *testing.T) {
	cases := []struct {
		name string
		err  error
		want int
	}{
		{name: "rate limited", err: ErrGeminiRateLimited, want: 429},
		{name: "rejected", err: ErrGeminiRejected, want: 422},
		{name: "timeout", err: ErrGeminiTimeout, want: 504},
		{name: "unavailable", err: ErrGeminiUnavailable, want: 502},
		{name: "other", err: errors.New("other"), want: 500},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := geminiHTTPStatus(tc.err); got != tc.want {
				t.Fatalf("unexpected status: got %d want %d", got, tc.want)
			}
		})
	}
}
