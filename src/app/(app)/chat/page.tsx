import { Suspense } from "react";

import { ChatView } from "./chat-view";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <ChatView />
    </Suspense>
  );
}
