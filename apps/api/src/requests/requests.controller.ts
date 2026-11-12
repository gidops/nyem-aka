import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import { RequestStatus } from '../generated/prisma/client.js';
import {
  AssignRequestDto,
  ChangeStatusDto,
  CreateRequestDto,
  QueryRequestsDto,
  UpdateRequestDto,
} from './dto/requests.dto.js';
import { RequestsService } from './requests.service.js';

// The controller only maps HTTP to service calls. @Roles is the coarse check
// ("which roles may call this at all"); the service does the fine one
// ("is this request yours, and is this move allowed right now").
@ApiTags('requests')
@ApiCookieAuth()
@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  @Roles('REQUESTER')
  @ApiOperation({ summary: 'Submit a new maintenance request' })
  create(
    @Body() dto: CreateRequestDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.requests.create(dto, actor, ip);
  }

  @Get()
  @ApiOperation({
    summary: 'List requests with search, filters, sorting and pagination',
    description:
      'Requesters see their own requests, officers see those assigned to them, admins see all.',
  })
  list(@Query() query: QueryRequestsDto, @CurrentUser() actor: AuthUser) {
    return this.requests.list(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One request with assignments, timeline and attachments' })
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.requests.findOne(id, actor);
  }

  @Patch(':id')
  @Roles('REQUESTER')
  @ApiOperation({ summary: 'Edit your own request while it is still pending' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRequestDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.requests.update(id, dto, actor, ip);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Roles('REQUESTER')
  @ApiOperation({ summary: 'Cancel your own request while it is still pending' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.requests.changeStatus(
      id,
      RequestStatus.CANCELLED,
      'Cancelled by requester',
      actor,
      ip,
    );
  }

  @Post(':id/assign')
  @HttpCode(200)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign or reassign a request to a maintenance officer' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignRequestDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.requests.assign(id, dto, actor, ip);
  }

  @Patch(':id/status')
  @Roles('OFFICER', 'ADMIN')
  @ApiOperation({
    summary: 'Move a request along its lifecycle',
    description:
      'Assigned officer: IN_PROGRESS, COMPLETED. Admin: REJECTED (from PENDING) or IN_PROGRESS (reopen a COMPLETED request); both need a note.',
  })
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() actor: AuthUser,
    @Ip() ip: string,
  ) {
    return this.requests.changeStatus(id, dto.status, dto.note, actor, ip);
  }
}
