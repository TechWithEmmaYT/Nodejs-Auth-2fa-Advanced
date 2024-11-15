import { Response, CookieOptions } from "express";
import { config } from "../../config/app.config";
import { calculateExpirationDate } from "./date-time";

type CookiePayload = {
  res: Response;
  accessToken: string;
  refreshToken: string;
};

export const REFRESH_PATH = `${config.BASE_PATH}/auth/refresh`;

const defaults: CookieOptions = {
  httpOnly: true, // Makes the cookie inaccessible to JavaScript
  secure: config.NODE_ENV === "production" ? true : false, // Ensures cookies are sent over HTTPS only in production
  sameSite: config.NODE_ENV === "production" ? "none" : "lax", // CSRF protection
  domain: config.COOKIE_DOMAIN,
  priority: "high",
};

export const getRefreshTokenCookieOptions = (): CookieOptions => {
  const expiresIn = config.JWT.REFRESH_EXPIRES_IN;
  const expires = calculateExpirationDate(expiresIn);
  return {
    ...defaults,
    expires,
    path: REFRESH_PATH, // is only sent in this path not in all path
  };
};

export const getAccessTokenCookieOptions = (): CookieOptions => {
  const expiresIn = config.JWT.EXPIRES_IN;
  const expires = calculateExpirationDate(expiresIn);
  return {
    ...defaults,
    expires,
    path: "/",
  };
};

// Utility function to set cookies with enhanced security
export const setAuthenticationCookies = ({
  res,
  accessToken,
  refreshToken,
}: CookiePayload): Response =>
  res
    .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
    .cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

export const clearAuthenticationCookies = (res: Response): Response =>
  res.clearCookie("accessToken").clearCookie("refreshToken", {
    path: REFRESH_PATH,
  });
