
/**
 * Formats time in hours to a user-friendly string
 * - For exactly 1 hour: "1 hour"
 * - For multiple hours with no minutes: "2 hours"
 * - For times with hours and minutes: "1h 30m"
 * - For less than 1 hour: "30 minutes"
 */
export function formatTime(hours: number, useCompactFormat = false): string {
  // Round to 2 decimal places to avoid floating point issues
  const roundedHours = Math.round(hours * 100) / 100;
  
  // Calculate hours and minutes components
  const wholeHours = Math.floor(roundedHours);
  const minutes = Math.round((roundedHours - wholeHours) * 60);
  
  // If the minutes calculation results in 60, add an hour
  if (minutes === 60) {
    return formatTime(wholeHours + 1, useCompactFormat);
  }
  
  // Case 1: Less than 1 hour (show as minutes)
  if (wholeHours === 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  
  // Case 2: Exactly X hours with no minutes
  if (minutes === 0) {
    return `${wholeHours} ${wholeHours === 1 ? 'hour' : 'hours'}`;
  }
  
  // Case 3: Hours and minutes
  if (useCompactFormat) {
    // Compact format: "1h 30m"
    return `${wholeHours}h ${minutes}m`;
  } else {
    // Full format: "1 hour 30 minutes"
    return `${wholeHours} ${wholeHours === 1 ? 'hour' : 'hours'} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
}

/**
 * Rounds time up to the nearest 15-minute interval
 * - Time under 15 minutes = 15 minutes
 * - Time under 30 minutes but 16 or more minutes = 30 minutes
 * - Time under 45 minutes but 31 or more minutes = 45 minutes
 * - Time under 60 minutes but 45 or more minutes = 60 minutes
 */
export function roundTimeToInterval(hours: number): number {
  // Convert to minutes for easier calculation
  const minutes = hours * 60;
  
  // Calculate which 15-minute interval we're in
  const interval = Math.ceil(minutes / 15);
  
  // Return rounded hours (convert back from minutes)
  return (interval * 15) / 60;
}
