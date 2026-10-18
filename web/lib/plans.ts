export type BillingCycle = "monthly" | "yearly";

export interface ProTier {
  key: string;
  label: string;
  name: string;
  views: number | null;
  viewsText: string;
  monthly: number;
  yearly: number;
}

export const PRO_TIERS: ProTier[] = [
  {
    key: "pro_10k",
    label: "10K",
    name: "Pro 10K",
    views: 10_000,
    viewsText: "10,000 monthly pageviews",
    monthly: 19,
    yearly: 190,
  },
  {
    key: "pro_50k",
    label: "50K",
    name: "Pro 50K",
    views: 50_000,
    viewsText: "50,000 monthly pageviews",
    monthly: 39,
    yearly: 390,
  },
  {
    key: "pro_100k",
    label: "100K",
    name: "Pro 100K",
    views: 100_000,
    viewsText: "100,000 monthly pageviews",
    monthly: 69,
    yearly: 690,
  },
  {
    key: "pro_250k",
    label: "250K",
    name: "Pro 250K",
    views: 250_000,
    viewsText: "250,000 monthly pageviews",
    monthly: 119,
    yearly: 1190,
  },
  {
    key: "pro_500k",
    label: "500K",
    name: "Pro 500K",
    views: 500_000,
    viewsText: "500,000 monthly pageviews",
    monthly: 199,
    yearly: 1990,
  },
  {
    key: "pro_unlimited",
    label: "Unlimited",
    name: "Pro Unlimited",
    views: null,
    viewsText: "Unlimited monthly pageviews",
    monthly: 249,
    yearly: 2490,
  },
];

export const LIFETIME_PRICE = 99;

export const CYCLE_UNIT: Record<BillingCycle, string> = {
  monthly: "/mo",
  yearly: "/yr",
};

export function tierPrice(tier: ProTier, cycle: BillingCycle): number {
  return tier[cycle];
}