import { Client } from '@notionhq/client'

function getEnvironmentVariable(name: string): string | undefined {
  const processObject = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
  return processObject?.env?.[name]
}

export function getNotionClient(): Client {
  const notionToken = getEnvironmentVariable('NOTION_TOKEN')

  if (notionToken === undefined || notionToken === '') {
    throw new Error('Missing NOTION_TOKEN environment variable')
  } else {
    return new Client({ auth: notionToken })
  }
}

export function getNotionTaskDatabaseId(): string {
  const databaseId = getEnvironmentVariable('NOTION_DATABASE_ID')

  if (databaseId === undefined || databaseId === '') {
    throw new Error('Missing NOTION_DATABASE_ID environment variable')
  } else {
    return databaseId
  }
}
