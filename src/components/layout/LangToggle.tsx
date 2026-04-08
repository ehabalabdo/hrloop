"use client";

import { useLang } from "@/lib/i18n";

/**
 * Professional AR/EN language toggle — animated pill.
 * Placed in the dock area or as a floating element.
 */
export default function LangToggle() {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className="group relative flex items-center w-[52px] h-7 rounded-full bg-zinc-100 border border-zinc-200/80 transition-all duration-300 hover:border-brand-purple/30 hover:bg-zinc-50 active:scale-95 overflow-hidden"
      title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
      aria-label="Toggle language"
    >
      {/* Sliding indicator */}
      <div
        className={`absolute top-0.5 w-6 h-6 rounded-full gradient-purple shadow-purple-sm transition-all duration-300 ease-out ${
          lang === "ar" ? "left-0.5" : "left-[calc(100%-26px)]"
        }`}
      />
      {/* AR label */}
      <span
        className={`relative z-10 flex-1 text-center text-[10px] font-extrabold tracking-tight transition-colors duration-300 ${
          lang === "ar" ? "text-white" : "text-zinc-400 group-hover:text-zinc-600"
        }`}
      >
        ع
      </span>
      {/* EN label */}
      <span
        className={`relative z-10 flex-1 text-center text-[10px] font-extrabold tracking-tight transition-colors duration-300 ${
          lang === "en" ? "text-white" : "text-zinc-400 group-hover:text-zinc-600"
        }`}
      >
        EN
      </span>
    </button>
  );
}
