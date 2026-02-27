import { Client } from '@notionhq/client'

export function getNotionClient(): Client {
  const notionToken = process.env.NOTION_TOKEN

  if (notionToken === undefined || notionToken === '') {
    throw new Error('Missing NOTION_TOKEN environment variable')
  } else {
    return new Client({ auth: notionToken })
  }
}

export function getNotionTaskDatabaseId(): string {
  const databaseId = process.env.NOTION_DATABASE_ID

  if (databaseId === undefined || databaseId === '') {
    throw new Error('Missing NOTION_DATABASE_ID environment variable')
  } else {
    return databaseId
  }
}
