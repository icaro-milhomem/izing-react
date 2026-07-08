import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as InternalMessageController from "../controllers/InternalMessageController";

const router = Router();

router.use(isAuth);

router.get("/:userId", InternalMessageController.index);
router.post("/", InternalMessageController.store);
router.put("/read/:userId", InternalMessageController.markAsRead);

export default router; 