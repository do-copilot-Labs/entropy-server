import { auth } from "../../utils/auth";
import { toWebRequest } from "h3";

/**
 * @description Auth handler for Better Auth
 * @param event H3 event
 * @returns Auth response
 */
export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event));
});