import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBuildDto } from './dto/create-build.dto';
import { UpdateBuildDto } from './dto/update-build.dto';

const buildInclude = {
  milestones: { orderBy: { date: 'asc' as const } },
  assignees: { include: { user: { select: { id: true, email: true, name: true, role: true, createdAt: true } } } },
};

@Injectable()
export class BuildsService {
  constructor(private prisma: PrismaService) {}

  findByMonth(projectId: string, month: number, year: number) {
    return this.prisma.build.findMany({
      where: { projectId, month, year },
      include: buildInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateBuildDto, createdById: string) {
    const { assigneeIds, milestones, ...buildData } = dto;

    const build = await this.prisma.build.create({
      data: {
        ...buildData,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        liveDate: dto.liveDate ? new Date(dto.liveDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        assignees: assigneeIds?.length
          ? { create: assigneeIds.map((userId) => ({ userId })) }
          : undefined,
        milestones: milestones?.length
          ? { create: milestones.map((m) => ({ name: m.name, date: new Date(m.date), type: m.type ?? 'BUILD' })) }
          : undefined,
      },
      include: buildInclude,
    });

    // Auto-generate tasks for each assignee based on milestones
    if (assigneeIds?.length && milestones?.length) {
      const taskPromises: Promise<any>[] = [];
      for (const userId of assigneeIds) {
        for (let i = 0; i < milestones.length; i++) {
          const ms = milestones[i];
          const msDate = new Date(ms.date);
          // Task end date = next milestone date - 1 day, or same day if last
          const nextMs = milestones[i + 1];
          const endDate = nextMs ? new Date(new Date(nextMs.date).getTime() - 86400000) : msDate;
          // Calculate week number: (day - 1) / 7 + 1
          const week = Math.min(Math.ceil(msDate.getDate() / 7) || 1, 52);

          taskPromises.push(
            this.prisma.task.create({
              data: {
                title: `${dto.name} - ${ms.name}`,
                startDate: msDate,
                endDate: endDate < msDate ? msDate : endDate,
                week,
                priority: 'MEDIUM',
                assigneeId: userId,
                createdById,
                projectId: dto.projectId,
                buildId: build.id,
              },
            }),
          );
        }
      }
      await Promise.all(taskPromises);
    }

    return build;
  }

  async update(id: string, dto: UpdateBuildDto) {
    const build = await this.prisma.build.findUnique({ where: { id } });
    if (!build) throw new NotFoundException('Build not found');

    const { assigneeIds, milestones, ...updateData } = dto;

    // Update milestones: delete old, create new
    if (milestones) {
      await this.prisma.buildMilestone.deleteMany({ where: { buildId: id } });
    }

    // Update assignees: delete old, create new
    if (assigneeIds) {
      await this.prisma.buildAssignee.deleteMany({ where: { buildId: id } });
    }

    return this.prisma.build.update({
      where: { id },
      data: {
        ...updateData,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        liveDate: dto.liveDate ? new Date(dto.liveDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        assignees: assigneeIds
          ? { create: assigneeIds.map((userId) => ({ userId })) }
          : undefined,
        milestones: milestones
          ? { create: milestones.map((m) => ({ name: m.name, date: new Date(m.date), type: m.type ?? 'BUILD' })) }
          : undefined,
      },
      include: buildInclude,
    });
  }

  async remove(id: string) {
    const build = await this.prisma.build.findUnique({ where: { id } });
    if (!build) throw new NotFoundException('Build not found');
    return this.prisma.build.delete({ where: { id } });
  }

  async addMilestone(buildId: string, data: { name: string; date: string; type?: string }) {
    const build = await this.prisma.build.findUnique({ where: { id: buildId } });
    if (!build) throw new NotFoundException('Build not found');

    await this.prisma.buildMilestone.create({
      data: { buildId, name: data.name, date: new Date(data.date), type: data.type ?? 'BUILD' },
    });

    // Auto-update build startDate/liveDate based on milestones
    const milestones = await this.prisma.buildMilestone.findMany({ where: { buildId }, orderBy: { date: 'asc' } });
    const liveMilestone = milestones.find((m) => m.type === 'LIVE');
    await this.prisma.build.update({
      where: { id: buildId },
      data: {
        startDate: milestones[0]?.date ?? null,
        liveDate: liveMilestone?.date ?? null,
      },
    });

    return this.prisma.build.findUnique({ where: { id: buildId }, include: buildInclude });
  }

  async removeMilestone(milestoneId: string) {
    const ms = await this.prisma.buildMilestone.findUnique({ where: { id: milestoneId } });
    if (!ms) throw new NotFoundException('Milestone not found');
    await this.prisma.buildMilestone.delete({ where: { id: milestoneId } });

    // Re-calc build dates
    const milestones = await this.prisma.buildMilestone.findMany({ where: { buildId: ms.buildId }, orderBy: { date: 'asc' } });
    const liveMilestone = milestones.find((m) => m.type === 'LIVE');
    await this.prisma.build.update({
      where: { id: ms.buildId },
      data: {
        startDate: milestones[0]?.date ?? null,
        liveDate: liveMilestone?.date ?? null,
      },
    });

    return this.prisma.build.findUnique({ where: { id: ms.buildId }, include: buildInclude });
  }
}
