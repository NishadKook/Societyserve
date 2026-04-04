import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UploadsService } from './uploads.service';
import { SignedUrlDto } from './dto/signed-url.dto';

@Controller('uploads')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('signed-url')
  async getSignedUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SignedUrlDto,
  ) {
    const result = await this.uploadsService.generateUploadUrl(
      user.id,
      dto.folder,
      dto.fileName,
    );
    return result;
  }

  @Delete()
  async deleteFile(
    @CurrentUser() user: AuthenticatedUser,
    @Body('filePath') filePath: string,
  ) {
    // Validate that the user owns the file (path contains their userId)
    if (!filePath || !filePath.includes(`/${user.id}/`)) {
      throw new ForbiddenException('You can only delete your own files');
    }

    await this.uploadsService.deleteFile(filePath);
    return { message: 'File deleted' };
  }
}
