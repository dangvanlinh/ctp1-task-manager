import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ctp1.vn' },
    update: { password: hash },
    create: { email: 'admin@ctp1.vn', password: hash, name: 'Admin', role: 'ADMIN' },
  });

  const pm = await prisma.user.upsert({
    where: { email: 'pm@ctp1.vn' },
    update: { password: hash },
    create: { email: 'pm@ctp1.vn', password: hash, name: 'Hung PM', role: 'PM' },
  });

  const thai = await prisma.user.upsert({
    where: { email: 'thai@ctp1.vn' },
    update: { password: hash },
    create: { email: 'thai@ctp1.vn', password: hash, name: 'A Thai', role: 'MEMBER' },
  });

  const vu = await prisma.user.upsert({
    where: { email: 'vu@ctp1.vn' },
    update: { password: hash },
    create: { email: 'vu@ctp1.vn', password: hash, name: 'Vu', role: 'MEMBER' },
  });

  const long = await prisma.user.upsert({
    where: { email: 'long@ctp1.vn' },
    update: { password: hash },
    create: { email: 'long@ctp1.vn', password: hash, name: 'Long', role: 'MEMBER' },
  });

  const tien = await prisma.user.upsert({
    where: { email: 'tien@ctp1.vn' },
    update: { password: hash },
    create: { email: 'tien@ctp1.vn', password: hash, name: 'Tien', role: 'MEMBER' },
  });

  const linh = await prisma.user.upsert({
    where: { email: 'linh@ctp1.vn' },
    update: { password: hash },
    create: { email: 'linh@ctp1.vn', password: hash, name: 'Linh', role: 'MEMBER' },
  });

  const dat = await prisma.user.upsert({
    where: { email: 'dat@ctp1.vn' },
    update: { password: hash },
    create: { email: 'dat@ctp1.vn', password: hash, name: 'Dat', role: 'MEMBER' },
  });

  // Create project
  let project = await prisma.project.findFirst({ where: { name: 'CTP1' } });
  if (!project) {
    project = await prisma.project.create({
      data: { name: 'CTP1', description: 'Du an CTP1' },
    });
  }

  // Create builds for April 2026
  const buildVip = await prisma.build.create({
    data: { name: 'New VIP Client', projectId: project.id, month: 4, year: 2026 },
  });

  const buildEvent = await prisma.build.create({
    data: { name: 'Config Event', projectId: project.id, month: 4, year: 2026 },
  });

  const buildAI = await prisma.build.create({
    data: { name: 'AI Features', projectId: project.id, month: 4, year: 2026 },
  });

  // Week 2 tasks
  await prisma.task.createMany({
    data: [
      {
        title: 'Sendout design tuning 1stpay the S',
        status: 'DONE',
        priority: 'HIGH',
        startDate: new Date('2026-04-06'),
        endDate: new Date('2026-04-07'),
        week: 2,
        buildId: buildVip.id,
        assigneeId: thai.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'Journey 7 ngay: kich repay sau khi tra 1stpay',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        startDate: new Date('2026-04-08'),
        endDate: new Date('2026-04-10'),
        week: 2,
        buildId: buildVip.id,
        assigneeId: thai.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'Report month',
        status: 'TODO',
        priority: 'MEDIUM',
        startDate: new Date('2026-04-10'),
        endDate: new Date('2026-04-10'),
        week: 2,
        buildId: buildEvent.id,
        assigneeId: thai.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'Logic sv new vip',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        startDate: new Date('2026-04-07'),
        endDate: new Date('2026-04-10'),
        week: 2,
        buildId: buildVip.id,
        assigneeId: vu.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'Config event tuan 3/4',
        status: 'TODO',
        priority: 'MEDIUM',
        startDate: new Date('2026-04-08'),
        endDate: new Date('2026-04-08'),
        week: 2,
        buildId: buildEvent.id,
        assigneeId: vu.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'Build update config trung: bo gold',
        status: 'TODO',
        priority: 'MEDIUM',
        startDate: new Date('2026-04-09'),
        endDate: new Date('2026-04-10'),
        week: 2,
        buildId: buildEvent.id,
        assigneeId: vu.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'Config event ctp2',
        status: 'TODO',
        priority: 'MEDIUM',
        startDate: new Date('2026-04-08'),
        endDate: new Date('2026-04-08'),
        week: 2,
        buildId: buildEvent.id,
        assigneeId: long.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'ctp1: Update tuning 1stpay the S',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        startDate: new Date('2026-04-07'),
        endDate: new Date('2026-04-08'),
        week: 2,
        buildId: buildVip.id,
        assigneeId: long.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'new logic ctp2',
        status: 'TODO',
        priority: 'MEDIUM',
        startDate: new Date('2026-04-09'),
        endDate: new Date('2026-04-10'),
        week: 2,
        buildId: buildEvent.id,
        assigneeId: long.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'New vip client',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        startDate: new Date('2026-04-06'),
        endDate: new Date('2026-04-10'),
        week: 2,
        buildId: buildVip.id,
        assigneeId: tien.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'AI: autoplay skill, check winrate combo',
        status: 'TODO',
        priority: 'HIGH',
        startDate: new Date('2026-04-06'),
        endDate: new Date('2026-04-07'),
        week: 2,
        buildId: buildAI.id,
        assigneeId: tien.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'AI: project mo phong logic 20 skill skb + vibe',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        startDate: new Date('2026-04-06'),
        endDate: new Date('2026-04-10'),
        week: 2,
        buildId: buildAI.id,
        assigneeId: linh.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'Config event ctp2',
        status: 'TODO',
        priority: 'MEDIUM',
        startDate: new Date('2026-04-08'),
        endDate: new Date('2026-04-09'),
        week: 2,
        buildId: buildEvent.id,
        assigneeId: linh.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'Config event ctp1 tuan 3',
        status: 'TODO',
        priority: 'MEDIUM',
        startDate: new Date('2026-04-08'),
        endDate: new Date('2026-04-08'),
        week: 2,
        buildId: buildEvent.id,
        assigneeId: dat.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'Update bo gold event Trung client ctp1',
        status: 'DONE',
        priority: 'MEDIUM',
        startDate: new Date('2026-04-08'),
        endDate: new Date('2026-04-08'),
        week: 2,
        buildId: buildEvent.id,
        assigneeId: dat.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'AI: Bot autoplay nhu nguoi',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        startDate: new Date('2026-04-06'),
        endDate: new Date('2026-04-09'),
        week: 2,
        buildId: buildAI.id,
        assigneeId: dat.id,
        createdById: pm.id,
        projectId: project.id,
      },
    ],
  });

  console.log('Seed completed!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
