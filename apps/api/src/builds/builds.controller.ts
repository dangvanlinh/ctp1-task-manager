import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { BuildsService } from './builds.service';
import { CreateBuildDto } from './dto/create-build.dto';
import { UpdateBuildDto } from './dto/update-build.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

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
  @Roles('ADMIN', 'PM')
  create(@Body() dto: CreateBuildDto) {
    return this.buildsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'PM')
  update(@Param('id') id: string, @Body() dto: UpdateBuildDto) {
    return this.buildsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'PM')
  remove(@Param('id') id: string) {
    return this.buildsService.remove(id);
  }
}
