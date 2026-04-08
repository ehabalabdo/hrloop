"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { WeeklyScheduleData } from "@/lib/schedule-types";
import { DAY_NAMES_AR } from "@/lib/schedule-types";

/**
 * Export the weekly schedule as a landscape PDF table.
 * Columns = days of the week, rows = branches, cells = employee names + times.
 *
 * NOTE: jsPDF doesn't support Arabic shaping natively.
 *       We use a workaround: reverse the display string so it renders
 *       visually correct in the LTR canvas (basic RTL emulation).
 *       For truly complex Arabic, a server-rendered PDF would be better.
 */

// Simple Arabic text reversal for jsPDF (handles most common cases)
function reverseArabic(text: string): string {
  // Split by newlines, reverse each line's characters
  return text
    .split("\n")
    .map((line) => line.split("").reverse().join(""))
    .join("\n");
}

// Format time from ISO string
function fmtTime(dateStr?: string | Date): string {
  if (!dateStr) return "--:--";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function exportSchedulePDF(
  data: WeeklyScheduleData,
  weekStart: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Build 7-day date array
  const monday = new Date(weekStart);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  // Table headers: Branch name + 7 days
  const headers = [
    "Branch",
    ...weekDays.map((ds, i) => {
      const d = new Date(ds);
      const dayName = DAY_NAMES_AR[d.getDay()];
      const dateLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      return `${dayName}\n${dateLabel}`;
    }),
  ];

  // Table body: one row per branch
  const body: string[][] = [];

  for (const branch of data.branches) {
    const row: string[] = [branch.name];
    for (const dateStr of weekDays) {
      const day = branch.days.find((d) => d.date === dateStr);
      if (!day || day.assignedStaff.length === 0) {
        row.push("-");
      } else {
        const names = day.assignedStaff.map((e) => {
          const time = `${fmtTime(e.scheduledStart)}-${fmtTime(e.scheduledEnd)}`;
          const role = e.userRole === "MANAGER" ? " [M]" : "";
          const status = e.status === "DRAFT" ? " *" : "";
          return `${e.userName}${role}${status}\n${time}`;
        });
        row.push(names.join("\n\n"));
      }
    }
    body.push(row);
  }

  // Title
  const title = `Schedule: ${data.weekLabel}`;
  doc.setFontSize(14);
  doc.text(title, 148, 12, { align: "center" });

  // Stats line
  const { stats } = data;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    `Total: ${stats.totalShifts} shifts | Published: ${stats.publishedShifts} | Draft: ${stats.draftShifts} | Understaffed: ${stats.understaffedSlots}`,
    148,
    18,
    { align: "center" }
  );
  doc.setTextColor(0);

  // Auto-table
  autoTable(doc, {
    startY: 22,
    head: [headers],
    body,
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: "linebreak",
      lineWidth: 0.2,
      lineColor: [200, 200, 200],
      valign: "top",
    },
    headStyles: {
      fillColor: [112, 47, 138], // Metro purple #702F8A
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
      valign: "middle",
    },
    columnStyles: {
      0: {
        cellWidth: 30,
        fontStyle: "bold",
        fillColor: [248, 248, 252],
      },
    },
    alternateRowStyles: {
      fillColor: [252, 250, 255],
    },
    didParseCell: (hookData) => {
      // Highlight understaffed cells
      if (hookData.section === "body" && hookData.column.index > 0) {
        const branchIdx = hookData.row.index;
        const dayIdx = hookData.column.index - 1;
        const branch = data.branches[branchIdx];
        if (branch) {
          const day = branch.days.find((d) => d.date === weekDays[dayIdx]);
          if (day && day.shortage < 0) {
            hookData.cell.styles.fillColor = [255, 243, 224]; // Warm orange bg
            hookData.cell.styles.textColor = [180, 80, 0];
          }
        }
      }
    },
    margin: { left: 8, right: 8 },
  });

  // Footer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).getNumberOfPages?.() ?? (doc as any).internal?.getNumberOfPages?.() ?? 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `HR Loop - Generated ${new Date().toLocaleDateString("en-GB")} - Page ${i}/${pageCount}`,
      148,
      doc.internal.pageSize.getHeight() - 5,
      { align: "center" }
    );
  }

  // Download
  const filename = `schedule_${weekStart}.pdf`;
  doc.save(filename);
}
