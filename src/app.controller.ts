import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DrizzleService } from './db/drizzle.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly drizzle: DrizzleService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async health() {
    const result = await this.drizzle.db.execute('SELECT NOW()');
    return {
      status: 'connected',
      time: result.rows[0],
    };
  }
}
