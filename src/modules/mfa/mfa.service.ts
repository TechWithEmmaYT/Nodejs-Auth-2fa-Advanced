import { Request } from "express";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "../../common/utils/catch-errors";
import UserModel from "../../database/models/user.model";
import SessionModel from "../../database/models/session.model";
import { refreshTokenSignOptions, signJwtToken } from "../../common/utils/jwt";

class MfaService {
  public async generateMFASetup(req: Request): Promise<any> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException("User not authorized");
    }

    if (user.userPreferences.enable2FA) {
      return {
        message: "MFA is already enabled",
      };
    }

    let secretKey = user.userPreferences.twoFactorSecret;
    if (!secretKey) {
      const secret = speakeasy.generateSecret({ name: "Squeezy" });
      secretKey = secret.base32;
      user.userPreferences.twoFactorSecret = secretKey;
      await user.save();
    }

    const url = speakeasy.otpauthURL({
      secret: secretKey,
      label: `${user.email}`,
      issuer: "squeezy.com",
      encoding: "base32",
    });
    const qrImageUrl = await qrcode.toDataURL(url);

    return {
      message: "Scan the QR code or use the setup key.",
      secret: secretKey,
      qrImageUrl,
    };
  }

  public async verifyMFASetup(
    req: Request,
    code: string,
    secretKey: string
  ): Promise<any> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException("User not authorized");
    }

    if (user.userPreferences.enable2FA) {
      return {
        message: "MFA is already enabled",
        userPreferences: {
          enable2FA: user.userPreferences.enable2FA,
        },
      };
    }

    const isValid = speakeasy.totp.verify({
      secret: secretKey, // The secret that was provided during setup
      encoding: "base32",
      token: code, // 6-digit code from the user
    });

    if (!isValid) {
      throw new BadRequestException("Invalid MFA code. Please try again.");
    }
    user.userPreferences.enable2FA = true;
    await user.save();
    return {
      message: "MFA setup completed successfully",
      userPreferences: {
        enable2FA: user.userPreferences.enable2FA,
      },
    };
  }

  public async verifyMFAForLogin(
    code: string,
    email: string,
    userAgent?: string
  ): Promise<any> {
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (
      !user.userPreferences.enable2FA &&
      !user.userPreferences.twoFactorSecret
    ) {
      throw new UnauthorizedException("MFA not enabled for this user");
    }

    const isValid = speakeasy.totp.verify({
      secret: user.userPreferences.twoFactorSecret!, // Secret stored in user preferences
      encoding: "base32",
      token: code, // 6-digit code from the authenticator app
    });

    if (!isValid) {
      throw new BadRequestException("Invalid MFA code. Please try again.");
    }

    const session = await SessionModel.create({
      userId: user._id,
      userAgent,
    });

    //sign access token & refresh token
    const accessToken = signJwtToken({
      userId: user._id,
      sessionId: session._id,
    });

    const refreshToken = signJwtToken(
      { sessionId: session._id },
      refreshTokenSignOptions
    );

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  public async revokeMFA(req: Request) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException("User not authorized");
    }

    if (!user.userPreferences.enable2FA) {
      return {
        message: "MFA is not enabled",
        userPreferences: {
          enable2FA: user.userPreferences.enable2FA,
        },
      };
    }

    user.userPreferences.twoFactorSecret = undefined;
    user.userPreferences.enable2FA = false;
    await user.save();

    return {
      message: "MFA revoke successfully",
      userPreferences: {
        enable2FA: user.userPreferences.enable2FA,
      },
    };
  }
}

export default MfaService;
