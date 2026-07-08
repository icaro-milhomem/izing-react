import * as Yup from "yup";
import AppError from "../../errors/AppError";
import User from "../../models/User";
import AdminCreateTenantService from "../AdminServices/AdminCreateTenantService";
import AdminCreateUserService from "../AdminServices/AdminCreateUserService";

interface SetupUserInput {
  name: string;
  email: string;
  password: string;
}

interface Request {
  companyName: string;
  superUser: SetupUserInput;
  adminUser: SetupUserInput;
}

interface Response {
  tenantId: number;
  superUserId: number;
  adminUserId: number;
  superEmail: string;
  superPassword: string;
}

const InitialSetupService = async ({
  companyName,
  superUser,
  adminUser
}: Request): Promise<Response> => {
  const userCount = await User.count();
  if (userCount > 0) {
    throw new AppError("ERR_SETUP_ALREADY_DONE", 403);
  }

  const superEmail = superUser.email.trim().toLowerCase();
  const adminEmail = adminUser.email.trim().toLowerCase();

  if (superEmail === adminEmail) {
    throw new AppError("ERR_SETUP_EMAILS_MUST_DIFFER", 400);
  }

  const schema = Yup.object().shape({
    companyName: Yup.string().trim().min(2).max(120).required(),
    superUser: Yup.object().shape({
      name: Yup.string().trim().min(2).max(120).required(),
      email: Yup.string().trim().email().required(),
      password: Yup.string().min(6).required()
    }),
    adminUser: Yup.object().shape({
      name: Yup.string().trim().min(2).max(120).required(),
      email: Yup.string().trim().email().required(),
      password: Yup.string().min(6).required()
    })
  });

  try {
    await schema.validate({ companyName, superUser, adminUser });
  } catch (err: any) {
    throw new AppError(err?.message || "ERR_SETUP_INVALID_DATA");
  }

  const maxUsers = Number(process.env.USER_LIMIT) || 99;
  const maxConnections = Number(process.env.CONNECTIONS_LIMIT) || 99;

  const tenant = await AdminCreateTenantService({
    tenantData: {
      status: "active",
      name: companyName.trim(),
      maxUsers,
      maxConnections
    }
  });

  if (!tenant?.id) {
    throw new AppError("ERR_SETUP_TENANT_FAILED", 500);
  }

  const superCreated = await AdminCreateUserService({
    email: superEmail,
    password: superUser.password,
    name: superUser.name.trim(),
    tenantId: tenant.id,
    profile: "super"
  });

  const adminCreated = await AdminCreateUserService({
    email: adminEmail,
    password: adminUser.password,
    name: adminUser.name.trim(),
    tenantId: tenant.id,
    profile: "admin"
  });

  return {
    tenantId: tenant.id,
    superUserId: superCreated.id,
    adminUserId: adminCreated.id,
    superEmail,
    superPassword: superUser.password
  };
};

export default InitialSetupService;
