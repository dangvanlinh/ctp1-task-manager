/**
 * Week utilities - Monday-based calendar weeks
 *
 * For a given month, weeks are defined by actual Monday-Sunday boundaries.
 * Example: April 2026
 *   Week 1: Mar 30 (Mon) - Apr 5 (Sun)  → days 1-5 in April
 *   Week 2: Apr 6 (Mon) - Apr 12 (Sun)  → days 6-12
 *   Week 3: Apr 13 (Mon) - Apr 19 (Sun) → days 13-19
 *   Week 4: Apr 20 (Mon) - Apr 26 (Sun) → days 20-26
 *   Week 5: Apr 27 (Mon) - May 3 (Sun)  → days 27-30
 */

export interface WeekRange {
  week: number;
  startDay: number; // 1-based day of month (clamped to month)
  endDay: number;   // 1-based day of month (clamped to month)
  startDate: Date;  // actual Monday date (may be prev month)
  endDate: Date;    // actual Sunday date (may be next month)
}

/**
 * Get all week ranges for a given month.
 * Weeks start on Monday. A week belongs to a month if it contains any day of that month.
 */
export function getWeeksInMonth(month: number, year: number): WeekRange[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month - 1, daysInMonth);

  // Find the Monday on or before the 1st of the month
  let dayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon, ...
  if (dayOfWeek === 0) dayOfWeek = 7; // treat Sunday as 7
  const mondayOffset = dayOfWeek - 1; // days to subtract to get Monday
  const firstMonday = new Date(year, month - 1, 1 - mondayOffset);

  const weeks: WeekRange[] = [];
  let current = new Date(firstMonday);
  let weekNum = 1;

  while (true) {
    const sunday = new Date(current);
    sunday.setDate(sunday.getDate() + 6);

    // This week must overlap with the month
    if (current.getTime() > lastDay.getTime()) break;

    const startDay = Math.max(1, current.getDate() + (current.getMonth() === month - 1 && current.getFullYear() === year ? 0 : (current < firstDay ? (new Date(year, month - 1, 1).getDate() - current.getDate() + (month - 1 !== current.getMonth() ? new Date(year, month - 1, 1).getDate() : 0)) : 0)));

    // Simpler approach: clamp to month boundaries
    const weekStartInMonth = current < firstDay ? 1 : current.getDate();
    const weekEndInMonth = sunday > lastDay ? daysInMonth : sunday.getDate();

    weeks.push({
      week: weekNum,
      startDay: weekStartInMonth,
      endDay: weekEndInMonth,
      startDate: new Date(current),
      endDate: new Date(sunday),
    });

    weekNum++;
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

/**
 * Get the week number (1-based) for a given day of the month.
 */
export function getWeekOfMonth(day: number, month: number, year: number): number {
  const weeks = getWeeksInMonth(month, year);
  for (const w of weeks) {
    if (day >= w.startDay && day <= w.endDay) return w.week;
  }
  return weeks.length; // fallback to last week
}

/**
 * Get the date range (startDay, endDay) for a given week number in a month.
 */
export function getWeekRange(week: number, month: number, year: number): { startDay: number; endDay: number } {
  const weeks = getWeeksInMonth(month, year);
  const w = weeks.find((w) => w.week === week);
  if (w) return { startDay: w.startDay, endDay: w.endDay };
  // Fallback
  return { startDay: 1, endDay: 7 };
}

/**
 * Get the number of weeks in a month.
 */
export function getWeekCount(month: number, year: number): number {
  return getWeeksInMonth(month, year).length;
}
