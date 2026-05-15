import { useBase } from "h3";
import { defineApiHandler, createApiRouter } from "../../utils/http/handler";
import { useApiResponse } from "../../utils/http/response";
import { useUser } from "../../utils/session";

const router = createApiRouter();

/**
 * ======================================================================
 * User APIs
 * ======================================================================
 */

// GET /api/users/@me -> Get current authenticated user
router.get("/@me", defineApiHandler(async (event) => {
  const { user } = useUser(event);

  return useApiResponse({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image ?? null,
  }, "Fetched current user successfully");
}));

export default useBase("/api/users", router.handler);