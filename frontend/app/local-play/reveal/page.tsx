"use client"
import RevealView from "@/components/game/RevealView";
import { useRouter } from "next/navigation";

export default function LocalReveal() {
  const router = useRouter();
  
  return (
    <RevealView 
      onComplete={() => router.push("/local-play/game")}
      onCancel={() => router.push("/local-play")}
    />
  );
}
