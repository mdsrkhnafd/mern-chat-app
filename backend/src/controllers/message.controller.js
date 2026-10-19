import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import asyncHandler from "../lib/asyncHandler.js";

export const getUsersForSidebar = asyncHandler(async (req, res) => {
  const myId = req.user._id;
  const users = await User.find({ _id: { $ne: myId } }).select("-password");

  const usersWithDetails = await Promise.all(
    users.map(async (user) => {
      const lastMessage = await Message.findOne({
        $or: [
          { senderId: myId, receiverId: user._id },
          { senderId: user._id, receiverId: myId },
        ],
      }).sort({ createdAt: -1 });

      const unreadCount = await Message.countDocuments({
        senderId: user._id,
        receiverId: myId,
        isSeen: false,
      });

      // Sidebar preview text logic for Text, Voice Note, Video, or Photo
      let lastMessagePreview = "";
      if (lastMessage) {
        if (lastMessage.text) {
          lastMessagePreview = lastMessage.text;
        } else if (lastMessage.mediaType === "audio") {
          lastMessagePreview = "🎤 Voice Note";
        } else if (lastMessage.mediaType === "video") {
          lastMessagePreview = "📹 Video";
        } else if (lastMessage.mediaUrl) {
          lastMessagePreview = "📷 Photo";
        }
      }

      return {
        ...user.toObject(),
        lastMessage: lastMessagePreview,
        lastMessageTime: lastMessage ? lastMessage.createdAt : user.createdAt,
        unreadCount,
        lastSeen: user.lastSeen,
      };
    }),
  );

  res.status(200).json(usersWithDetails);
});

export const getMessages = asyncHandler(async (req, res) => {
  const { id: userToChatId } = req.params;
  const myId = req.user._id;

  const messages = await Message.find({
    $or: [
      { senderId: myId, receiverId: userToChatId },
      { senderId: userToChatId, receiverId: myId },
    ],
  }).sort({ createdAt: 1 });

  res.status(200).json(messages);
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { text, media, mediaType } = req.body;
  const { id: receiverId } = req.params;
  const senderId = req.user._id;

  let mediaUrl = "";

  if (media) {
    const uploadResponse = await cloudinary.uploader.upload(media, {
      resource_type: "auto", // Automatically handles images, videos, and audio files
      folder: "chat_media",
    });
    mediaUrl = uploadResponse.secure_url;
  }

  const newMessage = await Message.create({
    senderId,
    receiverId,
    text: text || "",
    mediaUrl,
    mediaType: media ? mediaType || "image" : "none",
  });

  const receiverSocketId = getReceiverSocketId(receiverId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", newMessage);
  }

  res.status(201).json(newMessage);
});

// Mark messages as seen
export const markMessagesAsSeen = asyncHandler(async (req, res) => {
  const { id: senderId } = req.params;
  const myId = req.user._id;

  await Message.updateMany(
    { senderId: senderId, receiverId: myId, isSeen: false },
    { $set: { isSeen: true } },
  );

  const senderSocketId = getReceiverSocketId(senderId);
  if (senderSocketId) {
    io.to(senderSocketId).emit("messagesSeen", { seenBy: myId });
  }

  res.status(200).json({ message: "Messages marked as seen" });
});

// Edit Message (Within 10 minutes)
export const editMessage = asyncHandler(async (req, res) => {
  const { id: messageId } = req.params;
  const { text } = req.body;
  const myId = req.user._id;

  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  if (message.senderId.toString() !== myId.toString()) {
    return res
      .status(403)
      .json({ message: "Unauthorized to edit this message" });
  }

  const currentTime = new Date();
  const messageTime = new Date(message.createdAt);
  const timeDifference = currentTime - messageTime;
  const tenMinutes = 10 * 60 * 1000;

  if (timeDifference > tenMinutes) {
    return res.status(400).json({
      message: "You can only edit messages within 10 minutes of sending.",
    });
  }

  message.text = text;
  message.isEdited = true;
  await message.save();

  const receiverSocketId = getReceiverSocketId(message.receiverId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("messageEdited", message);
  }

  res.status(200).json(message);
});

// Delete Message
export const deleteMessage = asyncHandler(async (req, res) => {
  const { id: messageId } = req.params;
  const myId = req.user._id;

  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  if (message.senderId.toString() !== myId.toString()) {
    return res
      .status(403)
      .json({ message: "Unauthorized to delete this message" });
  }

  const receiverId = message.receiverId;
  await Message.findByIdAndDelete(messageId);

  const receiverSocketId = getReceiverSocketId(receiverId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("messageDeleted", { messageId });
  }

  res.status(200).json({ message: "Message deleted successfully" });
});

// React to Message
export const reactToMessage = asyncHandler(async (req, res) => {
  const { id: messageId } = req.params;
  const { emoji } = req.body;
  const myId = req.user._id;

  const message = await Message.findById(messageId);
  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  if (!message.reactions) {
    message.reactions = [];
  }

  const existingReactionIndex = message.reactions.findIndex(
    (r) => r.userId.toString() === myId.toString(),
  );

  if (existingReactionIndex > -1) {
    if (message.reactions[existingReactionIndex].emoji === emoji) {
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      message.reactions[existingReactionIndex].emoji = emoji;
    }
  } else {
    message.reactions.push({ userId: myId, emoji });
  }

  await message.save();

  const receiverId =
    message.senderId.toString() === myId.toString()
      ? message.receiverId
      : message.senderId;
  const receiverSocketId = getReceiverSocketId(receiverId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("messageReacted", message);
  }

  res.status(200).json(message);
});
