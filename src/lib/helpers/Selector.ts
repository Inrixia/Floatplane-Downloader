export class Selector {
	private static selector = 0;
	public static next<T>(arr: T[]): T {
		if (this.selector > arr.length - 1) this.selector = 0;
		return arr[this.selector++];
	}
}
