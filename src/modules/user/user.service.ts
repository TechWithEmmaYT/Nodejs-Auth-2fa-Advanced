import { NotFoundException } from "../../common/utils/catch-errors";
import UserModel from "../../database/models/user.model";

class UserService {
  public async findUserById(userId: string) {
    const user = await UserModel.findById(userId, {
      password: false,
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }
}

export default UserService;
