import { SubscribersAnalyticsPanel } from "@/components/dashboard/subscribers-analytics-panel";
import { ExcludeVisitsToggle } from "@/components/dashboard/exclude-visits-toggle";
import { SubscriberList } from "@/components/dashboard/subscribers-list";

export default function AudienceAnalyticsPage() {
  return (
    <div className="space-y-6">
      <SubscribersAnalyticsPanel />
      <SubscriberList />
      <ExcludeVisitsToggle />
    </div>
  );
}
