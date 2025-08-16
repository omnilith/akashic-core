import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { EntityTypesModule } from './modules/entity-types/entity-types.module';
import { EntitiesModule } from './modules/entities/entities.module';
import { JSONScalar } from './lib/json.scalar';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true,
    }),
    DbModule,
    EntityTypesModule,
    EntitiesModule,
  ],
  controllers: [AppController],
  providers: [AppService, JSONScalar],
})
export class AppModule {}
