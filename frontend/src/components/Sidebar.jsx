import React, { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Users, LogOut, Loader2 } from "lucide-react";

export default function Sidebar() {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    typingUsers,
  } = useChatStore();

  const { onlineUsers, logout } = useAuthStore();

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  if (isUsersLoading) {
    return (
      <aside className="h-full w-20 lg:w-80 border-r border-slate-800 flex flex-col items-center justify-center bg-slate-950">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </aside>
    );
  }

  return (
    <aside className="h-full w-20 lg:w-80 border-r border-slate-800 flex flex-col bg-slate-950 transition-all duration-200">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold text-slate-200 hidden lg:block">
            Contacts
          </span>
        </div>
        <button
          onClick={logout}
          className="text-slate-400 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-slate-800"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Contacts List */}
      <div className="overflow-y-auto w-full p-2 space-y-1.5 flex-1">
        {users.map((user) => {
          const isOnline = onlineUsers.includes(user._id);
          const isTyping = typingUsers?.[user._id];
          const isSelected = selectedUser?._id === user._id;

          return (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`w-full p-3 flex items-center gap-3 rounded-xl transition ${
                isSelected
                  ? "bg-indigo-600/20 border border-indigo-500/40"
                  : "hover:bg-slate-900/80 border border-transparent"
              }`}
            >
              {/* User Avatar & Online Status */}
              <div className="relative mx-auto lg:mx-0 flex-shrink-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName}
                  className="w-11 h-11 object-cover rounded-full bg-slate-800"
                />
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-slate-950" />
                )}
              </div>

              {/* User Details (Visible on larger screens) */}
              <div className="hidden lg:flex flex-col flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium text-sm text-slate-200 truncate">
                    {user.fullName}
                  </span>
                  {user.lastMessageTime && (
                    <span className="text-[11px] text-slate-500 flex-shrink-0">
                      {new Date(user.lastMessageTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-slate-400 truncate">
                    {isTyping ? (
                      <span className="text-indigo-400 font-medium animate-pulse">
                        typing...
                      </span>
                    ) : user.lastMessage ? (
                      user.lastMessage
                    ) : (
                      <span className="text-slate-600 italic">
                        No messages yet
                      </span>
                    )}
                  </p>

                  {/* Unread Message Counter Badge */}
                  {user.unreadCount > 0 && !isSelected && (
                    <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {user.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {users.length === 0 && (
          <div className="text-center text-slate-500 py-8 text-sm">
            No contacts found
          </div>
        )}
      </div>
    </aside>
  );
}
