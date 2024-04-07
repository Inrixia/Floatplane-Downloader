export class Semaphore {
	private avalibleSlots: number;
	private readonly Queue: (() => void)[] = [];

	constructor(slots: number) {
		this.avalibleSlots = slots;
	}

	public async obtain() {
		// If there is an available request slot, proceed immediately
		if (this.avalibleSlots > 0) return this.avalibleSlots--;

		// Otherwise, wait for a request slot to become available
		return new Promise((r) => this.Queue.push(() => r(this.avalibleSlots--)));
	}

	public release(): void {
		this.avalibleSlots++;
		// If there are queued requests, resolve the first one in the queue
		this.Queue.shift()?.();
	}
}
