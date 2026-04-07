import path from "path";

import type { Interaction, Session, SessionStatus } from "shared";

import { SessionNotFoundError } from "../errors";
import type { ProviderSession } from "../providers/types";
import { requireSDK } from "../sdk";

import {
  deleteJson,
  getBasePath,
  listJsonFiles,
  readJson,
  writeJson,
} from "./baseStorage";

type SessionFile = {
  session: Session;
  interactions: Interaction[];
  providerSession?: ProviderSession;
};

class SessionStoreClass {
  private getSessionsDir(): string {
    return path.join(getBasePath(), "sessions");
  }

  private getSessionPath(sessionId: string): string {
    return path.join(this.getSessionsDir(), `${sessionId}.json`);
  }

  private async loadFile(sessionId: string): Promise<SessionFile | undefined> {
    return readJson<SessionFile>(this.getSessionPath(sessionId));
  }

  private async saveFile(file: SessionFile): Promise<void> {
    await writeJson(this.getSessionPath(file.session.id), file);
  }

  async getSessions(): Promise<Session[]> {
    const files = await listJsonFiles<SessionFile>(this.getSessionsDir());
    return files
      .map((f) => f.data.session)
      .sort((a, b) => {
        const timeDiff =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        return a.id.localeCompare(b.id);
      });
  }

  async getSession(id: string): Promise<Session | undefined> {
    const file = await this.loadFile(id);
    return file?.session;
  }

  async getProviderSession(id: string): Promise<ProviderSession | undefined> {
    const file = await this.loadFile(id);
    return file?.providerSession;
  }

  async addSession(
    session: Session,
    providerSession?: ProviderSession,
  ): Promise<void> {
    await this.saveFile({ session, interactions: [], providerSession });

    const sdk = requireSDK();
    sdk.api.send("session:created", session);
  }

  async updateSessionStatus(
    id: string,
    status: SessionStatus,
  ): Promise<Session> {
    const file = await this.loadFile(id);
    if (file === undefined) throw new SessionNotFoundError(id);

    file.session.status = status;
    await this.saveFile(file);

    const sdk = requireSDK();
    sdk.api.send("session:updated", file.session);
    return file.session;
  }

  async updateSessionTitle(id: string, title: string): Promise<Session> {
    const file = await this.loadFile(id);
    if (file === undefined) throw new SessionNotFoundError(id);

    file.session.title = title;
    await this.saveFile(file);

    const sdk = requireSDK();
    sdk.api.send("session:updated", file.session);
    return file.session;
  }

  async deleteSession(id: string): Promise<void> {
    const file = await this.loadFile(id);
    if (file === undefined) throw new SessionNotFoundError(id);

    await deleteJson(this.getSessionPath(id));

    const sdk = requireSDK();
    sdk.api.send("session:deleted", id);
  }

  async getInteractions(sessionId: string): Promise<Interaction[]> {
    const file = await this.loadFile(sessionId);
    return file?.interactions ?? [];
  }

  async addInteractions(
    sessionId: string,
    interactions: Interaction[],
  ): Promise<void> {
    const file = await this.loadFile(sessionId);
    if (file === undefined) throw new SessionNotFoundError(sessionId);

    const existingKeys = new Set(
      file.interactions.map(
        (i) => `${i.uniqueId}:${i.timestamp}:${i.protocol}`,
      ),
    );

    const newInteractions = interactions.filter(
      (i) => !existingKeys.has(`${i.uniqueId}:${i.timestamp}:${i.protocol}`),
    );

    if (newInteractions.length === 0) return;

    const startIndex = file.interactions.length;
    for (let i = 0; i < newInteractions.length; i++) {
      newInteractions[i]!.index = startIndex + i;
    }
    file.interactions.push(...newInteractions);
    file.session.interactionCount = file.interactions.length;
    await this.saveFile(file);

    const sdk = requireSDK();
    sdk.api.send("interaction:received", {
      sessionId,
      interactions: newInteractions,
    });
    sdk.api.send("session:updated", file.session);
  }

  async deleteInteraction(
    sessionId: string,
    interactionId: string,
  ): Promise<void> {
    const file = await this.loadFile(sessionId);
    if (file === undefined) throw new SessionNotFoundError(sessionId);

    const index = file.interactions.findIndex((i) => i.id === interactionId);
    if (index !== -1) {
      file.interactions.splice(index, 1);
      file.session.interactionCount = file.interactions.length;
      await this.saveFile(file);
    }
  }

  async clearInteractions(sessionId: string): Promise<void> {
    const file = await this.loadFile(sessionId);
    if (file === undefined) throw new SessionNotFoundError(sessionId);

    file.interactions = [];
    file.session.interactionCount = 0;
    await this.saveFile(file);
  }
}

export const sessionStore = new SessionStoreClass();
