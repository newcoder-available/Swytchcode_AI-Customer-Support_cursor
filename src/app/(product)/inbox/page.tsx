import { Suspense } from "react";
import { InboxWorkspace } from "@/components/inbox/InboxWorkspace";

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="page muted">Loading inbox…</div>}>
      <InboxWorkspace />
    </Suspense>
  );
}
