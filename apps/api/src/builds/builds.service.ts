import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBuildDto } from './dto/create-build.dto';
import { UpdateBuildDto } from './dto/update-build.dto';

@Injectable()
export class BuildsService {
  constructor(private prisma: PrismaService) {}

  findByMonth(projectId: string, month: number, year: number) {
    return this.prisma.build.findMany({
      where: { projectId, month, year },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateBuildDto) {
    return this.prisma.build.create({ data: dto });
  }

  async update(id: string, dto: UpdateBuildDto) {
    const build = await this.prisma.build.findUnique({ where: { id } });
    if (!build) throw new NotFoundException('Build not found');
    return this.prisma.build.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const build = await this.prisma.build.findUnique({ where: { id } });
    if (!build) throw new NotFoundException('Build not found');
    return this.prisma.build.delete({ where: { id } });
  }
}
