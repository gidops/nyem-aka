import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  ChangeRoleDto,
  ChangeStatusDto,
  CreateUserDto,
  ListUsersQueryDto,
  UpdateUserDto,
} from './dto/users.dto.js';
import { UsersService } from './users.service.js';

// @Roles on the class applies to every route in it: user management is admin-only.
@ApiTags('users')
@ApiCookieAuth()
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with search, filters and pagination' })
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a user with any role' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.users.create(dto, actor, ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update name or department' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.users.update(id, dto, actor, ip);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Change a user’s role' })
  changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.users.changeRole(id, dto.role, actor, ip);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  setStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.users.setStatus(id, dto.isActive, actor, ip);
  }
}
