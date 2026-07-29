import { SubscribersAnalyticsPanel } from "@/components/dashboard/subscribers-analytics-panel";
import { RecentSubscribers } from "@/components/dashboard/recent-subscribers";

export default function AudienceAnalyticsPage() {
  return (
    <>
      <SubscribersAnalyticsPanel />
      <RecentSubscribers />
    </>
  );
}
