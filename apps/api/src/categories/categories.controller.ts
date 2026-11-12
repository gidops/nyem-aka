import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto.js';
import { CategoriesService } from './categories.service.js';

@ApiTags('categories')
@ApiCookieAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  // No @Roles: any signed-in user needs the list to fill in the request form.
  @Get()
  @ApiOperation({ summary: 'List categories (inactive ones only for admins)' })
  list(@CurrentUser() actor: AuthUser) {
    return this.categories.list(actor);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a category' })
  create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.categories.create(dto, actor, ip);
  }

  // ParseIntPipe turns the ":id" text into a number, or answers 400 if it is not one.
  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Rename, describe, activate or deactivate a category' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.categories.update(id, dto, actor, ip);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a category that no request uses' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.categories.remove(id, actor, ip);
  }
}
