import { Response, Request } from "express";
import { asyncHandler } from "../../middlewares/asyncHandler";
import { HTTPSTATUS } from "../../config/http.config";
import { UnauthorizedException } from "../../common/utils/catch-errors";
import MfaService from "./mfa.service";
import {
  verifyMfaForLoginSchema,
  verifyMfaSchema,
} from "../../common/validators/mfa.validator";
import { setAuthenticationCookies } from "../../common/utils/cookies";

class MfaController {
  private mfaService: MfaService;

  constructor() {
    this.mfaService = new MfaService();
  }

  public generateMFASetup = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { secret, qrImageUrl, message } =
        await this.mfaService.generateMFASetup(req);
      return res.status(HTTPSTATUS.OK).json({
        message: message,
        secret,
        qrImageUrl,
      });
    }
  );

  public verifyMFASetup = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { code, secretKey } = verifyMfaSchema.parse({
        ...req.body,
      });
      const { userPreferences, message } = await this.mfaService.verifyMFASetup(
        req,
        code,
        secretKey
      );
      return res.status(HTTPSTATUS.OK).json({
        message: message,
        userPreferences: userPreferences,
      });
    }
  );

  public verifyMFAForLogin = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { code, email, userAgent } = verifyMfaForLoginSchema.parse({
        ...req.body,
        userAgent: req.headers["user-agent"],
      });
      const { accessToken, refreshToken, user } =
        await this.mfaService.verifyMFAForLogin(code, email, userAgent);

      return setAuthenticationCookies({ res, accessToken, refreshToken })
        .status(HTTPSTATUS.OK)
        .json({
          message: "Verified & login successfully",
          user,
        });
    }
  );

  public revokeMFA = asyncHandler(
    async (req: Request, res: Response): Promise<any> => {
      const { userPreferences, message } = await this.mfaService.revokeMFA(req);
      return res.status(HTTPSTATUS.OK).json({
        message: message,
        userPreferences: userPreferences,
      });
    }
  );
}

export const mfaController = new MfaController();
