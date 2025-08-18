import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Akashic Core API')
    .setDescription(
      'An ontology-first backend platform for building personal and organizational digital twins. ' +
        'Features event sourcing, typed relationships, and namespace isolation.',
    )
    .setVersion('1.0')
    .addTag('Entity Types', 'Define data schemas as JSON Schema documents')
    .addTag(
      'Entities',
      'Create and validate instances against type definitions',
    )
    .addTag('Relation Types', 'Define typed relationships between entity types')
    .addTag('Relations', 'Create actual links between entity instances')
    .addTag('Events', 'Event sourcing and audit log')
    .addTag('Processes', 'Execute step-by-step workflows (in development)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Akashic Core API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo_text.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // Enable CORS for development
  app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
  console.log(`🎮 GraphQL Playground: http://localhost:${port}/graphql`);
}

bootstrap();
