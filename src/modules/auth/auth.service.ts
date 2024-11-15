import UserModel from "../../database/models/user.model";
import {
  RegisterDto,
  loginDto,
  resetPasswordDto,
} from "../../common/interfaces/auth.interface";
import {
  BadRequestException,
  HttpException,
  InternalServerException,
  NotFoundException,
  UnauthorizedException,
} from "../../common/utils/catch-errors";
import VerificationCodeModel from "../../database/models/verification-code.model";
import { VerificationEnum } from "../../common/enums/verification-code.enum";
import {
  calculateExpirationDate,
  //threeMinutesAgo,
  tenMinutesAgo,
  fortyFiveMinutesFromNow,
  ONE_DAY_IN_MS,
  anHourFromNow,
} from "../../common/utils/date-time";
import SessionModel from "../../database/models/session.model";
import { config } from "../../config/app.config";
import { HTTPSTATUS } from "../../config/http.config";
import { ErrorCode } from "../../common/enums/error-code.enum";
import {
  RefreshTokenPayload,
  refreshTokenSignOptions,
  signJwtToken,
  VerifyJwtResponse,
  verifyJwtToken,
} from "../../common/utils/jwt";
import { sendEmail } from "../../mailers/mailer";
import {
  passwordResetTemplate,
  verifyEmailTemplate,
} from "../../mailers/templates/template";
import { hashValue } from "../../common/utils/bcrypt";

class AuthService {
  public async register(registerData: RegisterDto) {
    const { name, email, password, userAgent } = registerData;
    //verify existing user is registered
    const existingUser = await UserModel.exists({
      email: registerData.email,
    });

    if (existingUser) {
      throw new BadRequestException(
        "User already exists with this email",
        ErrorCode.AUTH_EMAIL_ALREADY_EXISTS
      );
    }
    //create new user
    const newUser = await UserModel.create({
      name,
      email,
      password,
    });

    const userId = newUser._id;
    //create verification code 45mins
    const code = await VerificationCodeModel.create({
      userId,
      type: VerificationEnum.EMAIL_VERIFICATION,
      expiresAt: fortyFiveMinutesFromNow(),
    });
    //send verification email
    try {
      const verificationUrl = `${config.APP_ORIGIN}/confirm-account?code=${code._id}`;
      await sendEmail({
        to: newUser.email,
        ...verifyEmailTemplate(verificationUrl),
      });
    } catch (err) {
      console.log(err);
    }

    //create session valid for 7day
    const session = await SessionModel.create({
      userId,
      userAgent,
    });
    //sign access token & refresh token
    const accessToken = signJwtToken({
      userId,
      sessionId: session._id,
    });

    const refreshToken = signJwtToken(
      { sessionId: session._id },
      refreshTokenSignOptions
    );
    // const refreshToken = jwt.sign(
    //   { sessionId: session._id },
    //   config.JWT.REFRESH_SECRET,
    //   {
    //     audience: ["user"],
    //     expiresIn: config.JWT.REFRESH_EXPIRES_IN, //expires in 3odays
    //   }
    // );
    //return  new user & tokens
    return {
      user: newUser,
      accessToken,
      refreshToken,
    };
  }

  public async login(loginData: loginDto) {
    const { email, password, userAgent } = loginData;
    const user = await UserModel.findOne({
      email: email,
    });
    if (!user) {
      throw new BadRequestException(
        "Invalid email or password provided",
        ErrorCode.AUTH_USER_NOT_FOUND
      );
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new BadRequestException(
        "Invalid email or password provided",
        ErrorCode.AUTH_USER_NOT_FOUND
      );
    }

    if (user.userPreferences.enable2FA) {
      return {
        user: null,
        mfaRequired: true,
        accessToken: "",
        refreshToken: "",
      };
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

  public async verifyEmail(code: string): Promise<any> {
    const validCode = await VerificationCodeModel.findOne({
      _id: code,
      type: VerificationEnum.EMAIL_VERIFICATION,
      expiresAt: { $gt: new Date() },
    });

    if (!validCode) {
      throw new NotFoundException("Invalid or expired verification code");
    }
    const updatedUser = await UserModel.findByIdAndUpdate(
      validCode.userId,
      {
        isEmailVerified: true,
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new BadRequestException(
        "Unable to verify email address",
        ErrorCode.VALIDATION_ERROR
      );
    }
    await validCode.deleteOne();

    return {
      user: updatedUser,
    };
  }

  public async refreshToken(refreshToken: string): Promise<any> {
    const { payload } = verifyJwtToken<RefreshTokenPayload>(refreshToken, {
      secret: refreshTokenSignOptions.secret,
    });

    if (!payload) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const session = await SessionModel.findById(payload.sessionId);
    const now = Date.now();

    if (!session) {
      throw new UnauthorizedException("Session expired");
    }

    if (session.expiresAt.getTime() <= now) {
      throw new UnauthorizedException("Session expired");
    }

    const sessionRequireRefresh =
      session.expiresAt.getTime() - now <= ONE_DAY_IN_MS;
    if (sessionRequireRefresh) {
      session.expiresAt = calculateExpirationDate(
        config.JWT.REFRESH_EXPIRES_IN
      );
      await session.save();
    }

    const newRefreshToken = sessionRequireRefresh
      ? signJwtToken(
          {
            sessionId: session._id,
          },
          refreshTokenSignOptions
        )
      : undefined;

    const accessToken = signJwtToken({
      userId: session.userId,
      sessionId: session._id,
    });

    return {
      accessToken,
      newRefreshToken,
    };
  }

  // Forgot Password Reset Method
  public async forgotPassword(email: string): Promise<any> {
    try {
      const user = await UserModel.findOne({
        email: email,
      });

      if (!user) {
        throw new NotFoundException("User not found");
      }

      //check mail rate limit is 2 email per 3min
      const timeAgo = tenMinutesAgo(); //threeMinutesAgo()
      const maxAttempts = 2;
      const count = await VerificationCodeModel.countDocuments({
        userId: user.id,
        type: VerificationEnum.PASSWORD_RESET,
        createdAt: { $gt: timeAgo },
      });

      if (count >= maxAttempts) {
        throw new HttpException(
          "Too many request, try again later",
          HTTPSTATUS.TOO_MANY_REQUESTS,
          ErrorCode.AUTH_TOO_MANY_ATTEMPTS
        );
      }

      const expiresAt = anHourFromNow();
      const verifyCode = await VerificationCodeModel.create({
        userId: user.id,
        type: VerificationEnum.PASSWORD_RESET,
        expiresAt,
      });

      //send verification email
      const resetUrl = `${config.APP_ORIGIN}/reset-password?code=${
        verifyCode._id
      }&exp=${expiresAt.getTime()}`;

      const { data, error } = await sendEmail({
        to: user.email,
        ...passwordResetTemplate(resetUrl),
      });

      if (!data?.id) {
        throw new InternalServerException(`${error?.name} ${error?.message}`);
      }

      return {
        url: resetUrl,
        emailId: data.id,
      };
    } catch (err) {
      console.log("Paawordreset error", err);
      return {};
    }
  }

  // Reset Password Method
  public async resetPassword({
    password,
    verificationCode,
  }: resetPasswordDto): Promise<any> {
    const validCode = await VerificationCodeModel.findOne({
      _id: verificationCode,
      type: VerificationEnum.PASSWORD_RESET,
      expiresAt: { $gt: new Date() },
    });

    if (!validCode) {
      throw new NotFoundException("Invalid or expired verification code");
    }

    const hashedPassword = await hashValue(password);

    const updatedUser = await UserModel.findByIdAndUpdate(validCode.userId, {
      password: hashedPassword,
    });

    if (!updatedUser) {
      throw new BadRequestException("Failed to reset password!");
    }

    // Delete the reset password validation code
    await validCode.deleteOne();

    // Delete all session data when password has been reset
    await SessionModel.deleteMany({
      userId: updatedUser._id,
    });

    return {
      user: updatedUser,
    };
  }

  public async logout(tokenResponse: VerifyJwtResponse): Promise<any> {
    const { payload, error } = tokenResponse;
    if (error) {
      console.log(error);
    }
    if ("payload" in tokenResponse && payload) {
      await SessionModel.findByIdAndDelete(payload.sessionId);
    } else {
      console.log("No valid payload found in tokenResponse");
    }
  }
}

export default AuthService;
