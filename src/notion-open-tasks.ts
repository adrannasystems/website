import { err, ok, Result } from "neverthrow";
import { getNotionClient, getNotionTaskDatabaseId } from "./notion";
import { taskPropertyNames } from "./notion-tasks";
import { type TaskItem } from "./TaskItem";
import { type PageObjectResponse, type QueryDataSourceResponse } from "@notionhq/client/build/src/api-endpoints";

export type SortDirection = "ascending" | "descending";

export async function queryOpenTasks(
  sortDirection: SortDirection,
): Promise<TaskItem[]> {
  const client = getNotionClient();
  const databaseId = getNotionTaskDatabaseId();
  const allResults: QueryDataSourceResponse["results"] = [];
  let hasMoreResults = true;
  let nextCursor: string | null = null;

  while (hasMoreResults) {
    const response = await client.dataSources.query({
      data_source_id: databaseId,
      filter: {
        property: taskPropertyNames.done,
        checkbox: { equals: false },
      },
      sorts: [{ property: taskPropertyNames.dueDate, direction: sortDirection }],
      ...(nextCursor === null ? {} : { start_cursor: nextCursor }),
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
  } else {
    const task = taskProperty.select.name
    const done = doneProperty.checkbox
    const dueDate = dueDateProperty.date.start

    return ok({
      id: page.id,
      task,
      done,
      dueDate,
    })
  }
}

function isPageObject(response: unknown): response is PageObjectResponse {
  return (
    typeof response === 'object' && response !== null && 'properties' in response
  )
}
