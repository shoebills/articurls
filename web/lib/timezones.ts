import { getTimeZones } from "@vvo/tzdb";

export interface TimezoneGroup {
  region: string;
  zones: string[];
}

/**
 * Canonical IANA timezone list, identical on every device/browser.
 *
 * `Intl.supportedValuesOf("timeZone")` is device-dependent (mobile browsers
 * may return aliases like "Asia/Calcutta" and omit "UTC"), which made values
 * chosen on one device disappear from the selector on another. This fixed
 * list from @vvo/tzdb avoids that. The backend validates against Python
 * zoneinfo, which accepts every name here.
 */
function buildTimezoneGroups(): TimezoneGroup[] {
  const zones = getTimeZones()
    .map((z) => z.name)
    .filter((name) => !name.startsWith("Etc/"));
  zones.push("UTC");

  const groups = new Map<string, string[]>();
  for (const zone of zones) {
    const region = zone.split("/")[0];
    if (!groups.has(region)) groups.set(region, []);
    groups.get(region)!.push(zone);
  }

  const list = Array.from(groups.entries())
    .map(([region, groupZones]) => ({
      region,
      zones: groupZones.sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.region.localeCompare(b.region));

  // Surface the UTC group first.
  const utcIndex = list.findIndex((g) => g.region === "UTC");
  if (utcIndex > 0) {
    const [utcGroup] = list.splice(utcIndex, 1);
    list.unshift(utcGroup);
  }

  return list;
}

export const TIMEZONE_GROUPS: TimezoneGroup[] = buildTimezoneGroups();

export function isKnownTimezone(zone: string | null | undefined): boolean {
  if (!zone) return false;
  return TIMEZONE_GROUPS.some((g) => g.zones.includes(zone));
}

/**
 * Ensure a stored zone appears in the selector even if it is not part of the
 * canonical list (e.g. an alias like "Asia/Calcutta" saved by an older
 * browser), so the Select never renders an empty value.
 */
export function withZoneIncluded(zone: string | null | undefined): TimezoneGroup[] {
  if (!zone || isKnownTimezone(zone)) return TIMEZONE_GROUPS;
  const region = zone.split("/")[0];
  return [{ region, zones: [zone] }, ...TIMEZONE_GROUPS];
}
