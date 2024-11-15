import { Router } from "express";
import { userController } from "./user.controller";

const userRoutes = Router();

userRoutes.get("/current-user", userController.getCurrentUser);

export default userRoutes;
