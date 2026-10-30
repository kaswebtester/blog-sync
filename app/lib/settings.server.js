import db from "../db.server";
import { defaults } from "./settings-values.js";
export { defaults, parseSettings, validateFeedUrl } from "./settings-values.js";
export async function getSettings(shop){return await db.journalSettings.findUnique({where:{shop}}) || {...defaults,shop};}
