import { z } from "zod";

const publicAppOriginEnvVarName = "PUBLIC_APP_ORIGIN";
export const publicAppOrigin = z
  .string({ message: `${publicAppOriginEnvVarName} is required` })
  .url()
  .parse(process.env[publicAppOriginEnvVarName]);
