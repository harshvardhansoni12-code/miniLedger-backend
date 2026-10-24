const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Session = {
  userId: string;
  expiresAt: number;
};

const sessions = new Map<string, Session>();

export function createSession(token: string, userId: string): void {
  sessions.set(token, {
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
}

export function getSessionUserId(token: string): string | undefined {
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return undefined;
  }

  return session.userId;
}
