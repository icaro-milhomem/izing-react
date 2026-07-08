import { Sequelize, Op } from "sequelize";
import Queue from "../../models/Queue";
// import UsersQueues from "../../models/UsersQueues";
import User from "../../models/User";

interface Request {
  searchParam?: string;
  pageNumber?: string | number;
  tenantId: string | number;
  loggedUserId?: string | number;
}

interface Response {
  users: any[];
  count: number;
  hasMore: boolean;
}

const ListUsersService = async ({
  searchParam = "",
  pageNumber = "1",
  tenantId,
  loggedUserId
}: Request): Promise<Response> => {
  const whereCondition: any = {
    tenantId,
    [Op.or]: [
      {
        name: Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("name")),
          "LIKE",
          `%${searchParam.toLowerCase()}%`
        )
      },
      { email: { [Op.like]: `%${searchParam.toLowerCase()}%` } }
    ]
  };
  if (loggedUserId) {
    whereCondition.id = { [Op.ne]: loggedUserId };
  }
  const limit = 40;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: users } = await User.findAndCountAll({
    where: whereCondition,
    include: [{ model: Queue, attributes: ["id", "queue"] }],
    attributes: ["name", "id", "email", "profile", "status", "isOnline"],
    limit,
    offset,
    distinct: true,
    order: [["name", "ASC"]]
  });

  const hasMore = count > offset + users.length;

  return {
    users: users.map(user => ({
      ...user.get({ plain: true }),
      status: user.isOnline ? 'online' : 'offline'
    })),
    count,
    hasMore
  };
};

export default ListUsersService;
