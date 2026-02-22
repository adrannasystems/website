import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const hello = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      name: z.string().optional(),
    }),
  )
  .handler(({ data }) => {
    const trimmedName = data.name?.trim()
    const safeName =
      trimmedName !== undefined && trimmedName !== '' ? trimmedName : 'there'
    return {
      message: `Hello, ${safeName}!`,
      timestamp: new Date().toISOString(),
    }
  })
