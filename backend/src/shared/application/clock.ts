/** Port: the current time. Injected so use cases stay deterministic in tests. */
export abstract class Clock {
  abstract now(): Date;
}
