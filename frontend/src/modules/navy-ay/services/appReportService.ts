/**
 * NAVY ay phase 3C: automatic report of the Android app (1.2.0+). The native service keeps
 * samples (battery, screen, positions sent; never any coordinate) for 48 h; this sends a
 * SUMMARY to the server (navy_app_report_submit, the account's own report only):
 *  - "Envoyer mon rapport" (Réglages de l'appli): the last 48 hours;
 *  - by itself at each "Pas disponible", when the stretch since the last automatic report
 *    covers 20 minutes screen off or more.
 */
import { supabase, withTimeout } from '../../../lib/supabase';
import { getNativeReport, hasNativeReport } from './nativeApp';
import { autoReportDue, summarizeReport, type AppReportSummary } from '../utils/appReportRules';

const LAST_AUTO_END_KEY = 'navy-app-report-last-auto-end';

export type AppReportResult =
  | { kind: 'sent'; summary: AppReportSummary }
  | { kind: 'empty' }
  | { kind: 'unavailable' }
  | { kind: 'failed' };

async function submit(summary: AppReportSummary, auto: boolean, device: { model: string | null; android: string | null; appVersion: string | null }) {
  const { error } = (await withTimeout(
    (supabase as any).rpc('navy_app_report_submit', {
      p_app_version: device.appVersion,
      p_device_model: device.model,
      p_android_version: device.android,
      p_period_start: new Date(summary.periodStart).toISOString(),
      p_period_end: new Date(summary.periodEnd).toISOString(),
      p_samples: summary.samples,
      p_screen_off_minutes: summary.screenOffMinutes,
      p_drain_pct_per_hour: summary.drainPctPerHour,
      p_positions_sent: summary.positionsSent,
      p_positions_expected: summary.positionsExpected,
      p_auto: auto,
    }),
    10000,
    'navy-app-report-submit'
  )) as any;
  if (error) throw error;
}

export async function sendAppReport(auto = false): Promise<AppReportResult> {
  if (!hasNativeReport()) return { kind: 'unavailable' };
  try {
    const r = await getNativeReport();
    const now = Date.now();
    let since = 0;
    if (auto) {
      try {
        since = Number(localStorage.getItem(LAST_AUTO_END_KEY)) || 0;
      } catch {
        since = 0;
      }
    }
    const summary = summarizeReport(r.samples, now, since);
    if (!summary || (auto && !autoReportDue(summary))) return { kind: 'empty' };
    await submit(summary, auto, r);
    if (auto) {
      try {
        localStorage.setItem(LAST_AUTO_END_KEY, String(summary.periodEnd));
      } catch {
        // sent again next time at worst
      }
    }
    return { kind: 'sent', summary };
  } catch (error) {
    console.warn('⚠️ NAVY app: report not sent', error);
    return { kind: 'failed' };
  }
}

let autoRun: Promise<AppReportResult> | null = null;
/** At "Pas disponible" (sharing stopped): never twice at the same time. */
export function maybeSendAutoAppReport(): Promise<AppReportResult> {
  if (!hasNativeReport()) return Promise.resolve({ kind: 'unavailable' });
  if (!autoRun) {
    // A little later: the native service writes its closing sample when it stops.
    autoRun = new Promise<void>((r) => setTimeout(r, 2000))
      .then(() => sendAppReport(true))
      .finally(() => {
        autoRun = null;
      });
  }
  return autoRun;
}

/** "1 h 05" / "25 min". */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}
