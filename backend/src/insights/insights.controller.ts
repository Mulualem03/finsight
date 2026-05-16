import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { InsightsService } from './insights.service';

class ByCategoryQuery {
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
}

@ApiTags('insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('insights')
export class InsightsController {
  constructor(private readonly service: InsightsService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.service.summary(user.id);
  }

  @Get('by-category')
  byCategory(@CurrentUser() user: AuthenticatedUser, @Query() q: ByCategoryQuery) {
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.service.byCategory(
      user.id,
      q.from ? new Date(q.from) : defaultFrom,
      q.to ? new Date(q.to) : now,
    );
  }

  @Get('trends')
  trends(@CurrentUser() user: AuthenticatedUser) {
    return this.service.trends(user.id);
  }

  @Get('forecast')
  forecast(@CurrentUser() user: AuthenticatedUser) {
    return this.service.forecast(user.id);
  }
}
