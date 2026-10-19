import React, { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  Send,
  Image,
  Loader2,
  X,
  MoreVertical,
  Edit2,
  Trash2,
  Mic,
  Square,
} from "lucide-react";
import toast from "react-hot-toast";

export default function ChatContainer() {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    sendMessage,
    subscribeToMessages,
    unsubscribeFromMessages,
    markMessagesAsSeen,
    typingUsers,
    getUsers,
    editMessage,
    deleteMessage,
    reactToMessage,
  } = useChatStore();

  const { authUser, onlineUsers } = useAuthStore();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [mediaFileType, setMediaFileType] = useState("image"); // "image" or "video"
  const [previewModalImg, setPreviewModalImg] = useState(null); // Lightbox modal state

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [activeReactionMenu, setActiveReactionMenu] = useState(null);

  // Voice Note States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [isSendingAudio, setIsSendingAudio] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const messageEndRef = useRef(null);

  const emojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  const isOnline = onlineUsers.includes(selectedUser?._id);
  const isUserTyping = typingUsers?.[selectedUser?._id];

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      markMessagesAsSeen(selectedUser._id);
      getUsers();
      subscribeToMessages();

      return () => unsubscribeFromMessages();
    }
  }, [
    selectedUser?._id,
    getMessages,
    markMessagesAsSeen,
    getUsers,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video");
    const reader = new FileReader();

    reader.onloadend = () => {
      setImagePreview(reader.result);
      setMediaFileType(isVideo ? "video" : "image");
    };
    reader.readAsDataURL(file);
  };

  // Start Voice Recording
  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const mimeType = "audio/webm";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioPreviewUrl(url);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      toast.error("Microphone access failed");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const cancelAudio = () => {
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingTime(0);
  };

  const handleSendAudio = async () => {
    if (!audioBlob) return;
    setIsSendingAudio(true);

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result;
      await sendMessage({
        text: "",
        media: base64Audio,
        mediaType: "audio",
      });
      setAudioBlob(null);
      setAudioPreviewUrl(null);
      setRecordingTime(0);
      setIsSendingAudio(false);
      getUsers();
    };
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    const socket = useAuthStore.getState().socket;
    if (socket && selectedUser) {
      socket.emit("typing", { receiverId: selectedUser._id, isTyping: false });
    }

    await sendMessage({
      text: text.trim(),
      media: imagePreview,
      mediaType: imagePreview ? mediaFileType : "none",
    });

    setText("");
    setImagePreview(null);
    setMediaFileType("image");
    getUsers();
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    const socket = useAuthStore.getState().socket;
    if (!socket || !selectedUser) return;

    socket.emit("typing", { receiverId: selectedUser._id, isTyping: true });

    setTimeout(() => {
      socket.emit("typing", { receiverId: selectedUser._id, isTyping: false });
    }, 1000);
  };

  const canEdit = (createdAt) => {
    const messageTime = new Date(createdAt);
    const currentTime = new Date();
    return currentTime - messageTime <= 10 * 60 * 1000;
  };

  const handleEditSubmit = (messageId) => {
    if (!editText.trim()) return;
    editMessage(messageId, editText.trim());
    setEditingMessageId(null);
    setEditText("");
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={selectedUser.profilePic || "/avatar.png"}
              alt={selectedUser.fullName}
              className="w-10 h-10 rounded-full object-cover bg-slate-800"
            />
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-200">
              {selectedUser.fullName}
            </h3>
            <p className="text-xs text-slate-400">
              {isUserTyping ? (
                <span className="text-indigo-400 animate-pulse font-medium">
                  typing...
                </span>
              ) : isOnline ? (
                <span className="text-emerald-400">Online</span>
              ) : selectedUser?.lastSeen ? (
                <span>
                  Last seen:{" "}
                  {new Date(selectedUser.lastSeen).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isMyMessage = message.senderId === authUser._id;

          return (
            <div
              key={message._id}
              className={`flex group relative ${
                isMyMessage ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs sm:max-w-md rounded-2xl p-3.5 space-y-2 relative ${
                  isMyMessage
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none"
                }`}
              >
                {/* Options Menu */}
                {isMyMessage && (
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition z-10">
                    <button
                      onClick={() =>
                        setActiveMenuId(
                          activeMenuId === message._id ? null : message._id,
                        )
                      }
                      className="p-1 text-white/70 hover:text-white rounded bg-black/20 hover:bg-black/40 transition"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {activeMenuId === message._id && (
                      <div className="absolute right-0 top-6 w-28 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-20 text-slate-200">
                        {message.text && canEdit(message.createdAt) && (
                          <button
                            onClick={() => {
                              setEditingMessageId(message._id);
                              setEditText(message.text);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-800 text-left"
                          >
                            <Edit2 className="w-3 h-3 text-indigo-400" /> Edit
                          </button>
                        )}
                        <button
                          onClick={() => {
                            deleteMessage(message._id);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-800 text-red-400 text-left"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Image Attachment (Opens Modal Instead of New Tab) */}
                {message.mediaUrl && message.mediaType === "image" && (
                  <img
                    src={message.mediaUrl}
                    alt="Attachment"
                    className="rounded-xl max-h-48 object-cover w-full mb-2 cursor-pointer hover:opacity-95 transition"
                    onClick={() => setPreviewModalImg(message.mediaUrl)}
                  />
                )}

                {/* Video Attachment */}
                {message.mediaUrl && message.mediaType === "video" && (
                  <video
                    controls
                    src={message.mediaUrl}
                    className="rounded-xl max-h-48 w-full mb-2 object-cover bg-black"
                  />
                )}

                {/* Voice Note Attachment */}
                {message.mediaUrl && message.mediaType === "audio" && (
                  <div className="pt-1 pb-1 pr-4">
                    <audio
                      controls
                      src={message.mediaUrl}
                      className="h-9 w-56 sm:w-64 max-w-full rounded-lg"
                    />
                  </div>
                )}

                {/* Edit Mode / Text */}
                {editingMessageId === message._id ? (
                  <div className="space-y-2 mt-1">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingMessageId(null)}
                        className="px-2 py-0.5 text-xs bg-slate-700 hover:bg-slate-600 rounded text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleEditSubmit(message._id)}
                        className="px-2 py-0.5 text-xs bg-indigo-500 hover:bg-indigo-400 rounded text-white"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  message.text && (
                    <p className="text-sm leading-relaxed pr-6">
                      {message.text}
                    </p>
                  )
                )}

                {/* Reactions Display */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {message.reactions.map((r, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-800/80 border border-slate-700 text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 text-slate-200"
                      >
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}

                {/* Reaction Picker */}
                <div className="relative mt-1 flex items-center">
                  <button
                    onClick={() =>
                      setActiveReactionMenu(
                        activeReactionMenu === message._id ? null : message._id,
                      )
                    }
                    className="text-[10px] text-slate-400 hover:text-white transition opacity-60 hover:opacity-100"
                  >
                    React +
                  </button>

                  {activeReactionMenu === message._id && (
                    <div className="absolute bottom-6 left-0 bg-slate-900 border border-slate-700 rounded-full shadow-xl px-2 py-1 flex items-center z-20 gap-1">
                      {emojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            reactToMessage(message._id, emoji);
                            setActiveReactionMenu(null);
                          }}
                          className="hover:scale-125 transition text-base p-0.5"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Time & Ticks */}
                <div className="flex items-center justify-end gap-1.5 text-[10px] opacity-75 mt-1">
                  {message.isEdited && (
                    <span className="italic text-[9px]">(edited)</span>
                  )}
                  <span>
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isMyMessage && (
                    <span className="text-xs">
                      {message.isSeen ? (
                        <span className="text-sky-300 font-bold" title="Seen">
                          ✓✓
                        </span>
                      ) : (
                        <span className="text-slate-300" title="Sent">
                          ✓
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      {/* Media Preview Area (Image/Video before sending) */}
      {imagePreview && (
        <div className="p-2 px-4 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          <div className="relative">
            {mediaFileType === "video" ? (
              <video
                src={imagePreview}
                className="w-16 h-16 object-cover rounded-lg bg-black"
              />
            ) : (
              <img
                src={imagePreview}
                alt="Preview"
                className="w-16 h-16 object-cover rounded-lg"
              />
            )}
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-2 -right-2 bg-slate-800 text-slate-200 rounded-full p-1 hover:bg-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Audio Preview Area */}
      {audioPreviewUrl && (
        <div className="p-3 px-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <audio controls src={audioPreviewUrl} className="h-9 flex-1" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelAudio}
              disabled={isSendingAudio}
              className="p-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSendAudio}
              disabled={isSendingAudio}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
            >
              {isSendingAudio ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Send Audio
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Message Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-slate-800 bg-slate-900/40 flex items-center gap-3"
      >
        <label className="cursor-pointer text-slate-400 hover:text-slate-200 transition">
          <Image className="w-5 h-5" />
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleMediaChange}
            className="hidden"
          />
        </label>

        {isRecording ? (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            <span className="text-xs text-red-400 font-medium">
              {formatDuration(recordingTime)}
            </span>
            <button
              type="button"
              onClick={stopRecording}
              className="text-red-400 hover:text-red-300 ml-1 p-1"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="text-slate-400 hover:text-indigo-400 transition"
            title="Record Voice Note"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}

        <input
          type="text"
          placeholder={isRecording ? "Recording audio..." : "Type a message..."}
          value={text}
          onChange={handleTyping}
          disabled={isRecording}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition text-slate-100 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isRecording || (!text.trim() && !imagePreview)}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      {/* Fullscreen Image Lightbox Modal */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewModalImg(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewModalImg}
              alt="Fullscreen Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
            />
            <button
              onClick={() => setPreviewModalImg(null)}
              className="absolute top-3 right-3 bg-slate-900/80 text-white p-2 rounded-full hover:bg-slate-800 transition shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
