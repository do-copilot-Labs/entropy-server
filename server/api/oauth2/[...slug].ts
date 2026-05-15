import { getQuery, readBody, useBase } from "h3";
import * as authService from "../../service/auth.service";
import { BasicError } from "../../utils/http/error";
import { createApiRouter, defineApiHandler } from "../../utils/http/handler";
import { useApiResponse } from "../../utils/http/response";
import { useUser } from "../../utils/session";

const router = createApiRouter();

type AuthorizeQuery = {
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
};

type AuthorizeCompleteBody = {
  client_id?: string;
  state?: string;
  code_challenge?: string;
};

type AuthorizationCodeGrantBody = {
  grant_type: "authorization_code";
  client_id?: string;
  code?: string;
  code_verifier?: string;
  redirect_uri?: string;
};

type RefreshTokenGrantBody = {
  grant_type: "refresh_token";
  client_id?: string;
  refresh_token?: string;
};

type TokenRequestBody = AuthorizationCodeGrantBody | RefreshTokenGrantBody;

type RevokeTokenBody = {
  client_id?: string;
  token?: string;
};

// GET /api/oauth2/authorize -> Generate authUrl to start OAuth flow
router.get("/authorize", defineApiHandler(async (event) => {
  const query = getQuery<AuthorizeQuery>(event);

  if (!query.client_id) {
    throw new BasicError("INPUT_REQUIRED", { message: "client_id is required" });
  }
  if (!query.state) {
    throw new BasicError("INPUT_REQUIRED", { message: "state is required" });
  }
  if (!query.code_challenge) {
    throw new BasicError("INPUT_REQUIRED", { message: "code_challenge is required" });
  }

  const result = authService.createAuthStart({
    extId: query.client_id,
    state: query.state,
    codeChallenge: query.code_challenge,
    redirectUri: query.redirect_uri || "",
  });

  return useApiResponse(result, "Auth URL generated");
}));

// POST /api/oauth2/authorize/complete -> Issue one-time authorization code
router.post("/authorize/complete", defineApiHandler(async (event) => {
  const { user } = useUser(event);
  const body = await readBody<AuthorizeCompleteBody>(event);

  if (!body?.client_id) {
    throw new BasicError("INPUT_REQUIRED", { message: "client_id is required" });
  }
  if (!body?.state) {
    throw new BasicError("INPUT_REQUIRED", { message: "state is required" });
  }
  if (!body?.code_challenge) {
    throw new BasicError("INPUT_REQUIRED", { message: "code_challenge is required" });
  }

  const result = await authService.issueAuthCode({
    userId: user.id,
    extId: body.client_id,
    state: body.state,
    codeChallenge: body.code_challenge,
  });

  return useApiResponse({
    code: result.code,
    expires_in: result.expiresIn,
    expires_at: result.expiresAt,
  }, "Authorization code issued");
}));


// POST /api/oauth/token -> Exchange authorization code or refresh token
router.post("/token", defineApiHandler(async (event) => {
  const body = await readBody<TokenRequestBody>(event);

  if (!body?.grant_type) {
    throw new BasicError("INPUT_REQUIRED", { message: "grant_type is required" });
  }
  if (!body?.client_id) {
    throw new BasicError("INPUT_REQUIRED", { message: "client_id is required" });
  }

  if (body.grant_type === "authorization_code") {
    if (!body.code) {
      throw new BasicError("INPUT_REQUIRED", { message: "code is required" });
    }
    if (!body.code_verifier) {
      throw new BasicError("INPUT_REQUIRED", { message: "code_verifier is required" });
    }

    const result = await authService.exchangeAuthCode({
      code: body.code,
      codeVerifier: body.code_verifier,
      extId: body.client_id,
    });

    return useApiResponse({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      expires_in: result.expiresIn,
      token_type: result.tokenType,
    }, "Token issued");
  }

  if (body.grant_type === "refresh_token") {
    if (!body.refresh_token) {
      throw new BasicError("INPUT_REQUIRED", { message: "refresh_token is required" });
    }

    const result = await authService.refreshTokens({
      refreshToken: body.refresh_token,
      extId: body.client_id,
    });

    return useApiResponse({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      expires_in: result.expiresIn,
      token_type: result.tokenType,
    }, "Token refreshed");
  }

  throw new BasicError("INPUT_INVALID_FORMAT", {
    message: "grant_type must be authorization_code or refresh_token",
  });
}));

// POST /api/oauth2/token/revoke -> Revoke a refresh token
router.post("/token/revoke", defineApiHandler(async (event) => {
  const body = await readBody<RevokeTokenBody>(event);

  if (!body?.client_id) {
    throw new BasicError("INPUT_REQUIRED", { message: "client_id is required" });
  }
  if (!body?.token) {
    throw new BasicError("INPUT_REQUIRED", { message: "token is required" });
  }

  await authService.revokeToken({
    token: body.token,
    extId: body.client_id,
  });

  return useApiResponse({ success: true }, "Token revoked successfully");
}));

export default useBase("/api/oauth2", router.handler);