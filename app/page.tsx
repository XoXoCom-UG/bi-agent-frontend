"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Root() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(session ? "/chat" : "/login");
    }
  }, [session, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
        style={{ background: "var(--green)", fontFamily: "Georgia,serif" }}>B</div>
      <div className="thinking-spinner" style={{ width: 20, height: 20 }} />
    </div>
  );
}
