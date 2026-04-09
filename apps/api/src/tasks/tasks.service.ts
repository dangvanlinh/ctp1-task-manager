import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  findByMonthWeek(projectId: string, month: number, year: number, week?: number) {
    return this.prisma.task.findMany({
      where: {
        projectId,
        ...(week ? { week } : {}),
        startDate: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
      include: {
        assignee: { select: { id: true, email: true, name: true, role: true, createdAt: true } },
        build: true,
      },
      orderBy: [{ week: 'asc' }, { assigneeId: 'asc' }, { order: 'asc' }, { startDate: 'asc' }],
    });
  }

  async create(dto: CreateTaskDto, createdById: string) {
    return this.prisma.task.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        createdById,
      },
      include: {
        assignee: { select: { id: true, email: true, name: true, role: true, createdAt: true } },
        build: true,
      },
    });
  }

  async update(id: string, dto: UpdateTaskDto, userId: string, userRole: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');

    if (userRole === 'MEMBER' && task.assigneeId !== userId) {
      throw new ForbiddenException('Members can only update their own tasks');
    }

    if (userRole === 'MEMBER') {
      const keys = Object.keys(dto);
      if (keys.some((k) => k !== 'status')) {
        throw new ForbiddenException('Members can only update task status');
      }
    }

    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.status === 'DONE') data.completedAt = new Date();
    if (dto.status && dto.status !== 'DONE') data.completedAt = null;

    return this.prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, email: true, name: true, role: true, createdAt: true } },
        build: true,
      },
    });
  }

  async reorder(items: { id: string; order: number }[]) {
    const updates = items.map((item) =>
      this.prisma.task.update({ where: { id: item.id }, data: { order: item.order } }),
    );
    await this.prisma.$transaction(updates);
    return { success: true };
  }

  async remove(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.task.delete({ where: { id } });
  }
}
