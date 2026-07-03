import helmet from "helmet";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");

  app.use(helmet());
  app.use(cookieParser());
  app.enableShutdownHooks();

  const origin = process.env["CORS_ORIGIN"] ?? "http://localhost:5173";
  app.enableCors({
    origin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  });

  app.setGlobalPrefix("api");
  const port = process.env["PORT"] ?? 3002;
  await app.listen(port);
  logger.log(`Drizzle example API running at http://localhost:${port}`);
}
bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal error during bootstrap:", err);
  process.exit(1);
});
