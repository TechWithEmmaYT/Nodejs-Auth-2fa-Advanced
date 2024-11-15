import { z } from "zod";
import { ErrorRequestHandler, Response } from "express";
import { HTTPSTATUS } from "../config/http.config";
import { AppError } from "../common/utils/AppError";
import {
  clearAuthenticationCookies,
  REFRESH_PATH,
} from "../common/utils/cookies";
import { UnauthorizedException } from "../common/utils/catch-errors";
import { JsonWebTokenError } from "jsonwebtoken";

const handleZodError = (res: Response, error: z.ZodError) => {
  const errors = error.issues?.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
  return res.status(HTTPSTATUS.BAD_REQUEST).json({
    message: "Validation failed",
    errors: errors,
  });
};

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  next
): any => {
  console.error(`Error occurred on PATH: ${req.path}`, error);

  if (req.path === REFRESH_PATH) {
    clearAuthenticationCookies(res);
  }

  if (error instanceof SyntaxError) {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      message: "Invalid JSON format. Please check your request body.",
    });
  }

  if (error instanceof z.ZodError) {
    return handleZodError(res, error);
  }

  if (
    error.message &&
    error.message.includes("tOrPrivateKey must have a value")
  ) {
    return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      message:
        "Server configuration error: Private key missing for JWT signing.",
    });
  }

  if (error instanceof JsonWebTokenError) {
    throw new UnauthorizedException("Invalid Token!");
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      errorCode: error.errorCode,
    });
  }

  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message: "Internal Server Error",
    error: error?.message || "Unknown error occurred",
  });
};
