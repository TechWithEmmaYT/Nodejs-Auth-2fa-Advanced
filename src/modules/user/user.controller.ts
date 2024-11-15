import { Response, Request } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler";
import UserService from "./user.service";
import { HTTPSTATUS } from "../../config/http.config";
import { UnauthorizedException } from "../../common/utils/catch-errors";

class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  public getCurrentUser = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const user = req?.user;
      if (!user) {
        throw new UnauthorizedException("User not found");
      }
      return res.status(HTTPSTATUS.OK).json({
        message: "Retrieve user successfully",
        data: {
          user,
        },
      });
    }
  );
}

export const userController = new UserController();
