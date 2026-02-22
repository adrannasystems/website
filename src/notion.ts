import { Client } from '@notionhq/client'

export type NotionConfig = {
  client: Client
  databaseId: string
}

export function getNotionConfig(): NotionConfig {
  const notionToken = process.env.NOTION_TOKEN
  const databaseId = process.env.NOTION_DATABASE_ID

  if (notionToken === undefined || notionToken === '') {
    throw new Error('Missing NOTION_TOKEN environment variable')
  }

  if (databaseId === undefined || databaseId === '') {
    throw new Error('Missing NOTION_DATABASE_ID environment variable')
  }

  return {
    client: new Client({ auth: notionToken }),
    databaseId,
  }
}
