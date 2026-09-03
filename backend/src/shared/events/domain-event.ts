/**
 * Base for everything published on the in-process domain-event bus.
 *
 * Handlers in other bounded contexts subscribe with `@EventsHandler` and run
 * fire-and-forget after the triggering use case has returned (ADR-0002). The
 * concrete event classes live in `shared/contracts/` so a subscriber never has
 * to import the publisher's context.
 */
export abstract class DomainEvent {
  /** Wall-clock time the event was raised. Handy in logs and reconciliation. */
  readonly occurredAt: Date = new Date();
}
