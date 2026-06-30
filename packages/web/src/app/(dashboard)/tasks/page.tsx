'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  useCreateTask,
  useTasks,
  useUpdateTask,
  useUpdateTaskStatus,
  type CreateTaskRequest,
  type TaskRecord,
} from '@/hooks/use-api';
import { EnforcementStatCard } from '@/components/enforcement/enforcement-stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  CheckCheck,
  ClipboardList,
  Clock3,
  FilterX,
  Plus,
  ShieldCheck,
} from 'lucide-react';

const STATUS_FLOW = ['todo', 'in_progress', 'review', 'done'] as const;

const STATUS_META: Record<(typeof STATUS_FLOW)[number], { label: string; badge: string; panel: string }> = {
  todo: {
    label: 'To Do',
    badge: 'bg-slate-500/10 text-slate-700 border-slate-200 dark:text-slate-300',
    panel: 'border-slate-200/80 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-950/20',
  },
  in_progress: {
    label: 'In Progress',
    badge: 'bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-300',
    panel: 'border-blue-200/80 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20',
  },
  review: {
    label: 'In Review',
    badge: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300',
    panel: 'border-amber-200/80 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20',
  },
  done: {
    label: 'Done',
    badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-300',
    panel: 'border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20',
  },
};

const PRIORITY_META: Record<string, string> = {
  low: 'bg-slate-500/10 text-slate-700 border-slate-200 dark:text-slate-300',
  normal: 'bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-300',
  high: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300',
  urgent: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-300',
};

const TYPE_META: Record<string, { label: string; badge: string }> = {
  standard: {
    label: 'Standard',
    badge: 'bg-slate-500/10 text-slate-700 border-slate-200 dark:text-slate-300',
  },
  approval: {
    label: 'Approval',
    badge: 'bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-200 dark:text-fuchsia-300',
  },
  review: {
    label: 'Review',
    badge: 'bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:text-indigo-300',
  },
  follow_up: {
    label: 'Follow-Up',
    badge: 'bg-cyan-500/10 text-cyan-700 border-cyan-200 dark:text-cyan-300',
  },
};

const APPROVAL_META: Record<string, { label: string; badge: string }> = {
  pending_approval: {
    label: 'Pending approval',
    badge: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-300',
  },
  approved: {
    label: 'Approved',
    badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-300',
  },
  rejected: {
    label: 'Rejected',
    badge: 'bg-rose-500/10 text-rose-700 border-rose-200 dark:text-rose-300',
  },
};

const LENSES = [
  { id: 'all', label: 'All work' },
  { id: 'mine', label: 'Assigned to me' },
  { id: 'approval', label: 'Approvals' },
  { id: 'follow_up', label: 'Follow-Ups' },
  { id: 'overdue', label: 'Overdue' },
] as const;

const STARTER_TEMPLATES = [
  {
    title: 'Appeal filing sprint',
    description:
      'Create the filing task, partner approval check, and final review sequence for an appeal deadline.',
    taskType: 'approval',
    priority: 'urgent',
    tags: 'appeal, filing, court',
    dueInDays: 3,
  },
  {
    title: 'Execution follow-up cycle',
    description:
      'Track registry outreach, debtor status checks, and internal escalation for a stalled execution file.',
    taskType: 'follow_up',
    priority: 'high',
    tags: 'execution, follow-up, registry',
    dueInDays: 5,
  },
  {
    title: 'Office renewal bundle',
    description:
      'Capture the admin checklist for licenses, signatures, and supporting documents before renewal dates slip.',
    taskType: 'standard',
    priority: 'normal',
    tags: 'admin, renewal, office',
    dueInDays: 10,
  },
] as const;

function formatDate(date?: string) {
  if (!date) return 'No due date';

  return new Date(date).toLocaleDateString('en-AE', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function normalizeText(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

function isOverdue(task: TaskRecord) {
  return Boolean(task.dueDate) && task.status !== 'done' && new Date(task.dueDate!).getTime() < Date.now();
}

function isDueThisWeek(task: TaskRecord) {
  if (!task.dueDate || task.status === 'done') return false;

  const dueTime = new Date(task.dueDate).getTime();
  const now = Date.now();
  const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;

  return dueTime >= now && dueTime <= weekFromNow;
}

function nextStatus(currentStatus: string, direction: -1 | 1) {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus as (typeof STATUS_FLOW)[number]);
  if (currentIndex === -1) return null;

  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= STATUS_FLOW.length) return null;

  return STATUS_FLOW[targetIndex];
}

function splitTags(tags?: string) {
  if (!tags) return [];
  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function friendlyEntity(entityType?: string) {
  if (!entityType) return null;
  return entityType.replace(/_/g, ' ');
}

function TaskCard({
  task,
  currentUserId,
  busy,
  onMove,
  onApproval,
  onAssignToMe,
}: {
  task: TaskRecord;
  currentUserId?: string;
  busy: boolean;
  onMove: (task: TaskRecord, direction: -1 | 1) => Promise<void>;
  onApproval: (task: TaskRecord, status: 'approved' | 'rejected') => Promise<void>;
  onAssignToMe: (task: TaskRecord) => Promise<void>;
}) {
  const status = STATUS_META[(task.status as keyof typeof STATUS_META) ?? 'todo'] ?? STATUS_META.todo;
  const type = TYPE_META[task.taskType ?? 'standard'] ?? TYPE_META.standard;
  const approval = task.approvalStatus ? APPROVAL_META[task.approvalStatus] : null;
  const dueDateLabel = formatDate(task.dueDate);
  const taskTags = splitTags(task.tags);
  const overdue = isOverdue(task);

  return (
    <Card className={cn('border shadow-sm', overdue && 'border-red-200 dark:border-red-900')}>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-base leading-snug">{task.title}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={type.badge}>
                {type.label}
              </Badge>
              <Badge variant="outline" className={PRIORITY_META[task.priority] ?? PRIORITY_META.normal}>
                {task.priority}
              </Badge>
              {approval && (
                <Badge variant="outline" className={approval.badge}>
                  {approval.label}
                </Badge>
              )}
            </div>
          </div>

          <Badge variant="outline" className={status.badge}>
            {status.label}
          </Badge>
        </div>

        {task.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-3">
            <span>Due</span>
            <span className={cn('font-medium', overdue && 'text-red-600 dark:text-red-400')}>{dueDateLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Owner</span>
            <span className="font-medium text-foreground">
              {task.assignedUser?.name ?? (task.assignedTo === currentUserId ? 'You' : 'Unassigned')}
            </span>
          </div>
          {task.entityType && (
            <div className="flex items-center justify-between gap-3">
              <span>Linked</span>
              <span className="font-medium text-foreground">{friendlyEntity(task.entityType)}</span>
            </div>
          )}
        </div>

        {taskTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {taskTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[11px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || nextStatus(task.status, -1) == null}
            onClick={() => void onMove(task, -1)}
          >
            Back
          </Button>
          <Button
            size="sm"
            disabled={busy || nextStatus(task.status, 1) == null}
            onClick={() => void onMove(task, 1)}
          >
            Advance
          </Button>
          {!task.assignedTo && currentUserId && (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void onAssignToMe(task)}
            >
              Assign to me
            </Button>
          )}
        </div>

        {task.approvalStatus === 'pending_approval' && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void onApproval(task, 'rejected')}
            >
              Reject
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void onApproval(task, 'approved')}
            >
              Approve
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TasksPage() {
  const { user } = useAuthStore();
  const { data: tasks, isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateTaskStatus = useUpdateTaskStatus();

  const [search, setSearch] = useState('');
  const [lens, setLens] = useState<(typeof LENSES)[number]['id']>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState('standard');
  const [priority, setPriority] = useState('normal');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [assignToMe, setAssignToMe] = useState(true);

  const allTasks = tasks ?? [];

  const stats = useMemo(() => {
    return {
      open: allTasks.filter((task) => task.status !== 'done').length,
      dueThisWeek: allTasks.filter(isDueThisWeek).length,
      pendingApproval: allTasks.filter((task) => task.approvalStatus === 'pending_approval').length,
      overdue: allTasks.filter(isOverdue).length,
    };
  }, [allTasks]);

  const filteredTasks = useMemo(() => {
    return allTasks
      .filter((task) => {
        const haystack = [
          task.title,
          task.description,
          task.tags,
          task.entityType,
          task.assignedUser?.name,
        ]
          .map(normalizeText)
          .join(' ');

        const matchesSearch = !search || haystack.includes(normalizeText(search));
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

        const matchesLens =
          lens === 'all' ||
          (lens === 'mine' && task.assignedTo === user?.id) ||
          (lens === 'approval' && (task.taskType === 'approval' || task.taskType === 'review' || Boolean(task.approvalStatus))) ||
          (lens === 'follow_up' && task.taskType === 'follow_up') ||
          (lens === 'overdue' && isOverdue(task));

        return matchesSearch && matchesStatus && matchesLens;
      })
      .sort((left, right) => {
        const leftOverdue = isOverdue(left) ? 1 : 0;
        const rightOverdue = isOverdue(right) ? 1 : 0;
        if (leftOverdue !== rightOverdue) return rightOverdue - leftOverdue;

        const leftDue = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const rightDue = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        if (leftDue !== rightDue) return leftDue - rightDue;

        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  }, [allTasks, lens, search, statusFilter, user?.id]);

  const columns = useMemo(
    () =>
      STATUS_FLOW.map((status) => ({
        status,
        tasks: filteredTasks.filter((task) => task.status === status),
      })),
    [filteredTasks],
  );

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTaskType('standard');
    setPriority('normal');
    setDueDate('');
    setTags('');
    setEntityType('');
    setEntityId('');
    setAssignToMe(true);
  };

  const openStarter = (template: (typeof STARTER_TEMPLATES)[number]) => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + template.dueInDays);

    setTitle(template.title);
    setDescription(template.description);
    setTaskType(template.taskType);
    setPriority(template.priority);
    setDueDate(nextDate.toISOString().slice(0, 10));
    setTags(template.tags);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;

    const payload: CreateTaskRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      taskType,
      priority,
      dueDate: dueDate || undefined,
      tags: tags.trim() || undefined,
      entityType: entityType || undefined,
      entityId: entityId.trim() || undefined,
      assignedTo: assignToMe ? user?.id : undefined,
      approvalStatus:
        taskType === 'approval' || taskType === 'review' ? 'pending_approval' : undefined,
    };

    await createTask.mutateAsync(payload);
    toast.success('Task created');
    resetForm();
    setCreateOpen(false);
  };

  const handleMove = async (task: TaskRecord, direction: -1 | 1) => {
    const targetStatus = nextStatus(task.status, direction);
    if (!targetStatus) return;

    await updateTaskStatus.mutateAsync({ id: task.id, status: targetStatus });
    toast.success(`Task moved to ${STATUS_META[targetStatus].label}`);
  };

  const handleApproval = async (task: TaskRecord, approvalStatus: 'approved' | 'rejected') => {
    await updateTask.mutateAsync({
      id: task.id,
      approvalStatus,
      status: approvalStatus === 'approved' ? 'done' : 'review',
    });
    toast.success(approvalStatus === 'approved' ? 'Task approved' : 'Task rejected');
  };

  const handleAssignToMe = async (task: TaskRecord) => {
    if (!user?.id) return;
    await updateTask.mutateAsync({ id: task.id, assignedTo: user.id });
    toast.success('Task assigned to you');
  };

  const clearFilters = () => {
    setSearch('');
    setLens('all');
    setStatusFilter('all');
  };

  const busy = createTask.isPending || updateTask.isPending || updateTaskStatus.isPending;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-56" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white font-heading">
            Task Center
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            A single workflow hub for legal work, internal approvals, and follow-up operations.
            This closes the gap between the backend task engine and the actual day-to-day product.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
              <DialogDescription>
                Capture operational work, approvals, or follow-ups without burying them in notes.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="task-title">Task title</Label>
                <Input
                  id="task-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Review appeal pack before filing"
                />
              </div>

              <div className="space-y-2">
                <Label>Task type</Label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="approval">Approval</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="follow_up">Follow-Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-due-date">Due date</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-tags">Tags</Label>
                <Input
                  id="task-tags"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="appeal, hearing, admin"
                />
              </div>

              <div className="space-y-2">
                <Label>Linked record type</Label>
                <Select value={entityType || 'none'} onValueChange={(value) => setEntityType(value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="matter">Matter</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="execution_file">Execution File</SelectItem>
                    <SelectItem value="criminal_complaint">Criminal Complaint</SelectItem>
                    <SelectItem value="appeal_deadline">Appeal Deadline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-entity-id">Linked record ID</Label>
                <Input
                  id="task-entity-id"
                  value={entityId}
                  onChange={(event) => setEntityId(event.target.value)}
                  placeholder="Optional UUID"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="task-description">Description</Label>
                <Textarea
                  id="task-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What needs to happen, what is blocking it, and what good looks like."
                  rows={4}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={assignToMe}
                onChange={(event) => setAssignToMe(event.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Assign this task to me immediately
            </label>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleCreate()} disabled={!title.trim() || createTask.isPending}>
                {createTask.isPending ? 'Creating...' : 'Create task'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <EnforcementStatCard title="Open tasks" value={stats.open} icon={ClipboardList} />
        <EnforcementStatCard title="Due this week" value={stats.dueThisWeek} icon={Clock3} />
        <EnforcementStatCard
          title="Pending approval"
          value={stats.pendingApproval}
          icon={ShieldCheck}
          variant={stats.pendingApproval > 0 ? 'warning' : 'default'}
        />
        <EnforcementStatCard
          title="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          variant={stats.overdue > 0 ? 'warning' : 'success'}
        />
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-border">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {LENSES.map((item) => (
                <Button
                  key={item.id}
                  variant={lens === item.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLens(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search titles, tags, owners, or descriptions..."
                className="sm:w-80"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Showing {filteredTasks.length} of {allTasks.length} tasks
            </span>
            {(search || lens !== 'all' || statusFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                <FilterX className="h-4 w-4" />
                Reset filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {allTasks.length === 0 ? (
        <Card className="border-0 shadow-sm ring-1 ring-border">
          <CardHeader>
            <CardTitle>Start with a workflow</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {STARTER_TEMPLATES.map((template) => (
              <button
                type="button"
                key={template.title}
                onClick={() => openStarter(template)}
                className="rounded-2xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">{template.title}</h2>
                    <Badge variant="outline" className={TYPE_META[template.taskType].badge}>
                      {TYPE_META[template.taskType].label}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{template.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{template.tags}</span>
                    <span>Due in {template.dueInDays} days</span>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <CheckCheck className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-lg font-semibold">No tasks match the current filters</p>
              <p className="text-sm text-muted-foreground">
                Clear the filters or create a new task to populate the board again.
              </p>
            </div>
            <Button variant="outline" onClick={clearFilters}>
              Reset filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-4">
          {columns.map((column) => (
            <div
              key={column.status}
              className={cn('rounded-2xl border p-4', STATUS_META[column.status].panel)}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {STATUS_META[column.status].label}
                  </h2>
                  <p className="mt-1 text-2xl font-bold">{column.tasks.length}</p>
                </div>
                <Badge variant="outline" className={STATUS_META[column.status].badge}>
                  {column.tasks.length} items
                </Badge>
              </div>

              <div className="space-y-3">
                {column.tasks.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/80 bg-background/70 px-4 py-10 text-center text-sm text-muted-foreground">
                    Nothing in {STATUS_META[column.status].label.toLowerCase()} right now.
                  </div>
                ) : (
                  column.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      currentUserId={user?.id}
                      busy={busy}
                      onMove={handleMove}
                      onApproval={handleApproval}
                      onAssignToMe={handleAssignToMe}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
