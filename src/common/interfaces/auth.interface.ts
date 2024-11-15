export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  userAgent?: string;
}

export interface loginDto {
  email: string;
  password: string;
  userAgent?: string;
}

export interface resetPasswordDto {
  password: string;
  verificationCode: string;
}
