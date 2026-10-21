export const sendError = (res, statusCode, message, details = null) => {
  res.status(statusCode).json({
    message,
    ...(details ? { details } : {}),
  });
};
