import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

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
  @Roles('ADMIN', 'PM')
  create(@Body() dto: CreateTaskDto, @Request() req: any) {
    return this.tasksService.create(dto, req.user.id);
  }

  @Patch('reorder')
  reorder(@Body() body: { items: { id: string; order: number }[] }) {
    return this.tasksService.reorder(body.items);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Request() req: any) {
    return this.tasksService.update(id, dto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'PM')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
