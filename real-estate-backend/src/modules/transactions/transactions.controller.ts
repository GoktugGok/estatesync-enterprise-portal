import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards, Optional } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Body() body: any) {
    return this.transactionsService.create(body);
  }

  @Get()
  findAll() {
    return this.transactionsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    // req.user is populated by JwtAuthGuard → JwtStrategy
    const requesterId: string | undefined = req.user?._id?.toString();
    return this.transactionsService.updateStatus(id, body, requesterId);
  }
}