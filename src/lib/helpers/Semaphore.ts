export class Semaphore {
	private avalibleSlots: number;
	private readonly _queue: (() => void)[];

	constructor(slots: number) {
		this.avalibleSlots = slots;
		this._queue = [];
	}

	public async obtain() {
		// If there is an available request slot, proceed immediately
		if (this.avalibleSlots > 0) return this.avalibleSlots--;

		// Otherwise, wait for a request slot to become available
		return new Promise((r) => this._queue.push(() => r(this.avalibleSlots--)));
	}

	public release(): void {
		this.avalibleSlots++;
		// If there are queued requests, resolve the first one in the queue
		this._queue.shift()?.();
	}
}
