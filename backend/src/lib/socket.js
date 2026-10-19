import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js"; // User model import kiya

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
    credentials: true,
  },
});

// Store online users: { userId: socketId }
const userSocketMap = {};

export const getReceiverSocketId = (userId) => {
  return userSocketMap[userId];
};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  // Broadcast online users list to everyone
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Real-time typing indicator
  socket.on("typing", ({ receiverId, isTyping }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", {
        senderId: userId,
        isTyping,
      });
    }
  });

  socket.on("disconnect", async () => {
    if (userId) {
      // User ke disconnect hone par lastSeen database mein update karna
      try {
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      } catch (error) {
        console.log("Error updating lastSeen:", error);
      }

      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });
});

export { io, app, server };
