import { getEnv } from "../common/utils/get-env";

const appConfig = () => ({
  NODE_ENV: getEnv("NODE_ENV", "development"),
  APP_ORIGIN: getEnv("APP_ORIGIN", "localhost"),
  PORT: getEnv("PORT", "5000"),
  BASE_PATH: getEnv("BASE_PATH", "/api/v1"),
  MONGO_URI: getEnv("MONOGO_URI"),
  JWT: {
    SECRET: getEnv("JWT_SECRET"),
    EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "15m"),
    REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
    REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRES_IN", "30d"),
  },
  MAILER_SENDER: getEnv("MAILER_SENDER"),
  RESEND_API_KEY: getEnv("RESEND_API_KEY"),
  // AWS: {
  //   ACCESS_KEY_ID: getEnv("AWS_ACCESS_KEY_ID"),
  //   SECRET_ACCESS_KEY: getEnv("AWS_SECRET_ACCESS_KEY"),
  //   S3_BUCKET: getEnv("AWS_S3_BUCKET"),
  // },
  // STRIPE: {
  //   SECRET_KEY: getEnv("STRIPE_SECRET_KEY"),
  // },
});

export const config = appConfig();
