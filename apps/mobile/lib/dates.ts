const monthDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const monthDayYear = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (startDate.getFullYear() !== endDate.getFullYear()) {
    return `${monthDayYear.format(startDate)} - ${monthDayYear.format(endDate)}`;
  }

  return `${monthDay.format(startDate)} - ${monthDay.format(endDate)}, ${endDate.getFullYear()}`;
}

export function formatDate(iso: string): string {
  return dateTime.format(new Date(iso));
}
