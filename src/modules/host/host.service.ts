import User from "../../models/User";
import { success, error } from "../../utils/response";

export const searchUsers = async (
  req: any,
  res: any
) => {
  try {

    const { search } = req.query;

    const filter = search
      ? {
          $or: [
            {
              name: {
                $regex: search,
                $options: "i"
              }
            },
            {
              instagramId: {
                $regex: search,
                $options: "i"
              }
            }
          ]
        }
      : {};

    const users: any[] =
      await User.find(filter)

        .select(`
          name
          image
          bio
          instagramId
          gender
          email
        `)

        .limit(50)

        .lean();

    const formatted = users.map(
      (u: any) => ({

        id: u._id,

        name: u.name || "",

        image: u.image || null,

        bio: u.bio || "",

        instagramId:
          u.instagramId || "",

        gender:
          u.gender || null,

        email:
          u.email || ""
      })
    );

    return success(
      res,
      "Users fetched",
      formatted
    );

  } catch (err) {

    console.error(err);

    return error(
      res,
      "Failed"
    );
  }
};