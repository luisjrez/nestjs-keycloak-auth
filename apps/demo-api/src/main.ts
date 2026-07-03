import helmet from "helmet";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";
import type { Request, Response, NextFunction } from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn", "debug", "verbose"],
  });

  const logger = new Logger("Bootstrap");

  app.use(helmet());
  app.enableShutdownHooks();

  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug(`${req.method} ${req.url}`);
    next();
  });

  const origin = process.env["CORS_ORIGIN"] ?? "http://localhost:5173";
  app.enableCors({
    origin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  });

  app.use(cookieParser());
  app.setGlobalPrefix("api");
  const port = process.env["PORT"] ?? 3000;
  await app.listen(port);
  logger.log(`Demo API running at http://localhost:${port}`);
}
bootstrap().catch((err) => {
  // eslint-disable-next-line no-console -- logger may not exist if bootstrap failed
  console.error("Fatal error during bootstrap:", err);
  process.exit(1);
});
