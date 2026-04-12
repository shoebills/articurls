import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingSuccessPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle>Payment received</CardTitle>
          <CardDescription>Your Pro subscription will activate once webhooks finish processing.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/billing">Back to billing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
