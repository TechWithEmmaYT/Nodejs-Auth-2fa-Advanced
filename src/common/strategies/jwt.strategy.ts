import passport, { PassportStatic } from "passport";
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptionsWithRequest,
} from "passport-jwt";
import { config } from "../../config/app.config";
import UserService from "../../modules/user/user.service";
import { UnauthorizedException } from "../utils/catch-errors";
import { ErrorCode } from "../enums/error-code.enum";

interface JwtPayload {
  userId: string;
  sessionId: string;
}

const options: StrategyOptionsWithRequest = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req) => {
      const accessToken = req.cookies["accessToken"];
      if (!accessToken) {
        throw new UnauthorizedException(
          "Unauthorized access token",
          ErrorCode.AUTH_TOKEN_NOT_FOUND
        );
      }
      return accessToken;
    },
  ]),
  secretOrKey: config.JWT.SECRET,
  audience: ["user"],
  algorithms: ["HS256"],
  passReqToCallback: true,
};

export const setupJwtStrategy = (passport: PassportStatic) => {
  passport.use(
    new JwtStrategy(options, async (req, payload: JwtPayload, done) => {
      try {
        const userService = new UserService();
        const user = await userService.findUserById(payload.userId);
        req.sessionId = payload.sessionId;
        return done(null, user);
      } catch (error) {
        return done(null, false);
      }
    })
  );
};

export const authenticateJWT = passport.authenticate("jwt", { session: false });
