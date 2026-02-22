export type LoaderResult<TData> =
  | {
      isError: false
      data: TData
    }
  | {
      isError: true
      data?: never
    }
