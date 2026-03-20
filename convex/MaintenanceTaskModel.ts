import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { findLatestExecutionTimestamp } from "./maintenanceTaskMigrations";

export type MaintenanceTaskModel = {
  id: Id<"maintenanceTasks">;
  lastExecutedAt: () => Promise<number | null>;
  name: string;
  periodHours: number;
  isArchived: boolean;
  archivedAt: number | null;
  state: () => Promise<MaintenanceTaskState>;
  periodsDue: () => Promise<number>;
};

export class MaintenanceTaskModelImpl implements MaintenanceTaskModel {
  constructor(
    private readonly ctx: QueryCtx,
    private readonly data: {
      _id: Id<"maintenanceTasks">;
      name: string;
      periodHours: number;
      lastExecutedAt?: number | null | undefined;
      deletedAt?: number | null | undefined;
    },
  ) {}

  private _lastExecutedAt: Promise<number | null> | null = null;

  get id(): Id<"maintenanceTasks"> {
    return this.data._id;
  }

  async lastExecutedAt(): Promise<number | null> {
    return this._lastExecutedAt ??=
      this.data.lastExecutedAt !== undefined
        ? Promise.resolve(this.data.lastExecutedAt)
        : findLatestExecutionTimestamp(this.ctx, this.id);
  }

  get name(): string {
    return this.data.name;
  }

  get periodHours(): number {
    return this.data.periodHours;
  }

  get archivedAt(): number | null {
    return this.data.deletedAt ?? null;
  }

  get isArchived(): boolean {
    return this.archivedAt !== null;
  }

  async state(): Promise<MaintenanceTaskState> {
    const periodsDue = await this.periodsDue();
    if (periodsDue === Number.POSITIVE_INFINITY) {
      return "Never Done";
    } else if (periodsDue < 1) {
      return "All Good";
    } else if (periodsDue < 2) {
      return "Due";
    } else {
      return "Overdue";
    }
  }

  async periodsDue(): Promise<number> {
    const lastExecutedAt = await this.lastExecutedAt();
    if (lastExecutedAt === null) {
      return Number.POSITIVE_INFINITY;
    } else {
      const periodMilliseconds = this.periodHours * 60 * 60 * 1000;
      const elapsedMilliseconds = Date.now() - lastExecutedAt;
      return elapsedMilliseconds / periodMilliseconds;
    }
  }
}
export type MaintenanceTaskState = "All Good" |
  "Due" |
  "Overdue" |
  "Never Done";

