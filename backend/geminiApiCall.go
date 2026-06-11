package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/joho/godotenv"
	"google.golang.org/genai"
)

var (
	GeminiClient *genai.Client

	geminiLimiter = NewRateLimiter(2, time.Minute)

	ErrGeminiRateLimited = errors.New("gemini rate limited")
	ErrGeminiRejected    = errors.New("gemini rejected category")
	ErrGeminiTimeout     = errors.New("gemini request timed out")
	ErrGeminiUnavailable = errors.New("gemini unavailable")
)

type CategoryResponse struct {
	Approved bool   `json:"approved"`
	Category string `json:"category"`
	Word     string `json:"word"`
	Reason   string `json:"reason"`
}

type RateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	limit    int
	window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}
}

func (r *RateLimiter) Allow(userID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-r.window)

	reqs := r.requests[userID]
	valid := make([]time.Time, 0, len(reqs))
	for _, t := range reqs {
		if t.After(windowStart) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= r.limit {
		r.requests[userID] = valid
		return false
	}

	valid = append(valid, now)
	r.requests[userID] = valid

	return true
}

// InitGemini initializes the Gemini API client using the API key from environment variables.
func InitGemini() error {
	_ = godotenv.Load()

	apiKey := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if apiKey == "" {
		return fmt.Errorf("GEMINI_API_KEY is not set")
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return err
	}

	GeminiClient = client
	return nil
}

func GenerateWordFromCategory(category string, userID string, limiter *RateLimiter) (*CategoryResponse, error) {
	if GeminiClient == nil {
		return nil, fmt.Errorf("%w: client is not initialized", ErrGeminiUnavailable)
	}

	if limiter == nil {
		limiter = geminiLimiter
	}

	userID = strings.TrimSpace(userID)
	if userID == "" {
		userID = "anonymous"
	}

	if !limiter.Allow(userID) {
		return nil, fmt.Errorf("%w: please wait before requesting another custom prompt", ErrGeminiRateLimited)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	prompt := fmt.Sprintf(`
		Return ONLY valid JSON.

		Allow niche recognizable topics.
		Reject private references, personal names, gibberish, or categories with only one answer.

		If valid, generate one related word or short phrase.

		Valid:
		{"approved":true,"word":"example"}

		Rejected:
		{"approved":false,"reason":"why"}

		Category: %q
		`, category)

	resp, err := GeminiClient.Models.GenerateContent(
		ctx,
		"gemini-2.5-flash",
		genai.Text(prompt),
		nil,
	)

	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return nil, fmt.Errorf("%w: the Gemini request took too long", ErrGeminiTimeout)
		}
		return nil, fmt.Errorf("%w: %v", ErrGeminiUnavailable, err)
	}

	raw := cleanGeminiResponse(resp.Text())
	if raw == "" {
		return nil, fmt.Errorf("%w: Gemini returned an empty response", ErrGeminiUnavailable)
	}

	var result CategoryResponse
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return nil, fmt.Errorf("%w: invalid JSON from Gemini: %v", ErrGeminiUnavailable, err)
	}

	result.Category = strings.TrimSpace(result.Category)
	if result.Category == "" {
		result.Category = category
	}
	result.Word = strings.TrimSpace(result.Word)
	result.Reason = strings.TrimSpace(result.Reason)

	if !result.Approved {
		if result.Reason == "" {
			result.Reason = "The category was rejected by Gemini."
		}
		return &result, fmt.Errorf("%w: %s", ErrGeminiRejected, result.Reason)
	}

	if result.Word == "" {
		return &result, fmt.Errorf("%w: Gemini approved the category but did not return a word", ErrGeminiUnavailable)
	}

	return &result, nil
}

func cleanGeminiResponse(text string) string {
	text = strings.TrimSpace(text)

	if strings.HasPrefix(text, "```json") {
		text = strings.TrimPrefix(text, "```json")
	}
	if strings.HasPrefix(text, "```") {
		text = strings.TrimPrefix(text, "```")
	}
	if strings.HasSuffix(text, "```") {
		text = strings.TrimSuffix(text, "```")
	}

	return strings.TrimSpace(text)
}

func geminiErrorMessage(err error, result *CategoryResponse) string {
	switch {
	case errors.Is(err, ErrGeminiRateLimited):
		return "Too many custom prompt requests. Please wait a minute and try again."
	case errors.Is(err, ErrGeminiRejected):
		if result != nil && result.Reason != "" {
			return result.Reason
		}
		return "That category was rejected."
	case errors.Is(err, ErrGeminiTimeout):
		return "The Gemini request timed out. Please try again."
	case errors.Is(err, ErrGeminiUnavailable):
		return strings.TrimSpace(strings.TrimPrefix(err.Error(), ErrGeminiUnavailable.Error()+":"))
	default:
		if err == nil {
			return ""
		}
		return err.Error()
	}
}

func geminiHTTPStatus(err error) int {
	switch {
	case errors.Is(err, ErrGeminiRateLimited):
		return 429
	case errors.Is(err, ErrGeminiRejected):
		return 422
	case errors.Is(err, ErrGeminiTimeout):
		return 504
	case errors.Is(err, ErrGeminiUnavailable):
		return 502
	default:
		return 500
	}
}
