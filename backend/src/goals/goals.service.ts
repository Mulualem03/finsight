import { Injectable, NotFoundException } from '@nestjs/common';
import { ulid } from 'ulid';
import { PrismaService } from '../database/prisma.service';
import { CreateContributionDto, CreateGoalDto, UpdateGoalDto } from './dto/goals.dto';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { userId },
      include: { contributions: { orderBy: { occurredAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return goals.map(serialise);
  }

  async create(userId: string, dto: CreateGoalDto) {
    const goal = await this.prisma.goal.create({
      data: {
        id: ulid(),
        userId,
        name: dto.name,
        targetAmount: BigInt(dto.targetAmount),
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        linkedAccountId: dto.linkedAccountId,
      },
      include: { contributions: true },
    });
    return serialise(goal);
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    await this.ensureOwned(userId, id);
    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.targetAmount !== undefined ? { targetAmount: BigInt(dto.targetAmount) } : {}),
        ...(dto.deadline !== undefined ? { deadline: new Date(dto.deadline) } : {}),
        ...(dto.linkedAccountId !== undefined ? { linkedAccountId: dto.linkedAccountId } : {}),
      },
      include: { contributions: true },
    });
    return serialise(goal);
  }

  async delete(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    await this.prisma.goal.delete({ where: { id } });
  }

  async contribute(userId: string, id: string, dto: CreateContributionDto) {
    await this.ensureOwned(userId, id);
    await this.prisma.goalContribution.create({
      data: {
        id: ulid(),
        goalId: id,
        amount: BigInt(dto.amount),
        note: dto.note,
      },
    });
    const goal = await this.prisma.goal.findUniqueOrThrow({
      where: { id },
      include: { contributions: { orderBy: { occurredAt: 'desc' } } },
    });
    return serialise(goal);
  }

  private async ensureOwned(userId: string, id: string): Promise<void> {
    const goal = await this.prisma.goal.findUnique({ where: { id }, select: { userId: true } });
    if (!goal || goal.userId !== userId) {
      throw new NotFoundException({ code: 'GOAL_NOT_FOUND', message: 'Goal not found' });
    }
  }
}

function serialise(g: {
  id: string;
  name: string;
  targetAmount: bigint;
  deadline: Date | null;
  linkedAccountId: string | null;
  createdAt: Date;
  contributions: Array<{ id: string; amount: bigint; occurredAt: Date; note: string | null }>;
}) {
  const total = g.contributions.reduce((acc, c) => acc + c.amount, 0n);
  return {
    id: g.id,
    name: g.name,
    targetAmount: g.targetAmount.toString(),
    saved: total.toString(),
    progress: g.targetAmount > 0n ? Number((total * 10000n) / g.targetAmount) / 100 : 0,
    deadline: g.deadline?.toISOString() ?? null,
    linkedAccountId: g.linkedAccountId,
    createdAt: g.createdAt.toISOString(),
    contributions: g.contributions.map(c => ({
      id: c.id,
      amount: c.amount.toString(),
      occurredAt: c.occurredAt.toISOString(),
      note: c.note,
    })),
  };
}
