import type { GenericId } from "convex/values";

// GenericId from the convex npm package resolves to the same type as
// the generated Id<"maintenanceTasks"> — it is a branded string.
export type Id<T extends string> = GenericId<T>;

// Plain string for now; may become a branded type later.
export type UserId = string;

// Unix timestamp in milliseconds (as returned by Date.now()).
export type MsSinceEpoch = number;

export type MaintenanceTaskState = "All Good" | "Due" | "Overdue" | "Never Done";

export type MaintenanceTaskModel = {
  id: Id<"maintenanceTasks">;
  userId: UserId;
  name: string;
  periodHours: number;
  lastExecutedAt: MsSinceEpoch | null;
  isArchived: boolean;
  archivedAt: MsSinceEpoch | null;
  state: MaintenanceTaskState;
  periodsDue: number;
  isShared: boolean;
  notificationsEnabled: boolean;
};

export class MaintenanceTaskModelImpl implements MaintenanceTaskModel {
  constructor(
    private readonly data: {
      _id: Id<"maintenanceTasks">;
      name: string;
      periodHours: number;
      lastExecutedAt: MsSinceEpoch | null;
      deletedAt: MsSinceEpoch | null;
      shared: boolean;
      userId: UserId;
      notificationsEnabled?: boolean;
    },
  ) {}

  get id(): Id<"maintenanceTasks"> {
    return this.data._id;
  }

  get userId(): UserId {
    return this.data.userId;
  }

  get name(): string {
    return this.data.name;
  }

  get periodHours(): number {
    return this.data.periodHours;
  }

  get lastExecutedAt(): MsSinceEpoch | null {
    return this.data.lastExecutedAt;
  }

  get archivedAt(): MsSinceEpoch | null {
    return this.data.deletedAt ?? null;
  }

  get isArchived(): boolean {
    return this.archivedAt !== null;
  }

  get isShared(): boolean {
    return this.data.shared === true;
  }

  /** True unless explicitly set to false. Undefined (pre-migration rows) means enabled. */
  get notificationsEnabled(): boolean {
    return this.data.notificationsEnabled !== false;
  }

  get state(): MaintenanceTaskState {
    const periodsDue = this.periodsDue;
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

  get periodsDue(): number {
    const lastExecutedAt = this.lastExecutedAt;
    if (lastExecutedAt === null) {
      return Number.POSITIVE_INFINITY;
    } else {
      const periodMilliseconds = this.periodHours * 60 * 60 * 1000;
      const elapsedMilliseconds = Date.now() - lastExecutedAt;
      return elapsedMilliseconds / periodMilliseconds;
    }
  }
}
