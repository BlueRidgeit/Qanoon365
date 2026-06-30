import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private async enrichTasks(tasks: any[]) {
    const userIds = [
      ...new Set(
        tasks.flatMap((task) =>
          [
            task.assignedTo,
            task.createdBy,
            task.updatedBy,
            task.approvedBy,
          ].filter(Boolean),
        ),
      ),
    ] as string[];

    if (userIds.length === 0) {
      return tasks.map((task) => ({
        ...task,
        assignedUser: null,
        createdUser: null,
        updatedUser: null,
        approvedUser: null,
      }));
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const usersById = new Map(
      users.map((user) => [
        user.id,
        {
          ...user,
          name:
            [user.firstName, user.lastName].filter(Boolean).join(' ') ||
            user.email,
        },
      ]),
    );

    return tasks.map((task) => ({
      ...task,
      assignedUser: task.assignedTo
        ? (usersById.get(task.assignedTo) ?? null)
        : null,
      createdUser: task.createdBy
        ? (usersById.get(task.createdBy) ?? null)
        : null,
      updatedUser: task.updatedBy
        ? (usersById.get(task.updatedBy) ?? null)
        : null,
      approvedUser: task.approvedBy
        ? (usersById.get(task.approvedBy) ?? null)
        : null,
    }));
  }

  private async enrichTask(task: any) {
    const [enrichedTask] = await this.enrichTasks([task]);
    return enrichedTask;
  }

  async create(
    data: {
      title: string;
      description?: string;
      entityType?: string;
      entityId?: string;
      priority?: string;
      assignedTo?: string;
      dueDate?: string;
      tags?: string;
      status?: string;
      taskType?: string;
      approvalStatus?: string;
    },
    userId: string,
  ) {
    const approvalStatus =
      data.approvalStatus ??
      (data.taskType === 'approval' || data.taskType === 'review'
        ? 'pending_approval'
        : undefined);

    const task = await this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        entityType: data.entityType,
        entityId: data.entityId,
        status: data.status ?? 'todo',
        priority: data.priority ?? 'normal',
        assignedTo: data.assignedTo,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        tags: data.tags,
        taskType: data.taskType ?? 'standard',
        approvalStatus,
        approvedAt:
          approvalStatus && approvalStatus !== 'pending_approval'
            ? new Date()
            : undefined,
        approvedBy:
          approvalStatus && approvalStatus !== 'pending_approval'
            ? userId
            : undefined,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.audit.log({
      entityType: 'task',
      entityId: task.id,
      action: 'create',
      performedBy: userId,
    });

    return this.enrichTask(task);
  }

  async findAll(params: {
    status?: string;
    assignedTo?: string;
    entityType?: string;
    entityId?: string;
    priority?: string;
    taskType?: string;
    approvalStatus?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = params.limit ?? 50;
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.assignedTo) where.assignedTo = params.assignedTo;
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.priority) where.priority = params.priority;
    if (params.taskType) where.taskType = params.taskType;
    if (params.approvalStatus) where.approvalStatus = params.approvalStatus;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { tags: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const query: any = {
      where,
      orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'desc' as const }],
      take: limit,
    };
    if (params.cursor) {
      query.cursor = { id: params.cursor };
      query.skip = 1;
    }

    const tasks = await this.prisma.task.findMany(query);
    return this.enrichTasks(tasks);
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return this.enrichTask(task);
  }

  async update(id: string, data: Record<string, any>, userId: string) {
    const existing = await this.findOne(id);

    if ('dueDate' in data) {
      data.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    if ('approvedAt' in data) {
      data.approvedAt = data.approvedAt ? new Date(data.approvedAt) : null;
    }

    if ('approvalStatus' in data) {
      if (
        data.approvalStatus === 'approved' ||
        data.approvalStatus === 'rejected'
      ) {
        data.approvedBy = userId;
        data.approvedAt = new Date();
      } else if (
        !data.approvalStatus ||
        data.approvalStatus === 'pending_approval'
      ) {
        data.approvedBy = null;
        data.approvedAt = null;
      }
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    });

    await this.audit.log({
      entityType: 'task',
      entityId: id,
      action: 'update',
      performedBy: userId,
      fieldChanged: 'task',
      oldValue: JSON.stringify({
        status: existing.status,
        approvalStatus: existing.approvalStatus,
      }),
      newValue: JSON.stringify({
        status: task.status,
        approvalStatus: task.approvalStatus,
      }),
    });

    return this.enrichTask(task);
  }

  async updateStatus(id: string, status: string, userId: string) {
    const task = await this.findOne(id);
    const data: any = { status, updatedBy: userId };
    if (status === 'done') {
      data.completedAt = new Date();
      data.completedBy = userId;
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data,
    });

    await this.audit.log({
      entityType: 'task',
      entityId: id,
      action: 'stage_change',
      performedBy: userId,
      fieldChanged: 'status',
      oldValue: task.status,
      newValue: status,
    });

    return this.enrichTask(updated);
  }

  async reorder(taskIds: string[], userId: string) {
    const updates = taskIds.map((taskId, index) =>
      this.prisma.task.update({
        where: { id: taskId },
        data: { sortOrder: index, updatedBy: userId },
      }),
    );
    await this.prisma.$transaction(updates);
    return { reordered: taskIds.length };
  }

  async deleteTask(id: string, userId: string) {
    await this.findOne(id);
    await this.prisma.task.delete({ where: { id } });
    await this.audit.log({
      entityType: 'task',
      entityId: id,
      action: 'delete',
      performedBy: userId,
    });
    return { deleted: true };
  }

  // ── Kanban Board View ─────────────────────────────────────

  async getKanbanBoard(params: {
    assignedTo?: string;
    entityType?: string;
    entityId?: string;
    taskType?: string;
    approvalStatus?: string;
    search?: string;
  }) {
    const where: any = {};
    if (params.assignedTo) where.assignedTo = params.assignedTo;
    if (params.entityType) where.entityType = params.entityType;
    if (params.entityId) where.entityId = params.entityId;
    if (params.taskType) where.taskType = params.taskType;
    if (params.approvalStatus) where.approvalStatus = params.approvalStatus;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { tags: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    const enrichedTasks = await this.enrichTasks(tasks);

    const columns = {
      todo: enrichedTasks.filter((t) => t.status === 'todo'),
      in_progress: enrichedTasks.filter((t) => t.status === 'in_progress'),
      review: enrichedTasks.filter((t) => t.status === 'review'),
      done: enrichedTasks.filter((t) => t.status === 'done'),
    };

    return {
      columns,
      totalTasks: enrichedTasks.length,
    };
  }
}
