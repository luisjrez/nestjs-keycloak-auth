import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  const origin = process.env["CORS_ORIGIN"] ?? "http://localhost:5173";
  app.enableCors({
    origin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.use(cookieParser());
  app.setGlobalPrefix("api");
  const port = process.env["PORT"] ?? 3000;
  await app.listen(port);
  console.log(`Demo API running at http://localhost:${port}`);
}
bootstrap();
