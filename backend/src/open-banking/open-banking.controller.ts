import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OpenBankingService } from './open-banking.service';

class CallbackDto {
  @IsString() code!: string;
  @IsString() state!: string;
}

@ApiTags('open-banking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('open-banking')
export class OpenBankingController {
  constructor(private readonly service: OpenBankingService) {}

  @Post('connect/start')
  @HttpCode(HttpStatus.OK)
  async start(@CurrentUser() user: AuthenticatedUser): Promise<{ authUrl: string; state: string }> {
    return this.service.startConnect(user.id);
  }

  @Post('connect/callback')
  @HttpCode(HttpStatus.OK)
  async callback(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CallbackDto,
  ): Promise<{ connectionId: string; institutionName: string }> {
    return this.service.finishConnect(user.id, dto.code, dto.state);
  }

  @Get('connections')
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listConnections(user.id);
  }

  @Delete('connections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.service.revoke(user.id, id);
  }

  @Post('connections/:id/sync')
  @HttpCode(HttpStatus.OK)
  async sync(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ synced: number }> {
    return this.service.syncTransactions(user.id, id);
  }
}
