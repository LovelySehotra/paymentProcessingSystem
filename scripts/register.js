import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Register SWC for TypeScript compilation
register("@swc-node/register/esm", pathToFileURL("./"));

// Improve error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});