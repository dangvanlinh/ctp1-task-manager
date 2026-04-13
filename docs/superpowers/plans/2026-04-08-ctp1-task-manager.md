# CTP1 Task Manager — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based task manager for CTP1 project with tree table + Gantt chart view, organized by Month → Week → Member → Task.

**Architecture:** Monorepo with pnpm workspace. React 19 + Vite frontend (SPA) communicates via REST with NestJS backend. PostgreSQL stores all data via Prisma ORM. JWT auth with role-based access control.

**Tech Stack:** React 19, Vite, TypeScript, TanStack Query, dnd-kit, Tailwind CSS, NestJS, Prisma, PostgreSQL, Passport JWT

---

## File Structure

```
task-manager/
├── package.json
├── pnpm-workspace.yaml
├── .gitignore
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.guard.ts
│   │   │   │   ├── roles.guard.ts
│   │   │   │   ├── roles.decorator.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── dto/
│   │   │   │       ├── login.dto.ts
│   │   │   │       └── register.dto.ts
│   │   │   ├── users/
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── dto/
│   │   │   │       └── update-role.dto.ts
│   │   │   ├── projects/
│   │   │   │   ├── projects.module.ts
│   │   │   │   ├── projects.controller.ts
│   │   │   │   ├── projects.service.ts
│   │   │   │   └── dto/
│   │   │   │       ├── create-project.dto.ts
│   │   │   │       └── update-project.dto.ts
│   │   │   ├── builds/
│   │   │   │   ├── builds.module.ts
│   │   │   │   ├── builds.controller.ts
│   │   │   │   ├── builds.service.ts
│   │   │   │   └── dto/
│   │   │   │       ├── create-build.dto.ts
│   │   │   │       └── update-build.dto.ts
│   │   │   ├── tasks/
│   │   │   │   ├── tasks.module.ts
│   │   │   │   ├── tasks.controller.ts
│   │   │   │   ├── tasks.service.ts
│   │   │   │   └── dto/
│   │   │   │       ├── create-task.dto.ts
│   │   │   │       └── update-task.dto.ts
│   │   │   └── prisma/
│   │   │       ├── prisma.module.ts
│   │   │       └── prisma.service.ts
│   │   └── test/
│   │       ├── auth.e2e-spec.ts
│   │       ├── users.e2e-spec.ts
│   │       ├── projects.e2e-spec.ts
│   │       ├── builds.e2e-spec.ts
│   │       └── tasks.e2e-spec.ts
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── api/
│           │   ├── client.ts
│           │   ├── auth.ts
│           │   ├── users.ts
│           │   ├── projects.ts
│           │   ├── builds.ts
│           │   └── tasks.ts
│           ├── hooks/
│           │   ├── useAuth.ts
│           │   ├── useTasks.ts
│           │   ├── useBuilds.ts
│           │   └── useProjects.ts
│           ├── components/
│           │   ├── Layout.tsx
│           │   ├── ProtectedRoute.tsx
│           │   ├── LoginForm.tsx
│           │   ├── RegisterForm.tsx
│           │   ├── BuildOverview.tsx
│           │   ├── TreeTable.tsx
│           │   ├── TreeRow.tsx
│           │   ├── GanttChart.tsx
│           │   ├── GanttBar.tsx
│           │   ├── TaskForm.tsx
│           │   └── MonthWeekSelector.tsx
│           ├── pages/
│           │   ├── LoginPage.tsx
│           │   ├── RegisterPage.tsx
│           │   ├── ProjectListPage.tsx
│           │   └── ProjectBoardPage.tsx
│           ├── stores/
│           │   └── authStore.ts
│           └── types/
│               └── index.ts
└── packages/
    └── shared/
        ├── package.json
        ├── tsconfig.json
        └── src/
            └── index.ts          # Shared enums, types
```

---

## Task 1: Monorepo Setup

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
cd "D:/Work/VNG/ctp1/Agent/Task manager"
git init
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "ctp1-task-manager",
  "private": true,
  "scripts": {
    "dev:api": "pnpm --filter api dev",
    "dev:web": "pnpm --filter web dev",
    "dev": "pnpm run dev:api & pnpm run dev:web",
    "build": "pnpm -r build"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Create .gitignore**

```
node_modules
dist
.env
*.log
.turbo
```

- [ ] **Step 5: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml .gitignore
git commit -m "chore: init monorepo with pnpm workspace"
```

---

## Task 2: Shared Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@ctp1/shared",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/shared/src/index.ts**

```typescript
export enum Role {
  ADMIN = 'ADMIN',
  PM = 'PM',
  MEMBER = 'MEMBER',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface BuildDto {
  id: string;
  name: string;
  projectId: string;
  month: number;
  year: number;
  createdAt: string;
}

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string;
  endDate: string;
  completedAt: string | null;
  week: number;
  buildId: string;
  build?: BuildDto;
  assigneeId: string;
  assignee?: UserDto;
  createdById: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeekGroup {
  week: number;
  startDate: string;
  endDate: string;
  members: MemberGroup[];
}

export interface MemberGroup {
  user: UserDto;
  tasks: TaskDto[];
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared package with types and enums"
```

---

## Task 3: NestJS API Scaffold

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create apps/api/package.json**

```json
{
  "name": "api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/passport": "^11.0.0",
    "@nestjs/jwt": "^11.0.0",
    "@prisma/client": "^6.0.0",
    "bcrypt": "^5.1.1",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "@ctp1/shared": "workspace:*"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/bcrypt": "^5.0.2",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.0",
    "@types/node": "^22.0.0",
    "@types/passport-jwt": "^4.0.1",
    "jest": "^29.7.0",
    "prisma": "^6.0.0",
    "ts-jest": "^29.2.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create apps/api/tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create apps/api/nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
```

- [ ] **Step 4: Create apps/api/src/main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: 'http://localhost:5173' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(3000);
}
bootstrap();
```

- [ ] **Step 5: Create apps/api/src/app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule],
})
export class AppModule {}
```

- [ ] **Step 6: Install dependencies**

```bash
cd "D:/Work/VNG/ctp1/Agent/Task manager"
pnpm install
```

- [ ] **Step 7: Verify API starts**

```bash
pnpm dev:api
```

Expected: NestJS logs "Nest application successfully started" on port 3000.

- [ ] **Step 8: Commit**

```bash
git add apps/api/
git commit -m "feat: scaffold NestJS API app"
```

---

## Task 4: Prisma Schema & Database

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/.env`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`

- [ ] **Step 1: Create apps/api/.env**

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ctp1_tasks?schema=public"
JWT_SECRET="ctp1-task-manager-jwt-secret-change-in-production"
```

- [ ] **Step 2: Create apps/api/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  PM
  MEMBER
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
}

model User {
  id             String   @id @default(uuid())
  email          String   @unique
  password       String
  name           String
  role           Role     @default(MEMBER)
  createdAt      DateTime @default(now())
  assignedTasks  Task[]   @relation("assignee")
  createdTasks   Task[]   @relation("creator")
}

model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  builds      Build[]
  tasks       Task[]
}

model Build {
  id        String   @id @default(uuid())
  name      String
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  month     Int
  year      Int
  createdAt DateTime @default(now())
  tasks     Task[]
}

model Task {
  id          String       @id @default(uuid())
  title       String
  description String?
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  startDate   DateTime
  endDate     DateTime
  completedAt DateTime?
  week        Int
  buildId     String
  build       Build        @relation(fields: [buildId], references: [id], onDelete: Cascade)
  assigneeId  String
  assignee    User         @relation("assignee", fields: [assigneeId], references: [id])
  createdById String
  createdBy   User         @relation("creator", fields: [createdById], references: [id])
  projectId   String
  project     Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}
```

- [ ] **Step 3: Create apps/api/src/prisma/prisma.service.ts**

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

- [ ] **Step 4: Create apps/api/src/prisma/prisma.module.ts**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 5: Generate Prisma client and run migration**

```bash
cd apps/api
npx prisma migrate dev --name init
```

Expected: Migration created, Prisma client generated.

- [ ] **Step 6: Commit**

```bash
cd "D:/Work/VNG/ctp1/Agent/Task manager"
git add apps/api/prisma/ apps/api/src/prisma/ apps/api/.env
git commit -m "feat: add Prisma schema with User, Project, Build, Task models"
```

---

## Task 5: Auth Module

**Files:**
- Create: `apps/api/src/auth/dto/register.dto.ts`
- Create: `apps/api/src/auth/dto/login.dto.ts`
- Create: `apps/api/src/auth/jwt.strategy.ts`
- Create: `apps/api/src/auth/auth.guard.ts`
- Create: `apps/api/src/auth/roles.decorator.ts`
- Create: `apps/api/src/auth/roles.guard.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create apps/api/src/auth/dto/register.dto.ts**

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(1)
  name: string;
}
```

- [ ] **Step 2: Create apps/api/src/auth/dto/login.dto.ts**

```typescript
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

- [ ] **Step 3: Create apps/api/src/auth/jwt.strategy.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret',
    });
  }

  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

- [ ] **Step 4: Create apps/api/src/auth/auth.guard.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 5: Create apps/api/src/auth/roles.decorator.ts**

```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '@ctp1/shared';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 6: Create apps/api/src/auth/roles.guard.ts**

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@ctp1/shared';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

- [ ] **Step 7: Create apps/api/src/auth/auth.service.ts**

```typescript
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hash, name: dto.name },
    });

    return this.generateTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user.id, user.email, user.role);
  }

  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.generateTokens(user.id, user.email, user.role);
  }

  private generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    return {
      accessToken: this.jwt.sign(payload, { expiresIn: '1h' }),
      refreshToken: this.jwt.sign(payload, { expiresIn: '7d' }),
    };
  }
}
```

- [ ] **Step 8: Create apps/api/src/auth/auth.controller.ts**

```typescript
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  refresh(@Request() req: any) {
    return this.authService.refresh(req.user.id);
  }
}
```

- [ ] **Step 9: Create apps/api/src/auth/auth.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
```

- [ ] **Step 10: Update apps/api/src/app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
})
export class AppModule {}
```

- [ ] **Step 11: Test auth endpoints manually**

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"123456","name":"Admin"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"123456"}'
```

Expected: Both return `{ "accessToken": "...", "refreshToken": "..." }`

- [ ] **Step 12: Commit**

```bash
git add apps/api/src/auth/ apps/api/src/app.module.ts
git commit -m "feat: add auth module with register, login, refresh, JWT guards, roles"
```

---

## Task 6: Users Module

**Files:**
- Create: `apps/api/src/users/dto/update-role.dto.ts`
- Create: `apps/api/src/users/users.service.ts`
- Create: `apps/api/src/users/users.controller.ts`
- Create: `apps/api/src/users/users.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create apps/api/src/users/dto/update-role.dto.ts**

```typescript
import { IsEnum } from 'class-validator';
import { Role } from '@ctp1/shared';

export class UpdateRoleDto {
  @IsEnum(Role)
  role: Role;
}
```

- [ ] **Step 2: Create apps/api/src/users/users.service.ts**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@ctp1/shared';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async updateRole(id: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }
}
```

- [ ] **Step 3: Create apps/api/src/users/users.controller.ts**

```typescript
import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@ctp1/shared';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(id, dto.role);
  }
}
```

- [ ] **Step 4: Create apps/api/src/users/users.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 5: Update apps/api/src/app.module.ts — add UsersModule**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule],
})
export class AppModule {}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/users/ apps/api/src/app.module.ts
git commit -m "feat: add users module with list and role update"
```

---

## Task 7: Projects Module

**Files:**
- Create: `apps/api/src/projects/dto/create-project.dto.ts`
- Create: `apps/api/src/projects/dto/update-project.dto.ts`
- Create: `apps/api/src/projects/projects.service.ts`
- Create: `apps/api/src/projects/projects.controller.ts`
- Create: `apps/api/src/projects/projects.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create apps/api/src/projects/dto/create-project.dto.ts**

```typescript
import { IsString, MinLength, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
```

- [ ] **Step 2: Create apps/api/src/projects/dto/update-project.dto.ts**

```typescript
import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateProjectDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
```

- [ ] **Step 3: Create apps/api/src/projects/projects.service.ts**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreateProjectDto) {
    return this.prisma.project.create({ data: dto });
  }

  async update(id: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.project.update({ where: { id }, data: dto });
  }
}
```

- [ ] **Step 4: Create apps/api/src/projects/projects.controller.ts**

```typescript
import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@ctp1/shared';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PM)
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PM)
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }
}
```

- [ ] **Step 5: Create apps/api/src/projects/projects.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
```

- [ ] **Step 6: Update apps/api/src/app.module.ts — add ProjectsModule**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, ProjectsModule],
})
export class AppModule {}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/projects/ apps/api/src/app.module.ts
git commit -m "feat: add projects module with CRUD"
```

---

## Task 8: Builds Module

**Files:**
- Create: `apps/api/src/builds/dto/create-build.dto.ts`
- Create: `apps/api/src/builds/dto/update-build.dto.ts`
- Create: `apps/api/src/builds/builds.service.ts`
- Create: `apps/api/src/builds/builds.controller.ts`
- Create: `apps/api/src/builds/builds.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create apps/api/src/builds/dto/create-build.dto.ts**

```typescript
import { IsString, MinLength, IsUUID, IsInt, Min, Max } from 'class-validator';

export class CreateBuildDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsUUID()
  projectId: string;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2020)
  year: number;
}
```

- [ ] **Step 2: Create apps/api/src/builds/dto/update-build.dto.ts**

```typescript
import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateBuildDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;
}
```

- [ ] **Step 3: Create apps/api/src/builds/builds.service.ts**

```typescript
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
```

- [ ] **Step 4: Create apps/api/src/builds/builds.controller.ts**

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { BuildsService } from './builds.service';
import { CreateBuildDto } from './dto/create-build.dto';
import { UpdateBuildDto } from './dto/update-build.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@ctp1/shared';

@Controller('builds')
@UseGuards(JwtAuthGuard)
export class BuildsController {
  constructor(private buildsService: BuildsService) {}

  @Get()
  findByMonth(
    @Query('projectId') projectId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.buildsService.findByMonth(projectId, +month, +year);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PM)
  create(@Body() dto: CreateBuildDto) {
    return this.buildsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PM)
  update(@Param('id') id: string, @Body() dto: UpdateBuildDto) {
    return this.buildsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PM)
  remove(@Param('id') id: string) {
    return this.buildsService.remove(id);
  }
}
```

- [ ] **Step 5: Create apps/api/src/builds/builds.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { BuildsController } from './builds.controller';
import { BuildsService } from './builds.service';

@Module({
  controllers: [BuildsController],
  providers: [BuildsService],
})
export class BuildsModule {}
```

- [ ] **Step 6: Update apps/api/src/app.module.ts — add BuildsModule**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { BuildsModule } from './builds/builds.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, ProjectsModule, BuildsModule],
})
export class AppModule {}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/builds/ apps/api/src/app.module.ts
git commit -m "feat: add builds module with CRUD and month filter"
```

---

## Task 9: Tasks Module

**Files:**
- Create: `apps/api/src/tasks/dto/create-task.dto.ts`
- Create: `apps/api/src/tasks/dto/update-task.dto.ts`
- Create: `apps/api/src/tasks/tasks.service.ts`
- Create: `apps/api/src/tasks/tasks.controller.ts`
- Create: `apps/api/src/tasks/tasks.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create apps/api/src/tasks/dto/create-task.dto.ts**

```typescript
import { IsString, MinLength, IsOptional, IsEnum, IsUUID, IsInt, Min, Max, IsDateString } from 'class-validator';
import { TaskPriority } from '@ctp1/shared';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsInt()
  @Min(1)
  @Max(4)
  week: number;

  @IsUUID()
  buildId: string;

  @IsUUID()
  assigneeId: string;

  @IsUUID()
  projectId: string;
}
```

- [ ] **Step 2: Create apps/api/src/tasks/dto/update-task.dto.ts**

```typescript
import { IsString, MinLength, IsOptional, IsEnum, IsUUID, IsInt, Min, Max, IsDateString } from 'class-validator';
import { TaskStatus, TaskPriority } from '@ctp1/shared';

export class UpdateTaskDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(1)
  @Max(4)
  @IsOptional()
  week?: number;

  @IsUUID()
  @IsOptional()
  buildId?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;
}
```

- [ ] **Step 3: Create apps/api/src/tasks/tasks.service.ts**

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus, Role } from '@ctp1/shared';

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
      orderBy: [{ week: 'asc' }, { assigneeId: 'asc' }, { startDate: 'asc' }],
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

  async update(id: string, dto: UpdateTaskDto, userId: string, userRole: Role) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');

    if (userRole === Role.MEMBER && task.assigneeId !== userId) {
      throw new ForbiddenException('Members can only update their own tasks');
    }

    if (userRole === Role.MEMBER) {
      const allowed: (keyof UpdateTaskDto)[] = ['status'];
      const keys = Object.keys(dto) as (keyof UpdateTaskDto)[];
      const hasDisallowed = keys.some((k) => !allowed.includes(k));
      if (hasDisallowed) {
        throw new ForbiddenException('Members can only update task status');
      }
    }

    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.status === TaskStatus.DONE) data.completedAt = new Date();
    if (dto.status && dto.status !== TaskStatus.DONE) data.completedAt = null;

    return this.prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, email: true, name: true, role: true, createdAt: true } },
        build: true,
      },
    });
  }

  async remove(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.task.delete({ where: { id } });
  }
}
```

- [ ] **Step 4: Create apps/api/src/tasks/tasks.controller.ts**

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@ctp1/shared';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  findByMonthWeek(
    @Query('projectId') projectId: string,
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('week') week?: string,
  ) {
    return this.tasksService.findByMonthWeek(projectId, +month, +year, week ? +week : undefined);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PM)
  create(@Body() dto: CreateTaskDto, @Request() req: any) {
    return this.tasksService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Request() req: any) {
    return this.tasksService.update(id, dto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.PM)
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
```

- [ ] **Step 5: Create apps/api/src/tasks/tasks.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
```

- [ ] **Step 6: Update apps/api/src/app.module.ts — final version**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { BuildsModule } from './builds/builds.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, ProjectsModule, BuildsModule, TasksModule],
})
export class AppModule {}
```

- [ ] **Step 7: Verify API runs with all modules**

```bash
pnpm dev:api
```

Expected: NestJS starts with all routes mapped.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/tasks/ apps/api/src/app.module.ts
git commit -m "feat: add tasks module with CRUD, role-based access, week/month filter"
```

---

## Task 10: React Frontend Scaffold

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/index.css`

- [ ] **Step 1: Create apps/web/package.json**

```json
{
  "name": "web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@dnd-kit/core": "^6.3.0",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.0",
    "@ctp1/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create apps/web/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create apps/web/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
```

- [ ] **Step 4: Create apps/web/tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 5: Create apps/web/postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create apps/web/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Create apps/web/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CTP1 Task Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create apps/web/src/main.tsx**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 9: Create apps/web/src/App.tsx**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div className="p-8 text-2xl font-bold">CTP1 Task Manager</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 10: Install and verify**

```bash
cd "D:/Work/VNG/ctp1/Agent/Task manager"
pnpm install
pnpm dev:web
```

Expected: Vite dev server at http://localhost:5173, page shows "CTP1 Task Manager".

- [ ] **Step 11: Commit**

```bash
git add apps/web/
git commit -m "feat: scaffold React + Vite + Tailwind frontend"
```

---

## Task 11: Frontend API Client & Auth

**Files:**
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/api/auth.ts`
- Create: `apps/web/src/stores/authStore.ts`
- Create: `apps/web/src/hooks/useAuth.ts`
- Create: `apps/web/src/components/LoginForm.tsx`
- Create: `apps/web/src/components/RegisterForm.tsx`
- Create: `apps/web/src/components/ProtectedRoute.tsx`
- Create: `apps/web/src/components/Layout.tsx`
- Create: `apps/web/src/pages/LoginPage.tsx`
- Create: `apps/web/src/pages/RegisterPage.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Create apps/web/src/api/client.ts**

```typescript
const API_URL = 'http://localhost:3000';

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error ${res.status}`);
  }
  return res.json();
}
```

- [ ] **Step 2: Create apps/web/src/api/auth.ts**

```typescript
import { apiFetch } from './client';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export function login(email: string, password: string) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(email: string, password: string, name: string) {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}
```

- [ ] **Step 3: Create apps/web/src/stores/authStore.ts**

```typescript
import { useSyncExternalStore } from 'react';
import type { UserDto } from '@ctp1/shared';

interface AuthState {
  user: UserDto | null;
  token: string | null;
}

let state: AuthState = {
  user: null,
  token: localStorage.getItem('accessToken'),
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setAuth(token: string, user: UserDto) {
  localStorage.setItem('accessToken', token);
  state = { user, token };
  emit();
}

export function clearAuth() {
  localStorage.removeItem('accessToken');
  state = { user: null, token: null };
  emit();
}

export function useAuthStore() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}
```

- [ ] **Step 4: Create apps/web/src/hooks/useAuth.ts**

```typescript
import { useMutation } from '@tanstack/react-query';
import { login, register } from '../api/auth';
import { setAuth, clearAuth } from '../stores/authStore';

function parseJwt(token: string) {
  const base64 = token.split('.')[1];
  return JSON.parse(atob(base64));
}

export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => login(email, password),
    onSuccess: (data) => {
      const payload = parseJwt(data.accessToken);
      setAuth(data.accessToken, {
        id: payload.sub,
        email: payload.email,
        name: payload.email.split('@')[0],
        role: payload.role,
        createdAt: '',
      });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      register(email, password, name),
    onSuccess: (data) => {
      const payload = parseJwt(data.accessToken);
      setAuth(data.accessToken, {
        id: payload.sub,
        email: payload.email,
        name: payload.email.split('@')[0],
        role: payload.role,
        createdAt: '',
      });
    },
  });
}

export function useLogout() {
  return clearAuth;
}
```

- [ ] **Step 5: Create apps/web/src/components/LoginForm.tsx**

```tsx
import { useState } from 'react';
import { useLogin } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        login.mutate({ email, password });
      }}
      className="flex flex-col gap-4 w-80"
    >
      <h1 className="text-2xl font-bold">Đăng nhập</h1>
      {login.error && <p className="text-red-500 text-sm">{login.error.message}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border rounded px-3 py-2"
        required
      />
      <input
        type="password"
        placeholder="Mật khẩu"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border rounded px-3 py-2"
        required
      />
      <button
        type="submit"
        disabled={login.isPending}
        className="bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700 disabled:opacity-50"
      >
        {login.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
      <Link to="/register" className="text-blue-600 text-sm text-center">
        Chưa có tài khoản? Đăng ký
      </Link>
    </form>
  );
}
```

- [ ] **Step 6: Create apps/web/src/components/RegisterForm.tsx**

```tsx
import { useState } from 'react';
import { useRegister } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const register = useRegister();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        register.mutate({ email, password, name });
      }}
      className="flex flex-col gap-4 w-80"
    >
      <h1 className="text-2xl font-bold">Đăng ký</h1>
      {register.error && <p className="text-red-500 text-sm">{register.error.message}</p>}
      <input
        type="text"
        placeholder="Họ tên"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border rounded px-3 py-2"
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border rounded px-3 py-2"
        required
      />
      <input
        type="password"
        placeholder="Mật khẩu (min 6 ký tự)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border rounded px-3 py-2"
        required
        minLength={6}
      />
      <button
        type="submit"
        disabled={register.isPending}
        className="bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700 disabled:opacity-50"
      >
        {register.isPending ? 'Đang đăng ký...' : 'Đăng ký'}
      </button>
      <Link to="/login" className="text-blue-600 text-sm text-center">
        Đã có tài khoản? Đăng nhập
      </Link>
    </form>
  );
}
```

- [ ] **Step 7: Create apps/web/src/components/ProtectedRoute.tsx**

```tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 8: Create apps/web/src/components/Layout.tsx**

```tsx
import { useAuthStore, clearAuth } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">CTP1 Task Manager</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.name} ({user?.role})</span>
          <button
            onClick={() => {
              clearAuth();
              navigate('/login');
            }}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Đăng xuất
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

- [ ] **Step 9: Create apps/web/src/pages/LoginPage.tsx**

```tsx
import LoginForm from '../components/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoginForm />
    </div>
  );
}
```

- [ ] **Step 10: Create apps/web/src/pages/RegisterPage.tsx**

```tsx
import RegisterForm from '../components/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <RegisterForm />
    </div>
  );
}
```

- [ ] **Step 11: Update apps/web/src/App.tsx**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <div className="p-8">Board sẽ hiển thị ở đây</div>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/
git commit -m "feat: add frontend auth flow with login, register, protected routes"
```

---

## Task 12: Frontend API Clients (Projects, Builds, Tasks, Users)

**Files:**
- Create: `apps/web/src/api/projects.ts`
- Create: `apps/web/src/api/builds.ts`
- Create: `apps/web/src/api/tasks.ts`
- Create: `apps/web/src/api/users.ts`
- Create: `apps/web/src/hooks/useProjects.ts`
- Create: `apps/web/src/hooks/useBuilds.ts`
- Create: `apps/web/src/hooks/useTasks.ts`

- [ ] **Step 1: Create apps/web/src/api/projects.ts**

```typescript
import { apiFetch } from './client';
import type { ProjectDto } from '@ctp1/shared';

export function fetchProjects() {
  return apiFetch<ProjectDto[]>('/projects');
}

export function createProject(data: { name: string; description?: string }) {
  return apiFetch<ProjectDto>('/projects', { method: 'POST', body: JSON.stringify(data) });
}
```

- [ ] **Step 2: Create apps/web/src/api/builds.ts**

```typescript
import { apiFetch } from './client';
import type { BuildDto } from '@ctp1/shared';

export function fetchBuilds(projectId: string, month: number, year: number) {
  return apiFetch<BuildDto[]>(`/builds?projectId=${projectId}&month=${month}&year=${year}`);
}

export function createBuild(data: { name: string; projectId: string; month: number; year: number }) {
  return apiFetch<BuildDto>('/builds', { method: 'POST', body: JSON.stringify(data) });
}

export function updateBuild(id: string, data: { name?: string }) {
  return apiFetch<BuildDto>(`/builds/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteBuild(id: string) {
  return apiFetch<BuildDto>(`/builds/${id}`, { method: 'DELETE' });
}
```

- [ ] **Step 3: Create apps/web/src/api/tasks.ts**

```typescript
import { apiFetch } from './client';
import type { TaskDto } from '@ctp1/shared';

export function fetchTasks(projectId: string, month: number, year: number, week?: number) {
  let url = `/tasks?projectId=${projectId}&month=${month}&year=${year}`;
  if (week) url += `&week=${week}`;
  return apiFetch<TaskDto[]>(url);
}

export function createTask(data: {
  title: string;
  description?: string;
  priority?: string;
  startDate: string;
  endDate: string;
  week: number;
  buildId: string;
  assigneeId: string;
  projectId: string;
}) {
  return apiFetch<TaskDto>('/tasks', { method: 'POST', body: JSON.stringify(data) });
}

export function updateTask(id: string, data: Partial<TaskDto>) {
  return apiFetch<TaskDto>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteTask(id: string) {
  return apiFetch<TaskDto>(`/tasks/${id}`, { method: 'DELETE' });
}
```

- [ ] **Step 4: Create apps/web/src/api/users.ts**

```typescript
import { apiFetch } from './client';
import type { UserDto } from '@ctp1/shared';

export function fetchUsers() {
  return apiFetch<UserDto[]>('/users');
}
```

- [ ] **Step 5: Create apps/web/src/hooks/useProjects.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProjects, createProject } from '../api/projects';

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}
```

- [ ] **Step 6: Create apps/web/src/hooks/useBuilds.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBuilds, createBuild, updateBuild, deleteBuild } from '../api/builds';

export function useBuilds(projectId: string, month: number, year: number) {
  return useQuery({
    queryKey: ['builds', projectId, month, year],
    queryFn: () => fetchBuilds(projectId, month, year),
    enabled: !!projectId,
  });
}

export function useCreateBuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBuild,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['builds'] }),
  });
}

export function useUpdateBuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string }) => updateBuild(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['builds'] }),
  });
}

export function useDeleteBuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteBuild,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['builds'] }),
  });
}
```

- [ ] **Step 7: Create apps/web/src/hooks/useTasks.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTasks, createTask, updateTask, deleteTask } from '../api/tasks';

export function useTasks(projectId: string, month: number, year: number) {
  return useQuery({
    queryKey: ['tasks', projectId, month, year],
    queryFn: () => fetchTasks(projectId, month, year),
    enabled: !!projectId,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, any>) => updateTask(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/api/ apps/web/src/hooks/
git commit -m "feat: add frontend API clients and hooks for projects, builds, tasks, users"
```

---

## Task 13: Project List & Board Page Shell

**Files:**
- Create: `apps/web/src/pages/ProjectListPage.tsx`
- Create: `apps/web/src/pages/ProjectBoardPage.tsx`
- Create: `apps/web/src/components/MonthWeekSelector.tsx`
- Create: `apps/web/src/components/BuildOverview.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Create apps/web/src/components/MonthWeekSelector.tsx**

```tsx
interface Props {
  month: number;
  year: number;
  onChangeMonth: (month: number, year: number) => void;
}

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

export default function MonthWeekSelector({ month, year, onChangeMonth }: Props) {
  const prev = () => {
    if (month === 1) onChangeMonth(12, year - 1);
    else onChangeMonth(month - 1, year);
  };
  const next = () => {
    if (month === 12) onChangeMonth(1, year + 1);
    else onChangeMonth(month + 1, year);
  };

  return (
    <div className="flex items-center gap-4">
      <button onClick={prev} className="px-2 py-1 rounded hover:bg-gray-200">&#9664;</button>
      <span className="font-semibold text-lg">{MONTH_NAMES[month - 1]} {year}</span>
      <button onClick={next} className="px-2 py-1 rounded hover:bg-gray-200">&#9654;</button>
    </div>
  );
}
```

- [ ] **Step 2: Create apps/web/src/components/BuildOverview.tsx**

```tsx
import type { BuildDto } from '@ctp1/shared';

interface Props {
  builds: BuildDto[];
  onAddBuild: () => void;
}

export default function BuildOverview({ builds, onAddBuild }: Props) {
  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-gray-700">Builds tháng này</h2>
        <button onClick={onAddBuild} className="text-sm text-blue-600 hover:text-blue-800">
          + Thêm Build
        </button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {builds.map((b) => (
          <span key={b.id} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            {b.name}
          </span>
        ))}
        {builds.length === 0 && <span className="text-sm text-gray-400">Chưa có build nào</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create apps/web/src/pages/ProjectListPage.tsx**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects, useCreateProject } from '../hooks/useProjects';

export default function ProjectListPage() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(false);

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New Project
        </button>
      </div>
      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createProject.mutate({ name }, { onSuccess: () => { setShowForm(false); setName(''); } });
          }}
          className="flex gap-2 mb-4"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên project"
            className="border rounded px-3 py-2 flex-1"
            required
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Tạo</button>
          <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2">Hủy</button>
        </form>
      )}
      <div className="space-y-2">
        {projects?.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/projects/${p.id}`)}
            className="bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <h2 className="font-semibold">{p.name}</h2>
            {p.description && <p className="text-sm text-gray-500">{p.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create apps/web/src/pages/ProjectBoardPage.tsx**

```tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MonthWeekSelector from '../components/MonthWeekSelector';
import BuildOverview from '../components/BuildOverview';
import { useBuilds } from '../hooks/useBuilds';
import { useTasks } from '../hooks/useTasks';
import type { TaskDto, UserDto } from '@ctp1/shared';

function groupTasksByWeekAndMember(tasks: TaskDto[]): Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>> {
  const weekMap = new Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>>();
  for (const task of tasks) {
    if (!weekMap.has(task.week)) weekMap.set(task.week, new Map());
    const memberMap = weekMap.get(task.week)!;
    if (!memberMap.has(task.assigneeId)) {
      memberMap.set(task.assigneeId, { user: task.assignee!, tasks: [] });
    }
    memberMap.get(task.assigneeId)!.tasks.push(task);
  }
  return weekMap;
}

export default function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: builds = [] } = useBuilds(projectId!, month, year);
  const { data: tasks = [] } = useTasks(projectId!, month, year);

  const grouped = groupTasksByWeekAndMember(tasks);

  return (
    <div className="p-6">
      <MonthWeekSelector month={month} year={year} onChangeMonth={(m, y) => { setMonth(m); setYear(y); }} />
      <div className="mt-4">
        <BuildOverview builds={builds} onAddBuild={() => {/* TODO: modal */}} />
      </div>
      <div className="mt-4">
        {/* Tree Table + Gantt will go here - Task 14 & 15 */}
        <div className="bg-white border rounded-lg p-4">
          {[1, 2, 3, 4].map((week) => {
            const members = grouped.get(week);
            if (!members || members.size === 0) return null;
            return (
              <div key={week} className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Tuần {week}</h3>
                {Array.from(members.values()).map(({ user, tasks: memberTasks }) => (
                  <div key={user.id} className="ml-4 mb-2">
                    <h4 className="font-medium text-gray-600">{user.name}</h4>
                    {memberTasks.map((t) => (
                      <div key={t.id} className="ml-4 text-sm text-gray-500">
                        {t.title} — {t.status}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update apps/web/src/App.tsx — add routes**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProjectListPage from './pages/ProjectListPage';
import ProjectBoardPage from './pages/ProjectBoardPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<ProjectListPage />} />
                <Route path="/projects/:projectId" element={<ProjectBoardPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/
git commit -m "feat: add project list, board page with month selector and build overview"
```

---

## Task 14: Tree Table Component

**Files:**
- Create: `apps/web/src/components/TreeTable.tsx`
- Create: `apps/web/src/components/TreeRow.tsx`
- Modify: `apps/web/src/pages/ProjectBoardPage.tsx`

- [ ] **Step 1: Create apps/web/src/components/TreeRow.tsx**

```tsx
import { useState } from 'react';
import type { TaskDto, UserDto } from '@ctp1/shared';

const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-gray-200 text-gray-700',
  IN_PROGRESS: 'bg-blue-200 text-blue-700',
  DONE: 'bg-green-200 text-green-700',
};

const STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

interface WeekRowProps {
  week: number;
  members: Map<string, { user: UserDto; tasks: TaskDto[] }>;
}

export function WeekRow({ week, members }: WeekRowProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <>
      <tr
        className="bg-gray-100 cursor-pointer hover:bg-gray-200"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-2 font-semibold" colSpan={5}>
          <span className="mr-2">{expanded ? '▼' : '▶'}</span>
          Tuần {week}
        </td>
      </tr>
      {expanded &&
        Array.from(members.values()).map(({ user, tasks }) => (
          <MemberRow key={user.id} user={user} tasks={tasks} />
        ))}
    </>
  );
}

function MemberRow({ user, tasks }: { user: UserDto; tasks: TaskDto[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-2 pl-10 font-medium" colSpan={5}>
          <span className="mr-2">{expanded ? '▼' : '▶'}</span>
          {user.name}
        </td>
      </tr>
      {expanded &&
        tasks.map((task) => (
          <tr key={task.id} className="hover:bg-blue-50">
            <td className="px-4 py-1.5 pl-16 text-sm">{task.title}</td>
            <td className="px-4 py-1.5 text-sm text-gray-500">{formatDate(task.startDate)}</td>
            <td className="px-4 py-1.5 text-sm text-gray-500">{formatDate(task.endDate)}</td>
            <td className="px-4 py-1.5 text-sm text-gray-500">{user.name}</td>
            <td className="px-4 py-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status]}`}>
                {STATUS_LABELS[task.status]}
              </span>
            </td>
          </tr>
        ))}
    </>
  );
}
```

- [ ] **Step 2: Create apps/web/src/components/TreeTable.tsx**

```tsx
import type { TaskDto, UserDto } from '@ctp1/shared';
import { WeekRow } from './TreeRow';

interface Props {
  grouped: Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>>;
}

export default function TreeTable({ grouped }: Props) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b text-sm text-gray-500">
            <th className="px-4 py-2 font-medium">Summary</th>
            <th className="px-4 py-2 font-medium w-28">Start Date</th>
            <th className="px-4 py-2 font-medium w-28">End Date</th>
            <th className="px-4 py-2 font-medium w-32">Assignee</th>
            <th className="px-4 py-2 font-medium w-28">Status</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4].map((week) => {
            const members = grouped.get(week);
            if (!members || members.size === 0) return null;
            return <WeekRow key={week} week={week} members={members} />;
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Update apps/web/src/pages/ProjectBoardPage.tsx — replace inline tree with TreeTable**

Replace the `<div className="bg-white border rounded-lg p-4">` block with:

```tsx
import TreeTable from '../components/TreeTable';

// In the JSX, replace the tree rendering with:
<TreeTable grouped={grouped} />
```

Full updated file:

```tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import MonthWeekSelector from '../components/MonthWeekSelector';
import BuildOverview from '../components/BuildOverview';
import TreeTable from '../components/TreeTable';
import { useBuilds } from '../hooks/useBuilds';
import { useTasks } from '../hooks/useTasks';
import type { TaskDto, UserDto } from '@ctp1/shared';

function groupTasksByWeekAndMember(tasks: TaskDto[]): Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>> {
  const weekMap = new Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>>();
  for (const task of tasks) {
    if (!weekMap.has(task.week)) weekMap.set(task.week, new Map());
    const memberMap = weekMap.get(task.week)!;
    if (!memberMap.has(task.assigneeId)) {
      memberMap.set(task.assigneeId, { user: task.assignee!, tasks: [] });
    }
    memberMap.get(task.assigneeId)!.tasks.push(task);
  }
  return weekMap;
}

export default function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: builds = [] } = useBuilds(projectId!, month, year);
  const { data: tasks = [] } = useTasks(projectId!, month, year);

  const grouped = groupTasksByWeekAndMember(tasks);

  return (
    <div className="p-6">
      <MonthWeekSelector month={month} year={year} onChangeMonth={(m, y) => { setMonth(m); setYear(y); }} />
      <div className="mt-4">
        <BuildOverview builds={builds} onAddBuild={() => {}} />
      </div>
      <div className="mt-4 bg-white border rounded-lg">
        <TreeTable grouped={grouped} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/TreeTable.tsx apps/web/src/components/TreeRow.tsx apps/web/src/pages/ProjectBoardPage.tsx
git commit -m "feat: add tree table component with week/member/task hierarchy"
```

---

## Task 15: Gantt Chart Component

**Files:**
- Create: `apps/web/src/components/GanttChart.tsx`
- Create: `apps/web/src/components/GanttBar.tsx`
- Modify: `apps/web/src/pages/ProjectBoardPage.tsx`

- [ ] **Step 1: Create apps/web/src/components/GanttBar.tsx**

```tsx
import { useState, useRef } from 'react';

const STATUS_COLORS: Record<string, string> = {
  TODO: '#9CA3AF',
  IN_PROGRESS: '#3B82F6',
  DONE: '#22C55E',
};

interface Props {
  taskId: string;
  title: string;
  status: string;
  startDate: Date;
  endDate: Date;
  dayWidth: number;
  timelineStart: Date;
  onDateChange: (taskId: string, startDate: Date, endDate: Date) => void;
}

function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export default function GanttBar({ taskId, title, status, startDate, endDate, dayWidth, timelineStart, onDateChange }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'move' | 'left' | 'right' | null>(null);
  const dragStartX = useRef(0);
  const origStart = useRef(startDate);
  const origEnd = useRef(endDate);

  const left = diffDays(timelineStart, startDate) * dayWidth;
  const width = Math.max((diffDays(startDate, endDate) + 1) * dayWidth, dayWidth);

  const handleMouseDown = (type: 'move' | 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(type);
    dragStartX.current = e.clientX;
    origStart.current = startDate;
    origEnd.current = endDate;

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStartX.current;
      const daysDelta = Math.round(dx / dayWidth);
      if (daysDelta === 0) return;

      let newStart = origStart.current;
      let newEnd = origEnd.current;

      if (type === 'move') {
        newStart = new Date(origStart.current.getTime() + daysDelta * 86400000);
        newEnd = new Date(origEnd.current.getTime() + daysDelta * 86400000);
      } else if (type === 'left') {
        newStart = new Date(origStart.current.getTime() + daysDelta * 86400000);
        if (newStart >= origEnd.current) return;
      } else if (type === 'right') {
        newEnd = new Date(origEnd.current.getTime() + daysDelta * 86400000);
        if (newEnd <= origStart.current) return;
      }

      onDateChange(taskId, newStart, newEnd);
    };

    const handleMouseUp = () => {
      setDragging(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={barRef}
      className="absolute h-6 rounded flex items-center cursor-grab group"
      style={{
        left: `${left}px`,
        width: `${width}px`,
        backgroundColor: STATUS_COLORS[status] || '#9CA3AF',
        top: '50%',
        transform: 'translateY(-50%)',
        opacity: dragging ? 0.7 : 1,
      }}
      onMouseDown={handleMouseDown('move')}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-black/20 rounded-l"
        onMouseDown={handleMouseDown('left')}
      />
      {/* Title */}
      <span className="text-xs text-white px-2 truncate select-none pointer-events-none">
        {title}
      </span>
      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-black/20 rounded-r"
        onMouseDown={handleMouseDown('right')}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create apps/web/src/components/GanttChart.tsx**

```tsx
import type { TaskDto, UserDto } from '@ctp1/shared';
import GanttBar from './GanttBar';

interface Props {
  grouped: Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>>;
  month: number;
  year: number;
  expandedWeeks: Set<number>;
  expandedMembers: Set<string>;
  onDateChange: (taskId: string, startDate: Date, endDate: Date) => void;
}

const DAY_WIDTH = 40;
const ROW_HEIGHT = 36;

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

export default function GanttChart({ grouped, month, year, expandedWeeks, expandedMembers, onDateChange }: Props) {
  const daysInMonth = getDaysInMonth(month, year);
  const timelineStart = new Date(year, month - 1, 1);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Build row list matching tree table order
  const rows: { type: 'week' | 'member' | 'task'; task?: TaskDto }[] = [];
  for (const week of [1, 2, 3, 4]) {
    const members = grouped.get(week);
    if (!members || members.size === 0) continue;
    rows.push({ type: 'week' });
    if (!expandedWeeks.has(week)) continue;
    for (const { user, tasks } of members.values()) {
      rows.push({ type: 'member' });
      if (!expandedMembers.has(`${week}-${user.id}`)) continue;
      for (const task of tasks) {
        rows.push({ type: 'task', task });
      }
    }
  }

  return (
    <div className="overflow-x-auto border-l">
      {/* Header: day numbers */}
      <div className="flex border-b bg-gray-50 sticky top-0" style={{ minWidth: daysInMonth * DAY_WIDTH }}>
        {days.map((d) => (
          <div
            key={d}
            className="text-center text-xs text-gray-500 border-r"
            style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
          >
            {d}
          </div>
        ))}
      </div>
      {/* Rows */}
      <div style={{ minWidth: daysInMonth * DAY_WIDTH }}>
        {rows.map((row, i) => (
          <div
            key={i}
            className="relative border-b"
            style={{ height: ROW_HEIGHT }}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 flex">
              {days.map((d) => (
                <div key={d} className="border-r h-full" style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }} />
              ))}
            </div>
            {/* Gantt bar for task rows */}
            {row.type === 'task' && row.task && (
              <GanttBar
                taskId={row.task.id}
                title={row.task.title}
                status={row.task.status}
                startDate={new Date(row.task.startDate)}
                endDate={new Date(row.task.endDate)}
                dayWidth={DAY_WIDTH}
                timelineStart={timelineStart}
                onDateChange={onDateChange}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update apps/web/src/pages/ProjectBoardPage.tsx — add Gantt side by side with TreeTable**

```tsx
import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import MonthWeekSelector from '../components/MonthWeekSelector';
import BuildOverview from '../components/BuildOverview';
import TreeTable from '../components/TreeTable';
import GanttChart from '../components/GanttChart';
import { useBuilds } from '../hooks/useBuilds';
import { useTasks, useUpdateTask } from '../hooks/useTasks';
import type { TaskDto, UserDto } from '@ctp1/shared';

function groupTasksByWeekAndMember(tasks: TaskDto[]): Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>> {
  const weekMap = new Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>>();
  for (const task of tasks) {
    if (!weekMap.has(task.week)) weekMap.set(task.week, new Map());
    const memberMap = weekMap.get(task.week)!;
    if (!memberMap.has(task.assigneeId)) {
      memberMap.set(task.assigneeId, { user: task.assignee!, tasks: [] });
    }
    memberMap.get(task.assigneeId)!.tasks.push(task);
  }
  return weekMap;
}

export default function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: builds = [] } = useBuilds(projectId!, month, year);
  const { data: tasks = [] } = useTasks(projectId!, month, year);
  const updateTask = useUpdateTask();

  const grouped = useMemo(() => groupTasksByWeekAndMember(tasks), [tasks]);

  // Track expand/collapse state — shared between TreeTable and GanttChart
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1, 2, 3, 4]));
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  // Initialize expanded members when tasks load
  useMemo(() => {
    const memberKeys = new Set<string>();
    grouped.forEach((members, week) => {
      members.forEach((_, userId) => memberKeys.add(`${week}-${userId}`));
    });
    setExpandedMembers(memberKeys);
  }, [tasks]);

  const toggleWeek = (week: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  };

  const toggleMember = (key: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDateChange = (taskId: string, startDate: Date, endDate: Date) => {
    updateTask.mutate({
      id: taskId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  };

  return (
    <div className="p-6">
      <MonthWeekSelector month={month} year={year} onChangeMonth={(m, y) => { setMonth(m); setYear(y); }} />
      <div className="mt-4">
        <BuildOverview builds={builds} onAddBuild={() => {}} />
      </div>
      <div className="mt-4 bg-white border rounded-lg flex overflow-hidden">
        <div className="w-1/2 min-w-[500px] overflow-auto border-r">
          <TreeTable
            grouped={grouped}
            expandedWeeks={expandedWeeks}
            expandedMembers={expandedMembers}
            onToggleWeek={toggleWeek}
            onToggleMember={toggleMember}
          />
        </div>
        <div className="flex-1 overflow-auto">
          <GanttChart
            grouped={grouped}
            month={month}
            year={year}
            expandedWeeks={expandedWeeks}
            expandedMembers={expandedMembers}
            onDateChange={handleDateChange}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update apps/web/src/components/TreeTable.tsx — accept expand/collapse props**

```tsx
import type { TaskDto, UserDto } from '@ctp1/shared';
import { WeekRow } from './TreeRow';

interface Props {
  grouped: Map<number, Map<string, { user: UserDto; tasks: TaskDto[] }>>;
  expandedWeeks: Set<number>;
  expandedMembers: Set<string>;
  onToggleWeek: (week: number) => void;
  onToggleMember: (key: string) => void;
}

export default function TreeTable({ grouped, expandedWeeks, expandedMembers, onToggleWeek, onToggleMember }: Props) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b text-sm text-gray-500 bg-gray-50 sticky top-0">
            <th className="px-4 py-2 font-medium">Summary</th>
            <th className="px-4 py-2 font-medium w-28">Start Date</th>
            <th className="px-4 py-2 font-medium w-28">End Date</th>
            <th className="px-4 py-2 font-medium w-32">Assignee</th>
            <th className="px-4 py-2 font-medium w-28">Status</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4].map((week) => {
            const members = grouped.get(week);
            if (!members || members.size === 0) return null;
            return (
              <WeekRow
                key={week}
                week={week}
                members={members}
                expanded={expandedWeeks.has(week)}
                expandedMembers={expandedMembers}
                onToggleWeek={() => onToggleWeek(week)}
                onToggleMember={onToggleMember}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Update apps/web/src/components/TreeRow.tsx — use props for expand state**

```tsx
import type { TaskDto, UserDto } from '@ctp1/shared';

const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-gray-200 text-gray-700',
  IN_PROGRESS: 'bg-blue-200 text-blue-700',
  DONE: 'bg-green-200 text-green-700',
};

const STATUS_LABELS: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

interface WeekRowProps {
  week: number;
  members: Map<string, { user: UserDto; tasks: TaskDto[] }>;
  expanded: boolean;
  expandedMembers: Set<string>;
  onToggleWeek: () => void;
  onToggleMember: (key: string) => void;
}

export function WeekRow({ week, members, expanded, expandedMembers, onToggleWeek, onToggleMember }: WeekRowProps) {
  return (
    <>
      <tr className="bg-gray-100 cursor-pointer hover:bg-gray-200" onClick={onToggleWeek}>
        <td className="px-4 py-2 font-semibold" colSpan={5}>
          <span className="mr-2">{expanded ? '▼' : '▶'}</span>
          Tuần {week}
        </td>
      </tr>
      {expanded &&
        Array.from(members.entries()).map(([userId, { user, tasks }]) => {
          const memberKey = `${week}-${userId}`;
          const memberExpanded = expandedMembers.has(memberKey);
          return (
            <MemberRow
              key={userId}
              user={user}
              tasks={tasks}
              expanded={memberExpanded}
              onToggle={() => onToggleMember(memberKey)}
            />
          );
        })}
    </>
  );
}

function MemberRow({ user, tasks, expanded, onToggle }: { user: UserDto; tasks: TaskDto[]; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className="cursor-pointer hover:bg-gray-50" onClick={onToggle}>
        <td className="px-4 py-2 pl-10 font-medium" colSpan={5}>
          <span className="mr-2">{expanded ? '▼' : '▶'}</span>
          {user.name}
        </td>
      </tr>
      {expanded &&
        tasks.map((task) => (
          <tr key={task.id} className="hover:bg-blue-50">
            <td className="px-4 py-1.5 pl-16 text-sm">{task.title}</td>
            <td className="px-4 py-1.5 text-sm text-gray-500">{formatDate(task.startDate)}</td>
            <td className="px-4 py-1.5 text-sm text-gray-500">{formatDate(task.endDate)}</td>
            <td className="px-4 py-1.5 text-sm text-gray-500">{user.name}</td>
            <td className="px-4 py-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status]}`}>
                {STATUS_LABELS[task.status]}
              </span>
            </td>
          </tr>
        ))}
    </>
  );
}
```

- [ ] **Step 6: Verify both panels render**

```bash
pnpm dev:web
```

Expected: Tree table on left, Gantt chart with day columns on right. Expand/collapse synced.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/GanttChart.tsx apps/web/src/components/GanttBar.tsx apps/web/src/components/TreeTable.tsx apps/web/src/components/TreeRow.tsx apps/web/src/pages/ProjectBoardPage.tsx
git commit -m "feat: add Gantt chart with drag-to-resize, synced with tree table expand/collapse"
```

---

## Task 16: Task Create/Edit Form

**Files:**
- Create: `apps/web/src/components/TaskForm.tsx`
- Modify: `apps/web/src/pages/ProjectBoardPage.tsx`

- [ ] **Step 1: Create apps/web/src/components/TaskForm.tsx**

```tsx
import { useState } from 'react';
import type { TaskDto, UserDto, BuildDto } from '@ctp1/shared';
import { TaskPriority } from '@ctp1/shared';

interface Props {
  task?: TaskDto;
  users: UserDto[];
  builds: BuildDto[];
  projectId: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function TaskForm({ task, users, builds, projectId, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState(task?.priority ?? TaskPriority.MEDIUM);
  const [startDate, setStartDate] = useState(task?.startDate?.slice(0, 10) ?? '');
  const [endDate, setEndDate] = useState(task?.endDate?.slice(0, 10) ?? '');
  const [week, setWeek] = useState(task?.week ?? 1);
  const [buildId, setBuildId] = useState(task?.buildId ?? '');
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '');

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            ...(task ? { id: task.id } : {}),
            title,
            description: description || undefined,
            priority,
            startDate,
            endDate,
            week,
            buildId,
            assigneeId,
            projectId,
          });
        }}
        className="bg-white rounded-lg p-6 w-[480px] max-h-[90vh] overflow-y-auto shadow-xl"
      >
        <h2 className="text-lg font-bold mb-4">{task ? 'Sửa Task' : 'Tạo Task'}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên task</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-3 py-2" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded px-3 py-2" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tuần</label>
              <select value={week} onChange={(e) => setWeek(+e.target.value)} className="w-full border rounded px-3 py-2">
                <option value={1}>Tuần 1</option>
                <option value={2}>Tuần 2</option>
                <option value={3}>Tuần 3</option>
                <option value={4}>Tuần 4</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="w-full border rounded px-3 py-2">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Build</label>
            <select value={buildId} onChange={(e) => setBuildId(e.target.value)} className="w-full border rounded px-3 py-2" required>
              <option value="">Chọn build</option>
              {builds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="w-full border rounded px-3 py-2" required>
              <option value="">Chọn member</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded border hover:bg-gray-50">Hủy</button>
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            {task ? 'Cập nhật' : 'Tạo'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Update ProjectBoardPage.tsx — add task create button and form**

Add to the existing imports and component:

```tsx
// Add imports
import TaskForm from '../components/TaskForm';
import { useCreateTask, useUpdateTask } from '../hooks/useTasks';
import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../api/users';

// Inside component, add:
const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
const createTask = useCreateTask();
const [showTaskForm, setShowTaskForm] = useState(false);

// Add button in JSX before the tree table:
<div className="flex justify-end mb-2">
  <button onClick={() => setShowTaskForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
    + Thêm Task
  </button>
</div>

// Add form modal:
{showTaskForm && (
  <TaskForm
    users={users}
    builds={builds}
    projectId={projectId!}
    onSubmit={(data) => {
      createTask.mutate(data, { onSuccess: () => setShowTaskForm(false) });
    }}
    onCancel={() => setShowTaskForm(false)}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/TaskForm.tsx apps/web/src/pages/ProjectBoardPage.tsx
git commit -m "feat: add task create/edit form modal"
```

---

## Task 17: Final Integration & Seed Data

**Files:**
- Create: `apps/api/prisma/seed.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Create apps/api/prisma/seed.ts**

```typescript
import { PrismaClient, Role, TaskStatus, TaskPriority } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create users
  const hash = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ctp1.vn' },
    update: {},
    create: { email: 'admin@ctp1.vn', password: hash, name: 'Admin', role: Role.ADMIN },
  });

  const pm = await prisma.user.upsert({
    where: { email: 'pm@ctp1.vn' },
    update: {},
    create: { email: 'pm@ctp1.vn', password: hash, name: 'Hùng PM', role: Role.PM },
  });

  const thai = await prisma.user.upsert({
    where: { email: 'thai@ctp1.vn' },
    update: {},
    create: { email: 'thai@ctp1.vn', password: hash, name: 'A Thái', role: Role.MEMBER },
  });

  const vu = await prisma.user.upsert({
    where: { email: 'vu@ctp1.vn' },
    update: {},
    create: { email: 'vu@ctp1.vn', password: hash, name: 'Vũ', role: Role.MEMBER },
  });

  const long = await prisma.user.upsert({
    where: { email: 'long@ctp1.vn' },
    update: {},
    create: { email: 'long@ctp1.vn', password: hash, name: 'Long', role: Role.MEMBER },
  });

  // Create project
  const project = await prisma.project.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000001', name: 'CTP1', description: 'Dự án CTP1' },
  });

  // Create builds
  const buildA = await prisma.build.create({
    data: { name: 'New VIP Client', projectId: project.id, month: 4, year: 2026 },
  });

  const buildB = await prisma.build.create({
    data: { name: 'Config Event', projectId: project.id, month: 4, year: 2026 },
  });

  // Create tasks for week 2
  await prisma.task.createMany({
    data: [
      {
        title: 'Sendout design tuning 1stpay thẻ S',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        startDate: new Date('2026-04-06'),
        endDate: new Date('2026-04-07'),
        week: 2,
        buildId: buildA.id,
        assigneeId: thai.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'Journey 7 ngày: kích repay sau khi trả 1stpay',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        startDate: new Date('2026-04-08'),
        endDate: new Date('2026-04-10'),
        week: 2,
        buildId: buildA.id,
        assigneeId: thai.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'Logic sv new vip',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        startDate: new Date('2026-04-07'),
        endDate: new Date('2026-04-10'),
        week: 2,
        buildId: buildA.id,
        assigneeId: vu.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'Config event tuần 3/4',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        startDate: new Date('2026-04-08'),
        endDate: new Date('2026-04-08'),
        week: 2,
        buildId: buildB.id,
        assigneeId: vu.id,
        createdById: pm.id,
        projectId: project.id,
      },
      {
        title: 'Config event ctp2',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        startDate: new Date('2026-04-08'),
        endDate: new Date('2026-04-08'),
        week: 2,
        buildId: buildB.id,
        assigneeId: long.id,
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
```

- [ ] **Step 2: Update apps/api/package.json — add seed script**

Add to the `"prisma"` section (or create it):

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

- [ ] **Step 3: Run seed**

```bash
cd apps/api
npx prisma db seed
```

Expected: "Seed completed!"

- [ ] **Step 4: Start both servers and verify end-to-end**

```bash
# Terminal 1
pnpm dev:api

# Terminal 2
pnpm dev:web
```

Expected: Login with `pm@ctp1.vn` / `123456`, see project list, click CTP1, see tree table with tasks grouped by week/member, Gantt chart on the right.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/seed.ts apps/api/package.json
git commit -m "feat: add seed data with sample users, builds, and tasks"
```
