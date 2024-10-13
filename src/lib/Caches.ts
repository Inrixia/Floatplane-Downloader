import type { JSONSafeValue } from "@inrixia/db";
import { writeFile } from "fs/promises";
import { readFileSync } from "fs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FetchItem<T> = (id: string, options?: any) => Promise<T>;

export class ItemCache<T extends JSONSafeValue> {
	private cache: Record<string, { i: T; t: number }>;
	private cachePath: string;
	private fetchItem: FetchItem<T>;
	private expireAgeMs: number;

	constructor(cachePath: string, fetchItem: FetchItem<T>, expireAgeMins: number = 24 * 60) {
		this.cachePath = cachePath;
		this.fetchItem = fetchItem;
		this.expireAgeMs = expireAgeMins * 60 * 1000;

		try {
			this.cache = JSON.parse(readFileSync(this.cachePath).toString());
		} catch {
			this.cache = {};
		}
	}

	private async writeOut() {
		try {
			await writeFile(this.cachePath, JSON.stringify(this.cache));
		} catch {
			return;
		}
	}

	private async set(key: string, i: T) {
		this.cache[key] = { t: Date.now(), i };
		await this.writeOut();
		return i;
	}

	private deepCopy(i: T): T {
		return JSON.parse(JSON.stringify(i));
	}

	public async get(id: string, options?: unknown, noCache: boolean = false): Promise<T> {
		const key = options !== undefined ? JSON.stringify([id, options]) : id;
		if (noCache) {
			delete this.cache[key];
			return this.get(id, options);
		}
		const cacheItem = this.cache[key];
		if (cacheItem !== undefined) {
			// Remove expired entries older than expireAge
			if (Date.now() - cacheItem.t > this.expireAgeMs) {
				delete this.cache[key];
				return this.get(id, options);
			}
			return this.deepCopy(cacheItem.i);
		}
		return this.set(key, await this.fetchItem(id, options));
	}
}
