import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: 'http://localhost:5173', // URL de votre frontend
    credentials: true,
  });

  const port = configService.get('PORT') || 3000;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
  console.log(`API available at: http://localhost:${port}`);
}
bootstrap();