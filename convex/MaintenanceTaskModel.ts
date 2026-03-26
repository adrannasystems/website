import type { Id } from "./_generated/dataModel";

export type MaintenanceTaskModel = {
  id: Id<"maintenanceTasks">;
  lastExecutedAt: () => number | null;
  name: string;
  periodHours: number;
  isArchived: boolean;
  archivedAt: number | null;
  state: () => MaintenanceTaskState;
  periodsDue: () => number;
};

export class MaintenanceTaskModelImpl implements MaintenanceTaskModel {
  constructor(
    private readonly data: {
      _id: Id<"maintenanceTasks">;
      name: string;
      periodHours: number;
      lastExecutedAt: number | null;
      deletedAt: number | null;
    },
  ) {}

  get id(): Id<"maintenanceTasks"> {
    return this.data._id;
  }

  lastExecutedAt(): number | null {
    return this.data.lastExecutedAt;
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

  state(): MaintenanceTaskState {
    const periodsDue = this.periodsDue();
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

  periodsDue(): number {
    const lastExecutedAt = this.lastExecutedAt();
    if (lastExecutedAt === null) {
      return Number.POSITIVE_INFINITY;
    } else {
      const periodMilliseconds = this.periodHours * 60 * 60 * 1000;
      const elapsedMilliseconds = Date.now() - lastExecutedAt;
      return elapsedMilliseconds / periodMilliseconds;
    }
  }
}

export type MaintenanceTaskState = "All Good" | "Due" | "Overdue" | "Never Done";
