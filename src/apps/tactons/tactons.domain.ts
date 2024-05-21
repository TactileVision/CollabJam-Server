import { TactonRecordingSession } from "../../types";
import { Logger } from "../../util/Logger";

export class RecordingTimer {
	intervalHandle: NodeJS.Timeout | null = null
	interval: number
	lastCallMs = 0
	currentMs = 0
	maxTimeMs = 0
	onTimeOver: (() => void) | null = null
	onTimerUpdate: ((currentMs: number) => void) | null = null

	isRunning(): boolean { return this.intervalHandle != null; }
	advanceTime(): number {
		const now = new Date().getTime()
		const deltaT = now - this.lastCallMs
		this.lastCallMs = now
		this.currentMs = this.currentMs + deltaT
		Logger.info(`${this.currentMs / 1000} seconds recorded`);
		if (this.currentMs >= this.maxTimeMs) {
			this.stop()
		}
		return this.currentMs
	}

	start() {
		Logger.info("Starting recording timer");
		this.currentMs = 0
		this.lastCallMs = new Date().getTime()
		if (this.intervalHandle == null) {
			this.intervalHandle = setInterval(() => { this.advanceTime() }, this.interval);
		} else {
			Logger.info("RecordingTimer already running");
		}

	}
	stop() {
		if (this.intervalHandle != null) {
			console.log("Stopping recording timer");
			if (this.onTimeOver != null) {
				this.onTimeOver()
			}
			clearInterval(this.intervalHandle);
			this.intervalHandle = null
		}
	}
	constructor(updateIntervalMs: number, maxTimeMs: number, callback?: (() => void)) {
		this.interval = updateIntervalMs
		this.maxTimeMs = maxTimeMs
		if (callback) {
			this.onTimeOver = callback
		}
	}
}


export const timers: Map<string, RecordingTimer> = new Map<string, RecordingTimer>()
export const recordingSessions: Map<string, TactonRecordingSession> = new Map<string, TactonRecordingSession>()

