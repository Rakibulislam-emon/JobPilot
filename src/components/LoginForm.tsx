"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setBusy(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label
          htmlFor="email"
          className="text-[10.5px] font-semibold tracking-[0.1em] text-muted uppercase"
        >
          Email
        </Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="password"
          className="text-[10.5px] font-semibold tracking-[0.1em] text-muted uppercase"
        >
          Password
        </Label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy} size="lg" className="w-full">
        {busy ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-[11px] text-muted">
        Single-user workspace. Create your account in Supabase → Authentication →
        Users, then sign in here.
      </p>
    </form>
  );
}
