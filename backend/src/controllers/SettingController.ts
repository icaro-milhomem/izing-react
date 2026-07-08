import { Request, Response } from "express";

import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";

import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  // if (req.user.profile !== "admin") {
  //   throw new AppError("ERR_NO_PERMISSION", 403);
  // }
  const { tenantId } = req.user;

  const settings = await ListSettingsService(tenantId);

  return res.status(200).json(settings);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  const { tenantId } = req.user;
  const { settingKey } = req.params;
  const { value, key: bodyKey, Key } = req.body;
  const key = bodyKey || Key || settingKey;

  if (!key) {
    throw new AppError("ERR_NO_SETTING_KEY", 400);
  }

  const setting = await UpdateSettingService({
    key: String(key),
    value: value == null ? "" : String(value),
    tenantId
  });

  const io = getIO();
  io.emit(`${tenantId}:settings`, {
    action: "update",
    setting
  });

  return res.status(200).json(setting);
};
