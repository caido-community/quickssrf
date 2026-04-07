import type { SDK } from "caido:plugin";
import type { Interaction, Result } from "shared";
import { err } from "shared";

import { getErrorMessage } from "../errors";
import { sessionStore } from "../stores";

export async function apiGetInteractions(
  _sdk: SDK,
  sessionId: string,
): Promise<Result<Interaction[]>> {
  const interactions = await sessionStore.getInteractions(sessionId);
  return { kind: "Ok", value: interactions };
}

export async function apiDeleteInteraction(
  _sdk: SDK,
  sessionId: string,
  interactionId: string,
): Promise<Result<void>> {
  try {
    await sessionStore.deleteInteraction(sessionId, interactionId);
    return { kind: "Ok", value: undefined };
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

export async function apiClearInteractions(
  _sdk: SDK,
  sessionId: string,
): Promise<Result<void>> {
  try {
    await sessionStore.clearInteractions(sessionId);
    return { kind: "Ok", value: undefined };
  } catch (e) {
    return err(getErrorMessage(e));
  }
}
