import { Module } from '@nestjs/common';
import { JobBoardController } from './job-board.controller';
import { JobBoardService } from './job-board.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [JobBoardController],
  providers: [JobBoardService],
  exports: [JobBoardService],
})
export class JobBoardModule {}
