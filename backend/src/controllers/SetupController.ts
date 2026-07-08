import { Request, Response } from "express";
import User from "../models/User";
import InitialSetupService from "../services/SetupServices/InitialSetupService";
import AuthUserService from "../services/UserServices/AuthUserService";
import { SendRefreshToken } from "../helpers/SendRefreshToken";
import { getIO } from "../libs/socket";

export const status = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  const userCount = await User.count();
  return res.status(200).json({ initialized: userCount > 0 });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyName, superUser, adminUser } = req.body;

  const setup = await InitialSetupService({
    companyName,
    superUser,
    adminUser
  });

  const io = getIO();
  const { token, user, refreshToken, usuariosOnline } = await AuthUserService({
    email: setup.superEmail,
    password: setup.superPassword
  });

  SendRefreshToken(res, refreshToken);

  const params = {
    token,
    username: user.name,
    email: user.email,
    profile: user.profile,
    status: user.status,
    userId: user.id,
    tenantId: user.tenantId,
    queues: user.queues,
    usuariosOnline,
    configs: user.configs
  };

  io.emit(`${params.tenantId}:users`, {
    action: "update",
    data: {
      username: params.username,
      email: params.email,
      isOnline: true,
      lastLogin: new Date()
    }
  });

  return res.status(201).json(params);
};
