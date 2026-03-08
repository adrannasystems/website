/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as maintenanceTaskMigrations from "../maintenanceTaskMigrations.js";
import type * as maintenanceTaskNotifications from "../maintenanceTaskNotifications.js";
import type * as maintenanceTasks from "../maintenanceTasks.js";
import type * as repositories_maintenanceTasksRepo from "../repositories/maintenanceTasksRepo.js";
import type * as services_maintenance_tasks_index from "../services/maintenance_tasks/index.js";
import type * as services_maintenance_tasks_listDueOrMoreUrgentTasksForNotifications from "../services/maintenance_tasks/listDueOrMoreUrgentTasksForNotifications.js";
import type * as services_maintenance_tasks_listTaskExecutionsForTaskDetails from "../services/maintenance_tasks/listTaskExecutionsForTaskDetails.js";
import type * as services_maintenance_tasks_listTasksForMaintenanceOverview from "../services/maintenance_tasks/listTasksForMaintenanceOverview.js";
import type * as services_maintenance_tasks_taskStateShared from "../services/maintenance_tasks/taskStateShared.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  crons: typeof crons;
  maintenanceTaskMigrations: typeof maintenanceTaskMigrations;
  maintenanceTaskNotifications: typeof maintenanceTaskNotifications;
  maintenanceTasks: typeof maintenanceTasks;
  "repositories/maintenanceTasksRepo": typeof repositories_maintenanceTasksRepo;
  "services/maintenance_tasks/index": typeof services_maintenance_tasks_index;
  "services/maintenance_tasks/listDueOrMoreUrgentTasksForNotifications": typeof services_maintenance_tasks_listDueOrMoreUrgentTasksForNotifications;
  "services/maintenance_tasks/listTaskExecutionsForTaskDetails": typeof services_maintenance_tasks_listTaskExecutionsForTaskDetails;
  "services/maintenance_tasks/listTasksForMaintenanceOverview": typeof services_maintenance_tasks_listTasksForMaintenanceOverview;
  "services/maintenance_tasks/taskStateShared": typeof services_maintenance_tasks_taskStateShared;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
