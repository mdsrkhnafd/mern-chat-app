import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUsers: {}, // Track typing status per user for sidebar & chat header

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData,
      );
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  markMessagesAsSeen: async (userId) => {
    try {
      await axiosInstance.put(`/messages/seen/${userId}`);
      set({
        messages: get().messages.map((msg) =>
          msg.senderId === userId ? { ...msg, isSeen: true } : msg,
        ),
      });
    } catch (error) {
      console.log(error);
    }
  },

  // Edit Message Action
  editMessage: async (messageId, newText) => {
    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, {
        text: newText,
      });
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? res.data : msg,
        ),
      }));
      toast.success("Message updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to edit message");
    }
  },

  // Delete Message Action
  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/delete/${messageId}`);
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));
      toast.success("Message deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  // React to Message Action
  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.put(`/messages/react/${messageId}`, {
        emoji,
      });
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? res.data : msg,
        ),
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to react");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      const isCurrentChat =
        selectedUser && newMessage.senderId === selectedUser._id;
      if (isCurrentChat) {
        set({
          messages: [...get().messages, newMessage],
        });
        get().markMessagesAsSeen(selectedUser._id);
      }
      get().getUsers();
    });

    socket.on("messagesSeen", ({ seenBy }) => {
      if (
        selectedUser &&
        (seenBy === selectedUser._id || get().selectedUser?._id === seenBy)
      ) {
        set({
          messages: get().messages.map((msg) => ({ ...msg, isSeen: true })),
        });
      }
    });

    socket.on("userTyping", ({ senderId, isTyping }) => {
      set((state) => ({
        typingUsers: { ...state.typingUsers, [senderId]: isTyping },
      }));
    });

    socket.on("messageEdited", (updatedMessage) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg,
        ),
      }));
    });

    socket.on("messageDeleted", ({ messageId }) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));
    });

    socket.on("messageReacted", (updatedMessage) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg,
        ),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
      socket.off("messagesSeen");
      socket.off("userTyping");
      socket.off("messageEdited");
      socket.off("messageDeleted");
      socket.off("messageReacted");
    }
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
