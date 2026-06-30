// Single source of truth for "what calendar day is it" across the app. The app
// targets Turkey, so days roll over at local (Europe/Istanbul) midnight rather
// than UTC — otherwise a meal logged between 00:00–03:00 local would land on
// the previous day. Works identically in the browser and in Node (Vercel),
// keeping the client's stored dates and the server's queries in agreement.

const TZ = "Europe/Istanbul";

// Returns the date in YYYY-MM-DD for the given instant in app-local time.
export function localDateStr(d: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}
