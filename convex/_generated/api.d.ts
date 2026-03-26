/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as MaintenanceTaskModel from "../MaintenanceTaskModel.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as maintenanceTaskNotifications from "../maintenanceTaskNotifications.js";
import type * as maintenanceTaskQueries from "../maintenanceTaskQueries.js";
import type * as maintenanceTasks from "../maintenanceTasks.js";
import type * as telegram_agent from "../telegram/agent.js";
import type * as telegram_api from "../telegram/api.js";
import type * as telegram_tasks from "../telegram/tasks.js";
import type * as telegram_users from "../telegram/users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  MaintenanceTaskModel: typeof MaintenanceTaskModel;
  auth: typeof auth;
  crons: typeof crons;
  http: typeof http;
  maintenanceTaskNotifications: typeof maintenanceTaskNotifications;
  maintenanceTaskQueries: typeof maintenanceTaskQueries;
  maintenanceTasks: typeof maintenanceTasks;
  "telegram/agent": typeof telegram_agent;
  "telegram/api": typeof telegram_api;
  "telegram/tasks": typeof telegram_tasks;
  "telegram/users": typeof telegram_users;
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
