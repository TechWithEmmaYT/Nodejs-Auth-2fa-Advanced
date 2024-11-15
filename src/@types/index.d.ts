import { Request } from "express";
import { UserDocument } from "../database/models/user.model";

declare global {
  namespace Express {
    interface User extends UserDocument {}
    interface Request {
      sessionId?: string; // Optional to handle cases where it's not set
    }
  }
}
