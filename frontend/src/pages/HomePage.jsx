import React from "react";
import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import { MessageSquare } from "lucide-react";

export default function HomePage() {
  const { selectedUser } = useChatStore();

  return (
    <div className="h-screen bg-slate-950 flex items-center justify-center p-0 sm:p-4 md:p-6">
      <div className="bg-slate-900/50 border border-slate-800 w-full max-w-6xl h-full rounded-none sm:rounded-2xl overflow-hidden flex shadow-2xl">
        <Sidebar />
        {selectedUser ? (
          <ChatContainer />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-200">
              Welcome to Chat Workspace
            </h2>
            <p className="text-sm text-slate-400 max-w-sm">
              Select a contact from the sidebar on the left to start messaging
              in real time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
