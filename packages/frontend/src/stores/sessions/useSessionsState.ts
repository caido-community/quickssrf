import type { Session } from "shared";
import { reactive } from "vue";

type SessionsState =
  | { type: "Idle" }
  | { type: "Loading" }
  | { type: "Error"; error: string }
  | { type: "Success"; sessions: Session[] };

type Message =
  | { type: "Start" }
  | { type: "Error"; error: string }
  | { type: "Success"; sessions: Session[] }
  | { type: "AddSession"; session: Session }
  | { type: "UpdateSession"; session: Session }
  | { type: "DeleteSession"; sessionId: string }
  | { type: "Clear" };

type Context = { state: SessionsState };

function processIdle(
  state: SessionsState & { type: "Idle" },
  message: Message,
): SessionsState {
  if (message.type === "Start") return { type: "Loading" };
  return state;
}

function processLoading(
  _state: SessionsState & { type: "Loading" },
  message: Message,
): SessionsState {
  if (message.type === "Error") return { type: "Error", error: message.error };
  if (message.type === "Success")
    return { type: "Success", sessions: message.sessions };
  return _state;
}

function processError(
  state: SessionsState & { type: "Error" },
  message: Message,
): SessionsState {
  if (message.type === "Start") return { type: "Loading" };
  if (message.type === "Clear") return { type: "Idle" };
  return state;
}

function processSuccess(
  state: SessionsState & { type: "Success" },
  message: Message,
): SessionsState {
  switch (message.type) {
    case "AddSession":
      return { ...state, sessions: [...state.sessions, message.session] };
    case "UpdateSession":
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === message.session.id ? message.session : s,
        ),
      };
    case "DeleteSession":
      return {
        ...state,
        sessions: state.sessions.filter((s) => s.id !== message.sessionId),
      };
    case "Success":
      return { type: "Success", sessions: message.sessions };
    case "Start":
      return { type: "Loading" };
    case "Clear":
      return { type: "Idle" };
    default:
      return state;
  }
}

export function useSessionsState() {
  const context: Context = reactive({ state: { type: "Idle" } });

  const getState = () => context.state;

  const send = (message: Message) => {
    const curr = context.state;
    switch (curr.type) {
      case "Idle":
        context.state = processIdle(curr, message);
        break;
      case "Loading":
        context.state = processLoading(curr, message);
        break;
      case "Error":
        context.state = processError(curr, message);
        break;
      case "Success":
        context.state = processSuccess(curr, message);
        break;
    }
  };

  return { getState, send };
}
