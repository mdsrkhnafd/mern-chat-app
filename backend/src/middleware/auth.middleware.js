import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import asyncHandler from "../lib/asyncHandler.js";

export const protectRoute = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies.jwt ||
    (req.headers.authorization?.startsWith("Bearer")
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!token) {
    return res
      .status(401)
      .json({ message: "Unauthorized - No Token Provided" });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.userId).select("-password");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  req.user = user;
  next();
});
