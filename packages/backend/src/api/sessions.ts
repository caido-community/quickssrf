import type { SDK } from "caido:plugin";
import type { Interaction, Result, Session } from "shared";

import {
  createSession,
  deleteSession,
  getActiveSessionIds,
  isSessionActive,
  pollSession,
  stopSession,
  updateSessionTitle,
} from "../services";
import { sessionStore } from "../stores";

export async function apiCreateSession(
  _sdk: SDK,
  providerId?: string,
): Promise<Result<Session>> {
  return createSession(providerId);
}

export async function apiGetSessions(_sdk: SDK): Promise<Result<Session[]>> {
  const sessions = await sessionStore.getSessions();
  return { kind: "Ok", value: sessions };
}

export async function apiGetSession(
  _sdk: SDK,
  sessionId: string,
): Promise<Result<Session>> {
  const session = await sessionStore.getSession(sessionId);
  if (session === undefined) {
    return { kind: "Error", error: `Session not found: ${sessionId}` };
  }
  return { kind: "Ok", value: session };
}

export async function apiDeleteSession(
  _sdk: SDK,
  sessionId: string,
): Promise<Result<void>> {
  return deleteSession(sessionId);
}

export async function apiStopSession(
  _sdk: SDK,
  sessionId: string,
): Promise<Result<void>> {
  return stopSession(sessionId);
}

export function apiResumeSession(_sdk: SDK, sessionId: string): Result<void> {
  if (isSessionActive(sessionId)) {
    return { kind: "Error", error: "Session is already active" };
  }
  return {
    kind: "Error",
    error: "Cannot resume a stopped session. Create a new one.",
  };
}

export async function apiPollSession(
  _sdk: SDK,
  sessionId: string,
): Promise<Result<Interaction[]>> {
  return pollSession(sessionId);
}

export async function apiUpdateSessionTitle(
  _sdk: SDK,
  sessionId: string,
  title: string,
): Promise<Result<Session>> {
  return updateSessionTitle(sessionId, title);
}

export function apiGetActiveSessionIds(_sdk: SDK): Result<string[]> {
  return { kind: "Ok", value: getActiveSessionIds() };
}
