import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

const DEFAULT_PASSWORD = '123456';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async create(data: { email?: string; name: string; role?: string }) {
    // Auto-generate email from name if not provided
    const email = data.email?.trim() || `${data.name.toLowerCase().replace(/\s+/g, '.')}@ctp1.vn`;

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already exists');

    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    return this.prisma.user.create({
      data: { email, name: data.name, role: data.role ?? 'MEMBER', password: hash },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async update(id: string, data: { name?: string; email?: string; role?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.delete({ where: { id } });
  }

  async resetPassword(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    return this.prisma.user.update({
      where: { id },
      data: { password: hash },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async updateRole(id: string, role: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }
}
