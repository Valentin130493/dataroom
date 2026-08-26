export interface SplitName {
  base: string;
  extension: string;
}

export function splitName(name: string): SplitName {
  const dotIndex = name.lastIndexOf('.');

  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    return { base: name, extension: '' };
  }

  return { base: name.slice(0, dotIndex), extension: name.slice(dotIndex) };
}

export function stripCopySuffix(base: string): string {
  return base.replace(/ \(\d+\)$/, '');
}

export function nextAvailableName(desired: string, taken: Iterable<string>): string {
  const takenLower = new Set([...taken].map((name) => name.toLowerCase()));

  if (!takenLower.has(desired.toLowerCase())) {
    return desired;
  }

  const { base, extension } = splitName(desired);
  const root = stripCopySuffix(base);

  for (let index = 1; index < 10_000; index += 1) {
    const candidate = `${root} (${index})${extension}`;

    if (!takenLower.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  throw new Error(`Could not find a free name for "${desired}"`);
}
