/** Counting semaphore: at most `max` tasks run at once, the rest wait in FIFO order. */
export class Semaphore {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly max: number) {
    if (!Number.isInteger(max) || max < 1) throw new RangeError("Semaphore max must be an integer >= 1");
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) await new Promise<void>((resolve) => this.waiting.push(resolve));
    else this.active += 1;
    try {
      return await task();
    } finally {
      // Hand the slot straight to the next waiter (active stays the same) or free it.
      const next = this.waiting.shift();
      if (next) next();
      else this.active -= 1;
    }
  }
}
