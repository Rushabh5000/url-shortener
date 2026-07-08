import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { config } from "./config";

// Edge-safe (jose only, no node:crypto) so middleware can verify sessions.
const secret = new TextEncoder().encode(config.sessionSecret);
const ALG = "HS256";

export interface SessionClaims extends JWTPayload {
  email: string;
}

export async function createSessionToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify<SessionClaims>(token, secret, { algorithms: [ALG] });
  return payload;
}
