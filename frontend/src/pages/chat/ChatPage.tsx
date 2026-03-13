import React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { ChatPanel } from "../../components/ChatPanel";

export const ChatPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="mt-1 text-sm text-muted-foreground">Group chat and direct messages.</p>
      </div>

      <Card className="bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Messaging</CardTitle>
          <CardDescription>Real-time messaging powered by Socket.io.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChatPanel />
        </CardContent>
      </Card>
    </div>
  );
};

