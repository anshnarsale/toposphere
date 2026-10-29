type Listener<T> = (data: T) => void;

export class TypedEventEmitter<Events extends Record<string, unknown>> {
  private listeners: Partial<{ [K in keyof Events]: Listener<Events[K]>[] }> = {};

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    const arr = this.listeners[event];
    if (arr) this.listeners[event] = arr.filter(l => l !== listener) as typeof arr;
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const arr = this.listeners[event];
    if (arr) arr.forEach(l => l(data));
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}
