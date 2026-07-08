import { Router } from "express";
import * as SessionController from "../controllers/SessionController";
import * as SetupController from "../controllers/SetupController";
import * as UserController from "../controllers/UserController";

const authRoutes = Router();

authRoutes.get("/setup-status", SetupController.status);
authRoutes.post("/setup", SetupController.store);

authRoutes.post("/signup", UserController.store);

authRoutes.post("/login", SessionController.store);
authRoutes.post("/logout", SessionController.logout);

authRoutes.post("/refresh_token", SessionController.update);

export default authRoutes;
