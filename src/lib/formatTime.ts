
/**
 * Formats time in hours to a user-friendly string with localization
 * Handles compact/full forms and English/Swedish
 */
export function formatTime(
  hours: number,
  useCompactFormat = false,
  language: "en" | "sv" = "en"
): string {
  const roundedHours = Math.round(hours * 100) / 100;
  const wholeHours = Math.floor(roundedHours);
  const minutes = Math.round((roundedHours - wholeHours) * 60);

  const isSv = language === "sv";

  // correct edge case 60 minutes
  const adjMinutes = minutes === 60 ? 0 : minutes;
  const adjHours = minutes === 60 ? wholeHours + 1 : wholeHours;

  // Translation helpers
  const t = (en: string, sv: string) => (isSv ? sv : en);

  // Compact tokens
  const txtHour = t("h", "t");
  const txtMinute = t("m", "m");
  const txtHourFull = (n: number) =>
    isSv ? (n === 1 ? "timme" : "timmar") : n === 1 ? "hour" : "hours";
  const txtMinuteFull = (n: number) =>
    isSv ? (n === 1 ? "minut" : "minuter") : n === 1 ? "minute" : "minutes";

  // Case 1: Less than 1 hour (show as minutes)
  if (adjHours === 0) {
    return useCompactFormat
      ? `${adjMinutes}${txtMinute}`
      : `${adjMinutes} ${txtMinuteFull(adjMinutes)}`;
  }

  // Case 2: Exactly X hours, no minutes
  if (adjMinutes === 0) {
    return useCompactFormat
      ? `${adjHours}${txtHour}`
      : `${adjHours} ${txtHourFull(adjHours)}`;
  }

  // Case 3: Hours and minutes
  if (useCompactFormat) {
    return `${adjHours}${txtHour} ${adjMinutes}${txtMinute}`;
  } else {
    return `${adjHours} ${txtHourFull(adjHours)} ${adjMinutes} ${txtMinuteFull(
      adjMinutes
    )}`;
  }
}

/**
 * Rounds time up to the nearest 15-minute interval
 * - Under 15 minutes = 15 minutes
 * - Under 30 = 30 minutes, etc.
 */
export function roundTimeToInterval(hours: number): number {
  // Convert to minutes for easier calculation
  const minutes = hours * 60;

  // Calculate which 15-minute interval we're in
  const interval = Math.ceil(minutes / 15);

  // Return rounded hours (convert back from minutes)
  return (interval * 15) / 60;
}

/**
 * Rounds duration minutes according to the specified rules:
 * - 1-15 minutes = 15 minutes
 * - 16-30 minutes = 30 minutes
 * - 31-45 minutes = 45 minutes
 * - 46-60 minutes = 60 minutes
 * - And so on for longer durations
 * 
 * @param durationMinutes The duration in minutes
 * @returns The rounded duration in minutes
 */
export function roundDurationMinutes(durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  
  // Calculate the 15-minute block the duration falls into
  const block = Math.ceil(durationMinutes / 15);
  
  // Return the rounded duration in minutes
  return block * 15;
}

/**
 * Converts minutes to hours and minutes format
 * @param totalMinutes The total minutes to convert
 * @returns An object with hours and minutes
 */
export function minutesToHoursAndMinutes(totalMinutes: number): { hours: number, minutes: number } {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
}
