import { err, ok, Result } from "neverthrow";
import { getNotionClient, getNotionTaskDatabaseId } from "./notion.server";
import { taskPropertyNames } from "./notion-tasks.server";
import { type TaskItem } from "./TaskItem";
import { type PageObjectResponse, type QueryDataSourceResponse } from "@notionhq/client/build/src/api-endpoints";
import { type Client } from "@notionhq/client";

export type SortDirection = "ascending" | "descending";

export async function queryTasksForReminders(): Promise<TaskItem[]> {
  const allOpenTasks = await queryTasks({
    property: taskPropertyNames.done,
    checkbox: { equals: false },
  });
  return allOpenTasks
}

export async function queryTasksForPage() {
  return queryTasks();
}

async function queryTasks(
  filter?: Parameters<Client["dataSources"]["query"]>[0]["filter"],
): Promise<TaskItem[]> {
  const client = getNotionClient();
  const databaseId = getNotionTaskDatabaseId();
  const allResults: QueryDataSourceResponse["results"] = [];
  let hasMoreResults = true;
  let nextCursor: string | null = null;

  while (hasMoreResults) {
    const response = await client.dataSources.query({
      data_source_id: databaseId,
      // filter: {
      //   property: taskPropertyNames.done,
      //   checkbox: { equals: false },
      // },
      sorts: [{ property: taskPropertyNames.dueDate, direction: "descending" }],
      ...(nextCursor === null ? {} : { start_cursor: nextCursor }),
      ...(filter === undefined ? {} : { filter }),
    });

    allResults.push(...response.results);
    hasMoreResults = response.has_more;
    nextCursor = response.next_cursor;
  }

  const mappedTasks = mapTasks(allResults);
  if (mappedTasks.isErr()) {
    throw mappedTasks.error;
  } else {
    return mappedTasks.value;
  }
}

function mapTasks(
  results: QueryDataSourceResponse["results"],
): Result<TaskItem[], Error> {
  return Result.combine(
    results.map((result) => {
      return isPageObject(result)
        ? mapTask(result)
        : err(new Error(`Unexpected Notion response: expected page object`));
    }),
  );
}

function mapTask(page: PageObjectResponse): Result<TaskItem, Error> {
  const properties = page.properties

  const taskProperty = properties[taskPropertyNames.task]
  const doneProperty = properties[taskPropertyNames.done]
  const doneAtProperty = properties[taskPropertyNames.doneAt]
  const dueDateProperty = properties[taskPropertyNames.dueDate]

  if (taskProperty?.type !== 'select') {
    return err(new Error(
      `Invalid Notion property '${taskPropertyNames.task}' on page '${page.id}': expected select`,
    ))
  } else if (
    taskProperty.select?.name === undefined ||
    taskProperty.select.name === ''
  ) {
    return err(new Error(
      `Invalid Notion property '${taskPropertyNames.task}' on page '${page.id}': missing selected value`,
    ))
  } else if (doneProperty?.type !== 'checkbox') {
    return err(new Error(
      `Invalid Notion property '${taskPropertyNames.done}' on page '${page.id}': expected checkbox`,
    ))
  } else if (dueDateProperty?.type !== 'date') {
    return err(new Error(
      `Invalid Notion property '${taskPropertyNames.dueDate}' on page '${page.id}': expected date`,
    ))
  } else if (
    dueDateProperty.date?.start === undefined ||
    dueDateProperty.date.start === ''
  ) {
    return err(new Error(
      `Invalid Notion property '${taskPropertyNames.dueDate}' on page '${page.id}': missing date`,
    ))
  } else if (doneAtProperty !== undefined && doneAtProperty.type !== 'date') {
    return err(new Error(
      `Invalid Notion property '${taskPropertyNames.doneAt}' on page '${page.id}': expected date`,
    ))
  } else {
    const task = taskProperty.select.name
    const done = doneProperty.checkbox
    const dueDate = dueDateProperty.date.start
    const doneAt =
      doneAtProperty === undefined
        ? undefined
        : doneAtProperty.date?.start ?? undefined

    return ok({
      id: page.id,
      task,
      done,
      dueDate,
      ...(doneAt === undefined ? {} : { doneAt }),
    })
  }
}

function isPageObject(response: unknown): response is PageObjectResponse {
  return (
    typeof response === 'object' && response !== null && 'properties' in response
  )
}
