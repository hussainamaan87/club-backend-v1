import User from "../../models/User";
import { success, error } from "../../utils/response";

export const searchUsers = async (req: any, res: any) => {
  try {
    const { search } = req.query;

    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { instagramId: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    const users = await User.find(filter)
      .select("-phone")
      .limit(50)
      .lean();

    return success(res, "Users fetched", users);

  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};