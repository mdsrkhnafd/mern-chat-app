import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  // React Web ke liye Cookie mein set karein
  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    httpOnly: true, // XSS attacks se bachata hai
    sameSite: "strict",
    secure: process.env.NODE_ENV !== "development",
  });

  return token; // Flutter Mobile ke liye return bhi kar dein
};
