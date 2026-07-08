  import { verify } from "jsonwebtoken";
  import { Request, Response, NextFunction } from "express";
  
  import AppError from "../errors/AppError";
  import authConfig from "../config/auth";
  import User from "../models/User";
  
  interface TokenPayload {
    id: string;
    username: string;
    profile: string;
    tenantId: number;
    iat: number;
    exp: number;
  }
  
  const isAuthAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const adminDomain = process.env.ADMIN_DOMAIN;
  
    if (!authHeader) {
      throw new AppError("Token was not provided.", 403);
    }
  
    const [, token] = authHeader.split(" ");
  
    try {
      const decoded = verify(token, authConfig.secret);
      const { id, profile, tenantId } = decoded as TokenPayload;
      const user = await User.findByPk(id);

      if (!user) {
        throw new AppError("Not admin permission", 403);
      }

      const isSuperProfile =
        profile === "super" || user.profile === "super";

      if (isSuperProfile) {
        req.user = { id, profile: user.profile, tenantId };
        return next();
      }

      if (!adminDomain) {
        throw new AppError("Not exists admin domains defined.", 403);
      }

      const hasAdminEmail = user.email
        .toLowerCase()
        .includes(adminDomain.toLowerCase());

      if (!hasAdminEmail) {
        throw new AppError("Not admin permission", 403);
      }
  
      req.user = {
        id,
        profile,
        tenantId
      };
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError("Invalid token or not Admin", 403);
    }
  
    return next();
  };
  
  export default isAuthAdmin;
