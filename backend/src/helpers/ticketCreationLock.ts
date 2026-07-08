const ticketCreationLocks = new Map<string, Promise<void>>();

export const withTicketCreationLock = async <T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> => {
  while (ticketCreationLocks.has(key)) {
    await ticketCreationLocks.get(key);
  }

  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  ticketCreationLocks.set(key, gate);

  try {
    return await fn();
  } finally {
    ticketCreationLocks.delete(key);
    release();
  }
};

export default withTicketCreationLock;
