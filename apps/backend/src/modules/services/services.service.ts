import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async createService(userId: string, dto: CreateServiceDto) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Provider profile not found');

    return this.prisma.service.create({
      data: {
        providerId: profile.id,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        durationMinutes: dto.durationMinutes,
      },
    });
  }

  async getMyServices(userId: string) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Provider profile not found');

    return this.prisma.service.findMany({
      where: { providerId: profile.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateService(userId: string, serviceId: string, dto: UpdateServiceDto) {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Provider profile not found');

    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Service not found');
    if (service.providerId !== profile.id) throw new ForbiddenException('Not your service');

    return this.prisma.service.update({ where: { id: serviceId }, data: dto });
  }

  async deleteService(userId: string, serviceId: string): Promise<void> {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Provider profile not found');

    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Service not found');
    if (service.providerId !== profile.id) throw new ForbiddenException('Not your service');

    await this.prisma.service.update({ where: { id: serviceId }, data: { isActive: false } });
  }
}
