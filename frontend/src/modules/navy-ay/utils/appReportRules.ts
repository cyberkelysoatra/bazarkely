/**
 * NAVY ay phase 3C: automatic report of the Android app (recommendation of the 3B report).
 * While the position is shared, the native service keeps one sample every 5 minutes for
 * 48 h (NavyStatus.sampleIfDue): battery %, charging, screen on, battery saver, NAVY ay
 * exempt from battery optimisation, cumulative positions accepted / failed, interval.
 * NEVER any coordinate. These pure rules turn the samples into the summary sent to the
 * server (navy_app_report_submit). Covered by appReportRules.test.ts.
 */

export interface AppReportSample {
  /** Time (ms). */
  t: number;
  /** Battery level in %, null when unknown. */
  bat: number | null;
  chg: boolean;
  /** Screen on. */
  scr: boolean;
  save?: boolean;
  exempt?: boolean;
  /** Positions accepted by the server since the app was installed (cumulative). */
  ok: number;
  fail?: number;
  /** Interval between two positions (ms), 0 when unknown. */
  iv: number;
  /** Position sharing running. */
  run?: boolean;
}

export interface AppReportSummary {
  periodStart: number;
  periodEnd: number;
  samples: number;
  screenOffMinutes: number;
  /** Battery used per hour with the screen off and not charging (%), null below 10 minutes. */
  drainPctPerHour: number | null;
  positionsSent: number;
  positionsExpected: number;
}

export const REPORT_KEEP_MS = 48 * 60 * 60 * 1000;
/** Two samples farther apart than this are not one continuous stretch (sharing stopped). */
export const REPORT_MAX_GAP_MS = 15 * 60 * 1000;
/** "Pas disponible" sends a summary by itself when the screen was off for 20 minutes or more. */
export const AUTO_REPORT_MIN_SCREEN_OFF_MIN = 20;
const MIN_DRAIN_MS = 10 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 30_000;

function valid(s: unknown): s is AppReportSample {
  const x = s as AppReportSample;
  return !!x && typeof x.t === 'number' && Number.isFinite(x.t) && typeof x.ok === 'number';
}

/** Samples of the last 48 h, sorted; optionally only those after `sinceMs`. */
export function reportWindow(samples: unknown[], nowMs: number, sinceMs = 0): AppReportSample[] {
  return (Array.isArray(samples) ? samples : [])
    .filter(valid)
    .filter((s) => s.t <= nowMs + 60_000 && nowMs - s.t <= REPORT_KEEP_MS && s.t >= sinceMs)
    .sort((a, b) => a.t - b.t);
}

export function summarizeReport(samples: unknown[], nowMs: number, sinceMs = 0): AppReportSummary | null {
  const list = reportWindow(samples, nowMs, sinceMs);
  if (list.length < 2) return null;
  let offMs = 0;
  let drainMs = 0;
  let drainPct = 0;
  let sent = 0;
  let expected = 0;
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1];
    const b = list[i];
    const dt = b.t - a.t;
    if (dt <= 0 || dt > REPORT_MAX_GAP_MS) continue;
    const sharing = a.run !== false;
    if (sharing) {
      sent += Math.max(0, b.ok - a.ok);
      expected += dt / (a.iv > 0 ? a.iv : DEFAULT_INTERVAL_MS);
    }
    if (!a.scr && !b.scr) {
      offMs += dt;
      if (!a.chg && !b.chg && a.bat != null && b.bat != null) {
        drainMs += dt;
        drainPct += a.bat - b.bat;
      }
    }
  }
  return {
    periodStart: list[0].t,
    periodEnd: list[list.length - 1].t,
    samples: list.length,
    screenOffMinutes: Math.round(offMs / 60_000),
    drainPctPerHour: drainMs >= MIN_DRAIN_MS ? Math.round((drainPct / (drainMs / 3_600_000)) * 100) / 100 : null,
    positionsSent: sent,
    positionsExpected: Math.round(expected),
  };
}

/** At "Pas disponible": a summary goes by itself when it covers 20 minutes screen off or more. */
export function autoReportDue(summary: AppReportSummary | null): boolean {
  return !!summary && summary.screenOffMinutes >= AUTO_REPORT_MIN_SCREEN_OFF_MIN;
}
