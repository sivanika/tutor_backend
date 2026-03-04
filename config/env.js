// This MUST be the very first import in server.js
// ES Module imports are hoisted, so dotenv.config() called in server.js body
// runs AFTER all modules load. Putting it here ensures env vars are available
// to every module that imports them.
import { config } from "dotenv";
config();
