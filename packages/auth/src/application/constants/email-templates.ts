/**
 * Template identifiers used by the use cases. Lives in the application
 * layer so use cases don't import the React email-templates barrel
 * (which would drag React into the application dependency graph).
 */
export const EMAIL_TEMPLATES = {
  WELCOME: "welcome",
  FORGOT_PASSWORD: "forgot-password",
  MAGIC_LINK: "magic-link",
  VERIFY_EMAIL: "verify-email",
} as const;

export type EmailTemplateName = (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES];
