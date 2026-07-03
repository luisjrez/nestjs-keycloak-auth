/** DI token for the validated AuthModuleOptions object. */
export const AUTH_MODULE_OPTIONS = "AUTH_MODULE_OPTIONS";

/** DI token for the consumer-provided ITokenStore implementation. */
export const TOKEN_STORE = "ITokenStore";

/** DI token for the IAuthProvider port (aliases KeycloakAuthProvider). */
export const AUTH_PROVIDER = "IAuthProvider";

/** DI token for the IEmailSender port (custom or default SMTP sender). */
export const EMAIL_SENDER = "IEmailSender";

/** DI token for the IEmailRenderer port (custom or default React renderer). */
export const EMAIL_RENDERER = "IEmailRenderer";
