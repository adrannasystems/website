import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "send due/overdue maintenance task notifications",
  { hours: 1 },
  internal.maintenanceTaskNotifications.sendDueOrOverdueMaintenanceTaskNotifications,
  {},
);

crons.interval(
  "send telegram due task notifications",
  { hours: 1 },
  internal.telegram.notifications.sendDueTasks,
  {},
);

export default crons;
