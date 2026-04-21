import { useBase, readBody } from "h3";
import { defineApiHandler, createApiRouter } from "../../utils/http/handler";
import { useApiResponse } from "../../utils/http/response";
import { BasicError } from "../../utils/http/error";
import { useUser } from "../../utils/session";
import * as urlService from "../../service/url.service";

// 使用我们封装的 createApiRouter，它自带 404 兜底
const router = createApiRouter();


/**
 * ======================================================================
 * URL Item Management
 * ======================================================================
 */

// POST /api/urls/bookmark -> Create new URL
router.post("/bookmark", defineApiHandler(async (event) => {
  const { user } = useUser(event);
  const body = await readBody(event);
  if (!body?.url) {
    throw new BasicError("INPUT_REQUIRED", { message: "URL is required" });
  }
  const result = await urlService.createOrUpdateContentUrl(user.id, body);
  const message = result.action === "created" ? "Created successfully" : "Updated successfully";

  return useApiResponse(result, message);
}));

// 恢复使用 useBase，优雅地处理前缀
export default useBase("/api/urls", router.handler);
