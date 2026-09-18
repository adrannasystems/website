import { readFileSync } from "node:fs";
import { parseEinkaufCsv } from "../domain/operations/parseEinkaufCsv";

const csvPath = process.argv[2] ?? "einkauf.csv";
const catalog = parseEinkaufCsv(readFileSync(csvPath, "utf8"));
process.stdout.write(`${JSON.stringify(catalog)}\n`);
