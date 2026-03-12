// src/utils/schedule-utils.ts
import parser from 'cron-parser';
import type { TaskSchedule } from '@prisma/client';

/**
 * parseTimeOfDayToParts('02:38') => { hh: 2, mm: 38 }
 */
export function parseTimeOfDayToParts(timeOfDay?: string) {
  if (!timeOfDay) return null;
  const [rawH, rawM] = timeOfDay.split(':');
  const hh = Number(rawH);
  const mm = Number(rawM ?? 0);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return { hh, mm };
}

/**
 * combineDateWithTime(d, 'HH:MM') => same date with that time (local)
 */
export function combineDateWithTime(date: Date, timeOfDay?: string) {
  if (!timeOfDay) return new Date(date);
  const p = parseTimeOfDayToParts(timeOfDay)!;
  const res = new Date(date);
  res.setHours(p.hh, p.mm, 0, 0);
  return res;
}

/**
 * computeNextOccurrence(schedule, fromDate)
 *
 * - schedule: TaskSchedule from Prisma (fields used: cronExpression, runAt, timeOfDay, daysOfWeek, dayOfMonth)
 * - fromDate: Date to compute *strictly after* (so result > fromDate)
 *
 * Returns next Date > fromDate or null.
 *
 * Notes:
 * - daysOfWeek is assumed to be 0..6 (0 = Sunday) to match JS Date.getDay().
 * - timeOfDay is treated in server's timezone (UTC if your server uses UTC). If you work with user timezones,
 *   convert/normalize before calling this function.
 */
export function computeNextOccurrence(
  schedule: TaskSchedule,
  fromDate?: Date,
): Date | null {
  // from = точка отсчёта: ищем next > from
  let from = fromDate ? new Date(fromDate.getTime()) : new Date();

  // If schedule has a runAt (start date for the schedule), ensure we don't search before it.
  // If schedule is simple one-time (no recurrence fields), treat runAt as single occurrence.
  const hasRecurrence =
    Boolean(schedule.cronExpression) ||
    Boolean(schedule.timeOfDay) ||
    (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) ||
    Boolean(schedule.dayOfMonth);

  if (schedule.runAt) {
    const runAtDate = new Date(schedule.runAt);
    if (!hasRecurrence) {
      // one-time schedule -> return runAt if it's > from
      return runAtDate > from ? runAtDate : null;
    }
    // recurring schedule with runAt: ensure we don't consider dates before runAt
    if (from < runAtDate) from = runAtDate;
  }

  // 1) cronExpression (use cron-parser to get next > from)
  if (schedule.cronExpression) {
    try {
      const interval = parser.parse(schedule.cronExpression, {
        currentDate: from,
      });
      const next = interval.next().toDate();
      return next > from ? next : null;
    } catch (err) {
      console.error('cron parse error', err);
      return null;
    }
  }

  // 2) monthly by dayOfMonth
  const timeParts = schedule.timeOfDay
    ? parseTimeOfDayToParts(schedule.timeOfDay)
    : null;
  const daysOfWeek =
    schedule.daysOfWeek && schedule.daysOfWeek.length > 0
      ? schedule.daysOfWeek
      : undefined;
  const dayOfMonth = schedule.dayOfMonth ?? undefined;

  if (dayOfMonth) {
    // scan next 24 months to find next date with that day > from
    // start scanning from month-of(from)
    const startMonth = new Date(
      from.getFullYear(),
      from.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    for (let i = 0; i < 24; i++) {
      const monthCandidate = new Date(
        startMonth.getFullYear(),
        startMonth.getMonth() + i,
        1,
      );
      const daysInMonth = new Date(
        monthCandidate.getFullYear(),
        monthCandidate.getMonth() + 1,
        0,
      ).getDate();
      if (dayOfMonth > daysInMonth) continue;
      const d = new Date(
        monthCandidate.getFullYear(),
        monthCandidate.getMonth(),
        dayOfMonth,
      );
      const final = timeParts ? combineDateWithTime(d, schedule.timeOfDay!) : d;
      if (final > from) return final;
    }
    return null;
  }

  // 3) daily/weekly: scan forward day-by-day until match found (safety cap 366)
  // Use baseDate = midnight of `from` so we can set timeOfDay for candidate days properly.
  const baseDate = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
    0,
    0,
    0,
    0,
  );

  // We need strictly greater than 'from', so if timeOfDay is present and today's candidate time > from, offset 0 can be valid.
  // We'll iterate offsets starting from 0.
  for (let offset = 0; offset <= 366; offset++) {
    const candidateDay = new Date(baseDate.getTime());
    candidateDay.setDate(baseDate.getDate() + offset);

    // Check weekday if specified
    if (daysOfWeek && daysOfWeek.length > 0) {
      const wd = candidateDay.getDay(); // 0..6
      if (!daysOfWeek.includes(wd)) continue;
    }

    // compose final candidate time
    const candidate = timeParts
      ? combineDateWithTime(candidateDay, schedule.timeOfDay!)
      : new Date(candidateDay);

    // ensure candidate > from
    if (candidate > from) return candidate;
  }

  return null;
}
