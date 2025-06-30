export interface ForgotPasswordDto {
  email: string;
}
export interface LoginDto extends ForgotPasswordDto {
  password: string;
}

export interface VerifyOtpDto extends ForgotPasswordDto {
  otp: string;
}

export interface ResetPasswordDto extends LoginDto {
  confirmPassword: string;
}
