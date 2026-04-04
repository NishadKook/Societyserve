import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceDto, RemoveDeviceDto } from './dto/register-device.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('register-device')
  @ApiOperation({ summary: 'Register a device token for push notifications' })
  async registerDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDeviceDto,
  ) {
    await this.notificationsService.registerDevice(
      user.id,
      dto.token,
      dto.platform,
    );
    return { message: 'Device registered' };
  }

  @Delete('remove-device')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a device token' })
  async removeDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RemoveDeviceDto,
  ) {
    await this.notificationsService.removeDevice(user.id, dto.token);
    return { message: 'Device removed' };
  }
}
