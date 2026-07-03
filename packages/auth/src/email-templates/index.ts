export { WelcomeEmail } from "./welcome";
export { ForgotPasswordEmail } from "./forgot-password";
export { MagicLinkEmail } from "./magic-link";
export { VerifyEmail } from "./verify-email";

export const EMAIL_TEMPLATES = {
  WELCOME: "welcome",
  FORGOT_PASSWORD: "forgot-password",
  MAGIC_LINK: "magic-link",
  VERIFY_EMAIL: "verify-email",
} as const;
