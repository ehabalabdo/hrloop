"use client";

// ============================================================
// Checkout Checklist — Must complete all items before clock-out
// Arabic, mobile-first
// ============================================================

import { useState, useTransition } from "react";
import {
  ClipboardCheck,
  Package,
  PackagePlus,
  Smartphone,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import { saveCheckoutChecklist } from "@/app/(app)/attendance/actions";
import { useLang } from "@/lib/i18n";

interface CheckoutChecklistProps {
  shiftId: string;
  userId: string;
  initialData: {
    inventoryCount: boolean;
    newMerchandise: boolean | null;
    insurancePhones: boolean;
    completedAt: string | null;
  } | null;
  onComplete: () => void;
}

export default function CheckoutChecklist({
  shiftId,
  userId,
  initialData,
  onComplete,
}: CheckoutChecklistProps) {
  const [inventoryCount, setInventoryCount] = useState(initialData?.inventoryCount ?? false);
  const [newMerchandise, setNewMerchandise] = useState<boolean | null>(initialData?.newMerchandise ?? null);
  const [insurancePhones, setInsurancePhones] = useState(initialData?.insurancePhones ?? false);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(!!initialData?.completedAt);
  const { t } = useLang();

  const allDone = inventoryCount && newMerchandise !== null && insurancePhones;

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveCheckoutChecklist({
        shiftId,
        userId,
        inventoryCount,
        newMerchandise,
        insurancePhones,
      });
      if (result.completed) {
        setSaved(true);
        onComplete();
      }
    });
  };

  if (saved) {
    return (
      <div className="w-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-3xl px-5 py-4 flex items-center gap-3">
        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
        <div>
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
            {t.checkin.checklistDone}
          </p>
          <p className="text-xs text-emerald-600/70 dark:text-emerald-500/60 mt-0.5">
            {t.checkin.canCheckOut}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-surface/60 rounded-3xl border border-border-main shadow-sm">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-border-main">
        <div className="flex items-center gap-2.5">
          <ClipboardCheck className="w-5 h-5 text-brand-purple" />
          <h3 className="text-base font-bold text-foreground">
            {t.checkin.checkoutChecklist}
          </h3>
        </div>
        <p className="text-xs text-muted-light mt-1">
          {t.checkin.mustCompleteAll}
        </p>
      </div>

      {/* Checklist Items */}
      <div className="px-5 py-4 space-y-4">
        {/* 1. Inventory Count */}
        <button
          onClick={() => setInventoryCount(!inventoryCount)}
          className="w-full flex items-center gap-3 text-right"
        >
          {inventoryCount ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
          ) : (
            <Circle className="w-6 h-6 text-zinc-300 dark:text-zinc-600 shrink-0" />
          )}
          <Package className="w-5 h-5 text-zinc-400 shrink-0" />
          <div className="flex-1 text-right">
            <p className={`text-sm font-semibold ${inventoryCount ? "text-emerald-600 dark:text-emerald-400 line-through" : "text-zinc-700 dark:text-zinc-300"}`}>
              {t.checkin.inventoryCount}
            </p>
            <p className="text-xs text-zinc-400">{t.checkin.inventoryDone}</p>
          </div>
        </button>

        {/* 2. New Merchandise */}
        <div className="flex items-center gap-3">
          {newMerchandise !== null ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
          ) : (
            <Circle className="w-6 h-6 text-zinc-300 dark:text-zinc-600 shrink-0" />
          )}
          <PackagePlus className="w-5 h-5 text-zinc-400 shrink-0" />
          <div className="flex-1">
            <p className={`text-sm font-semibold text-right ${newMerchandise !== null ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-300"}`}>
              {t.checkin.newGoods}
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setNewMerchandise(true)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                  newMerchandise === true
                    ? "bg-emerald-500 text-white shadow-md"
                    : "bg-surface-hover text-zinc-500 hover:bg-surface-hover"
                }`}
              >
                {t.common.yes}
              </button>
              <button
                onClick={() => setNewMerchandise(false)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                  newMerchandise === false
                    ? "bg-red-500 text-white shadow-md"
                    : "bg-surface-hover text-zinc-500 hover:bg-surface-hover"
                }`}
              >
                {t.common.no}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Insurance Phones */}
        <button
          onClick={() => setInsurancePhones(!insurancePhones)}
          className="w-full flex items-center gap-3 text-right"
        >
          {insurancePhones ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
          ) : (
            <Circle className="w-6 h-6 text-zinc-300 dark:text-zinc-600 shrink-0" />
          )}
          <Smartphone className="w-5 h-5 text-zinc-400 shrink-0" />
          <div className="flex-1 text-right">
            <p className={`text-sm font-semibold ${insurancePhones ? "text-emerald-600 dark:text-emerald-400 line-through" : "text-zinc-700 dark:text-zinc-300"}`}>
              {t.checkin.insurancePhones}
            </p>
            <p className="text-xs text-zinc-400">{t.checkin.insuranceDone}</p>
          </div>
        </button>
      </div>

      {/* Save Button */}
      <div className="px-5 pb-5">
        <button
          onClick={handleSave}
          disabled={!allDone || isPending}
          className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-brand-purple text-white shadow-lg shadow-brand-purple/20 hover:bg-brand-primary-dark active:scale-[0.97]"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ClipboardCheck className="w-4 h-4" />
          )}
          {isPending ? t.checkin.saving : t.checkin.confirmComplete}
        </button>
        {!allDone && (
          <p className="text-center text-xs text-amber-500 mt-2">
            {t.checkin.completeAllFirst}
          </p>
        )}
      </div>
    </div>
  );
}
