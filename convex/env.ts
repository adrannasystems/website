import { z } from "zod";

const publicAppOriginEnvVarName = "PUBLIC_APP_ORIGIN";
export const publicAppOrigin = z
  .url(`${publicAppOriginEnvVarName} is required`)
  .parse(process.env[publicAppOriginEnvVarName]);
