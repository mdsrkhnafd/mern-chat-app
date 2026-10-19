import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import asyncHandler from "../lib/asyncHandler.js";

export const signup = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    fullName,
    email,
    password: hashedPassword,
  });

  const token = generateToken(newUser._id, res);

  res.status(201).json({
    _id: newUser._id,
    fullName: newUser.fullName,
    email: newUser.email,
    profilePic: newUser.profilePic,
    token,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  const isPasswordCorrect =
    user && (await bcrypt.compare(password, user.password));

  if (!isPasswordCorrect) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = generateToken(user._id, res);

  res.status(200).json({
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    profilePic: user.profilePic,
    token,
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.cookie("jwt", "", { maxAge: 0 });
  res.status(200).json({ message: "Logged out successfully" });
});

export const checkAuth = asyncHandler(async (req, res) => {
  res.status(200).json(req.user);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { profilePic } = req.body;

  if (!profilePic) {
    return res.status(400).json({ message: "Profile picture is required" });
  }

  const currentUser = req.user;

  // 1. Agar pehle se Cloudinary par picture hai, to usay remove karein
  if (
    currentUser.profilePic &&
    currentUser.profilePic.includes("cloudinary.com")
  ) {
    const fileName = currentUser.profilePic.split("/").pop().split(".")[0];
    const publicId = `chat_avatars/${fileName}`;
    await cloudinary.uploader.destroy(publicId);
  }

  // 2. Nayi picture upload karein
  const uploadResponse = await cloudinary.uploader.upload(profilePic, {
    folder: "chat_avatars",
  });

  // 3. Database mein naya URL save karein
  const updatedUser = await User.findByIdAndUpdate(
    currentUser._id,
    { profilePic: uploadResponse.secure_url },
    { new: true },
  ).select("-password");

  res.status(200).json(updatedUser);
});
