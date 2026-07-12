export function upgradeHref(plan?: "pro" | "lifetime"): string {
  return plan === "lifetime" ? "/dashboard/billing?plan=lifetime" : "/dashboard/billing?plan=pro";
}
