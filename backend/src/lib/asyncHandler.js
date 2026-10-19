const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    return res
      .status(500)
      .json({ message: error.message || "Internal Server Error" });
  });
};

export default asyncHandler;
