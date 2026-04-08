// ============================================================
// LoginForm — Client component for the login form
// Uses useActionState for server action integration
// ============================================================

"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { LogIn, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { useLang } from "@/lib/i18n";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const { t } = useLang();

  return (
    <form action={formAction} className="space-y-4">
      {/* Error Message */}
      {state.error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400" dir="rtl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
        >
          {t.login.email}
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            dir="ltr"
            placeholder="name@company.com"
            className="w-full pl-10 pr-4 py-2.5 bg-surface-hover border border-border-main rounded-xl text-sm text-foreground placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple transition-colors"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
        >
          {t.login.password}
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            dir="ltr"
            placeholder="••••••••"
            className="w-full pl-10 pr-4 py-2.5 bg-surface-hover border border-border-main rounded-xl text-sm text-foreground placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple transition-colors"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-3 bg-brand-primary hover:bg-brand-primary/90 disabled:bg-brand-primary/60 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-brand-magenta/25"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t.login.loading}</span>
          </>
        ) : (
          <>
            <LogIn className="w-4 h-4" />
            <span>{t.login.submit}</span>
          </>
        )}
      </button>
    </form>
  );
}
