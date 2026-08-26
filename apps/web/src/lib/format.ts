const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return '—';
  }

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), SIZE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  const digits = value < 10 && exponent > 0 ? 1 : 0;

  return `${value.toFixed(digits)} ${SIZE_UNITS[exponent]}`;
}

const RELATIVE_THRESHOLDS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
];

export function formatRelativeTime(iso: string): string {
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  let delta = (Date.parse(iso) - Date.now()) / 1000;

  for (const [unit, step] of RELATIVE_THRESHOLDS) {
    if (Math.abs(delta) < step) {
      return formatter.format(Math.round(delta), unit);
    }

    delta /= step;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(Date.parse(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(Date.parse(iso));
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
