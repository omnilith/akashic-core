import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module'; // ✅ Import the DbModule to access DrizzleService

@Module({
  imports: [DbModule],
})
export class EntitiesModule {}
