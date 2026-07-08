import express from "express";

import * as HooksController from "../controllers/WebHooksController";

const webHooksRoutes = express.Router();

webHooksRoutes.post(
  "/wabahooks/360/:token",
  HooksController.ReceivedRequest360
);

webHooksRoutes.get(
  "/fb-messenger-hooks/:token",
  HooksController.CheckServiceMessenger
);

webHooksRoutes.post(
  "/fb-messenger-hooks/:token",
  HooksController.ReceivedRequestMessenger
);

export default webHooksRoutes;
