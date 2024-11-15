import { Router } from "express";
import { sessionController } from "./session.controller";

const sessionRoutes = Router();

sessionRoutes.get("/all", sessionController.getAllSession);
sessionRoutes.get("/", sessionController.getSession);
sessionRoutes.delete("/:id", sessionController.deleteSession);

export default sessionRoutes;
