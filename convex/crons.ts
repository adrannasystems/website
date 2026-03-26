import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "send due/overdue maintenance task notifications",
  { hours: 1 },
  internal.maintenanceTaskNotifications.sendDueOrOverdueMaintenanceTaskNotifications,
  {},
);

export default crons;
