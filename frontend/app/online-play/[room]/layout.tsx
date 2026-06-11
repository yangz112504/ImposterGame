"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnlineLobbyStore } from "@/lib/onlineLobbyStore";

export default function OnlineRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const hostLeft = useOnlineLobbyStore((s) => s.hostLeft);

  useEffect(() => {
    if (hostLeft) {
      router.push("/online-play");
    }
  }, [hostLeft, router]);

  return <>{children}</>;
}