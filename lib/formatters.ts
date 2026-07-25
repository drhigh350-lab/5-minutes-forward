/**
 * Formats a duration/position in seconds as "m:ss" (or "h:mm:ss" once an
 * episode runs an hour or longer).
 *
 * Source of the "0:10.819733" bug: `<audio>.currentTime` and `.duration`
 * are floating-point (sub-millisecond precision) by spec. The old
 * implementation did `seconds % 60` directly on that float and only
 * zero-padded the *string*, so the fractional part rode along untouched
 * all the way to the UI. Rounding to a whole second must happen first,
 * at this formatting boundary — every caller (progress bar, dials,
 * episode lists, mini-player) funnels through here, so fixing it once
 * here fixes it everywhere.
 *
 * Also guards against every non-clean value the audio element or the DB
 * can hand us: undefined/null, NaN (duration before metadata loads),
 * Infinity (a live-stream duration, or a bad Range response), and
 * negative numbers (a stale/garbage stored position).
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds) || !Number.isFinite(seconds)) {
    return '0:00';
  }

  // Round to the nearest whole second *before* any div/mod math.
  const totalSeconds = Math.max(0, Math.round(seconds));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
