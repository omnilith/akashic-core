import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';

@Injectable()
export class EntitiesRepo {
  constructor(private db: DrizzleService) {}
}
