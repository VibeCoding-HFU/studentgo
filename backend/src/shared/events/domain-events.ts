type DomainEvent =
  | { type: "admin.user.invited"; payload: { email: string; requestedById?: number | null; role: string } }
  | { type: "admin.user.updated"; payload: { userId: number } }
  | { type: "admin.user.deleted"; payload: { userId: number } }
  | { type: "change-request.created"; payload: { requestId: number; requestedById: number } }
  | { type: "change-request.approved"; payload: { requestId: number; reviewedById: number } }
  | { type: "change-request.rejected"; payload: { requestId: number; reviewedById: number } };

type DomainEventHandler<T extends DomainEvent["type"]> = (event: Extract<DomainEvent, { type: T }>) => void | Promise<void>;

const handlers = new Map<DomainEvent["type"], Array<(event: DomainEvent) => void | Promise<void>>>();

export function onDomainEvent<T extends DomainEvent["type"]>(type: T, handler: DomainEventHandler<T>) {
  const nextHandlers = handlers.get(type) ?? [];
  nextHandlers.push(handler as (event: DomainEvent) => void | Promise<void>);
  handlers.set(type, nextHandlers);
}

export async function emitDomainEvent(event: DomainEvent) {
  await Promise.all((handlers.get(event.type) ?? []).map((handler) => handler(event)));
}
