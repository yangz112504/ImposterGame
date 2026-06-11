// Client ID is used to identify the browser/session for custom-word generation and rate limiting. It is not a secret value and does not need to be cryptographically secure, but it should be unique enough to avoid collisions between different users.
// prevents one user from spamming the Gemini request.
// It keeps requests grouped per browser instead of everyone sharing "anonymous".
// In local play, it’s not needed for game logic, only for the custom-word API.


const CLIENT_ID_KEY = "imposter-game-client-id"

function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `client_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function getOrCreateClientId() {
  if (typeof window === "undefined") {
    return ""
  }

  const existing = window.localStorage.getItem(CLIENT_ID_KEY)
  if (existing) {
    return existing
  }

  const clientId = createClientId()
  window.localStorage.setItem(CLIENT_ID_KEY, clientId)
  return clientId
}
