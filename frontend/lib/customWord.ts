"use client";

import { GenerateWordResponse } from "./gameSettings";

type GenerateCustomWordInput = {
  prompt: string;
  clientId: string;
};

type GenerateCustomWordResult = {
  word: string;
  message: string;
};

export async function generateCustomWord({
  prompt,
  clientId,
}: GenerateCustomWordInput): Promise<GenerateCustomWordResult> {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new Error("Please enter a custom prompt first.");
  }

  const apiBase = new URL(process.env.NEXT_PUBLIC_WEB_TEST_URL!);
  const response = await fetch(
    new URL("/generate-custom-word", apiBase).toString(),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: trimmedPrompt,
        clientId,
      }),
    }
  );

  const data = (await response.json()) as GenerateWordResponse;

  if (!response.ok || !data.ok || !data.word) {
    throw new Error(data.error || "Failed to generate word.");
  }

  return {
    word: data.word,
    message: data.message || `Prompt successfully generated for: ${trimmedPrompt}`,
  };
}
