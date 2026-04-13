# CTP1 Task Manager — Design Spec

## Overview

Web application quản lý task cho dự án CTP1 (VNG). Hỗ trợ team theo dõi công việc theo cấu trúc Tháng → Tuần → Member → Task, với Gantt chart để quản lý timeline trực quan.

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript
- **Backend**: NestJS + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: Passport + JWT
- **Monorepo**: pnpm workspace

### Project Structure

```
task-manager/
├── apps/
│   ├── web/              # React + Vite (SPA)
│   └── api/              # NestJS REST API
├── packages/
│   └── shared/           # Shared types, constants
├── pnpm-workspace.yaml
└── package.json
```

## Data Model

### Users

| Field      | Type     | Note                        |
|------------|----------|-----------------------------|
| id         | UUID     | PK                          |
| email      | String   | Unique                      |
| password   | String   | Hashed (bcrypt)             |
| name       | String   |                             |
| role       | Enum     | ADMIN / PM / MEMBER         |
| createdAt  | DateTime |                             |

### Projects

| Field       | Type     | Note |
|-------------|----------|------|
| id          | UUID     | PK   |
| name        | String   |      |
| description | String?  |      |
| createdAt   | DateTime |      |

### Builds

| Field     | Type     | Note              |
|-----------|----------|-------------------|
| id        | UUID     | PK                |
| name      | String   | VD: "Build A"     |
| projectId | UUID     | FK → Projects     |
| month     | Int      | Tháng (1-12)      |
| year      | Int      | Năm               |
| createdAt | DateTime |                   |

### Tasks

| Field       | Type     | Note                             |
|-------------|----------|----------------------------------|
| id          | UUID     | PK                               |
| title       | String   |                                  |
| description | String?  |                                  |
| status      | Enum     | TODO / IN_PROGRESS / DONE        |
| priority    | Enum     | LOW / MEDIUM / HIGH              |
| startDate   | DateTime |                                  |
| endDate     | DateTime |                                  |
| completedAt | DateTime?| Set khi status = DONE            |
| week        | Int      | Tuần trong tháng (1-4)           |
| buildId     | UUID     | FK → Builds                      |
| assigneeId  | UUID     | FK → Users                       |
| createdById | UUID     | FK → Users                       |
| projectId   | UUID     | FK → Projects                    |
| createdAt   | DateTime |                                  |
| updatedAt   | DateTime |                                  |

## Authentication & Authorization

- Đăng ký / đăng nhập bằng email + password
- JWT access token + refresh token
- 3 roles: ADMIN, PM, MEMBER
- **Tất cả roles cùng nhìn 1 view** — không phân biệt UI theo role
- Phân quyền:
  - **Admin**: quản lý users, projects, builds, tất cả task
  - **PM**: tạo/sửa/xóa task, assign members, quản lý builds
  - **Member**: cập nhật trạng thái task được assign cho mình

## Main View — Tree Table + Gantt Chart

### Layout

```
┌──────────────────────────────────┬──────────────────────────────────┐
│  Tree Table (bên trái)           │  Gantt Chart (bên phải)          │
│  - Expand/collapse 3 cấp        │  - Timeline theo ngày            │
│  - Tuần → Member → Task         │  - Kéo thả thanh để đổi date    │
│                                  │  - Resize 2 đầu để đổi duration │
└──────────────────────────────────┴──────────────────────────────────┘
```

### Tree Table (bên trái)

Cấu trúc 3 cấp, expand/collapse:

```
▼ Tuần 2 (06/Apr - 10/Apr)
  ▼ A Thái
    ● Sendout design tuning      06/Apr  07/Apr  Thái.Pha   ● Done
    ● Journey 7 ngày             08/Apr  10/Apr  Thái.Pha   ● In Progress
  ▼ Vũ
    ● Logic sv new vip           07/Apr  10/Apr  Vũ.Nguyễn  ● In Progress
    ● Config event tuần 3/4      08/Apr  08/Apr  Vũ.Nguyễn  ● To Do
  ▶ Long (collapsed)
  ▶ Tiến (collapsed)
▶ Tuần 3 (collapsed)
```

Columns: Summary (task name), Start Date, End Date, Assignee, Status

### Gantt Chart (bên phải)

- Mỗi task là 1 thanh ngang, vị trí/độ dài tương ứng start date → end date
- Thanh member/tuần bao trùm các task con
- **Kéo thả** toàn bộ thanh để dời timeline
- **Kéo 2 đầu** thanh để resize (đổi start hoặc end date)
- Sync real-time với tree table bên trái

### Overview (trên đầu tháng)

Hiển thị danh sách các build của tháng hiện tại để biết tổng quan tháng này cần delivery gì.

## Frontend Libraries

| Library        | Purpose                    |
|----------------|----------------------------|
| React Router   | SPA routing                |
| TanStack Query | Data fetching / caching    |
| dnd-kit        | Drag & drop (Gantt bars)   |
| Tailwind CSS   | Styling                    |

## API Endpoints (REST)

### Auth
- `POST /auth/register` — Đăng ký
- `POST /auth/login` — Đăng nhập
- `POST /auth/refresh` — Refresh token

### Users
- `GET /users` — List users
- `PATCH /users/:id/role` — Update role (Admin only)

### Projects
- `GET /projects` — List projects
- `POST /projects` — Create project
- `PATCH /projects/:id` — Update project

### Builds
- `GET /builds?projectId=&month=&year=` — List builds theo tháng
- `POST /builds` — Create build
- `PATCH /builds/:id` — Update build
- `DELETE /builds/:id` — Delete build

### Tasks
- `GET /tasks?projectId=&week=&month=&year=` — List tasks (filter theo tuần/tháng)
- `POST /tasks` — Create task
- `PATCH /tasks/:id` — Update task (title, status, dates, assignee...)
- `DELETE /tasks/:id` — Delete task

## Scope V1

**Included:**
- Authentication (email/password, JWT)
- User management (3 roles)
- Project & Build management
- Task CRUD với tree table view
- Gantt chart với drag & drop timeline
- Filter theo tháng/tuần

**Excluded (phase sau):**
- Dashboard & báo cáo thống kê
- Comment/discussion trên task
- Notification
- File attachment
