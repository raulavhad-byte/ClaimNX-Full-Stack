import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  @Get()
  async health() {
    const supabase = this.databaseService.getClient();

    const { error } = await supabase
      .from('roles')
      .select('id')
      .limit(1);

    return {
      status: 'ok',
      database: error ? 'disconnected' : 'connected',
    };
  }
}