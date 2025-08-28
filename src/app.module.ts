import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { EntityTypesModule } from './modules/entity-types/entity-types.module';
import { EntitiesModule } from './modules/entities/entities.module';
import { RelationTypesModule } from './modules/relation-types/relation-types.module';
import { ProcessesModule } from './modules/processes/processes.module';
import { RelationsModule } from './modules/relations/relations.module';
import { EventsModule } from './modules/events/events.module';
import { JSONScalar } from './lib/json.scalar';

@Module({
  imports: [
    // Load .env files properly with NestJS ConfigModule
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available everywhere
      envFilePath: '.env', // Load .env file
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true,
    }),
    DbModule,
    EntityTypesModule,
    EntitiesModule,
    RelationTypesModule,
    RelationsModule,
    EventsModule,
    ProcessesModule,
  ],
  controllers: [AppController],
  providers: [AppService, JSONScalar],
})
export class AppModule {}
