export interface FeatureGroup {
  title: string;
  items: string[];
}

/** First match wins, so a master bedroom with a lanai stays with the bedrooms. */
const GROUP_RULES: Array<{ title: string; test: RegExp }> = [
  {
    title: "Smart home and security",
    test: /gate|cctv|alexa|smart|security|doorbell|camera|solar|purifier|automat/i,
  },
  {
    title: "Bedrooms and service areas",
    test: /bedroom|maid|closet|laundry|garbage|pantry|auxiliary|dirty kitchen|service kitchen|toilet|bath|powder|office|stock/i,
  },
  {
    title: "Furniture and inclusions",
    test: /furnish|furniture|sofa|dining set|\bbeds?\b|curtain|blinds|air-?condition|refrigerator|rangehood|cooktop|oven|microwave|hob|stove|dispenser/i,
  },
];
const DEFAULT_TITLE = "Living spaces and amenities";
const ORDER = [
  "Smart home and security",
  DEFAULT_TITLE,
  "Bedrooms and service areas",
  "Furniture and inclusions",
];

/** Sorts a listing's features into named groups; empty groups are left out. */
export function groupFeatures(items: string[]): FeatureGroup[] {
  const groups = new Map<string, string[]>(ORDER.map((title) => [title, []]));
  for (const item of items) {
    const rule = GROUP_RULES.find(({ test }) => test.test(item));
    groups.get(rule?.title ?? DEFAULT_TITLE)?.push(item);
  }
  return ORDER.map((title) => ({ title, items: groups.get(title) ?? [] })).filter(
    (group) => group.items.length > 0,
  );
}

/**
 * Splits groups over two columns, always adding the next group (in order) to the shorter
 * column, so a long group does not leave the other side empty.
 */
export function balanceColumns(
  groups: FeatureGroup[],
): [FeatureGroup[], FeatureGroup[]] {
  const columns: [FeatureGroup[], FeatureGroup[]] = [[], []];
  const weights = [0, 0];
  for (const group of groups) {
    const target = weights[0] <= weights[1] ? 0 : 1;
    columns[target].push(group);
    weights[target] += group.items.length + 2;
  }
  return columns;
}
