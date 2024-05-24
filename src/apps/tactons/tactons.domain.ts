import { InstructionToClient, Tacton, TactonInstruction } from "@sharedTypes/tactonTypes";
import { Logger } from "../../util/Logger";
import { UpdateRoomMode } from "@sharedTypes/websocketTypes";
import { InteractionMode } from "@sharedTypes/roomTypes";
import { v4 as uuidv4 } from "uuid";
import { removePauseFromEnd, turnOffAllOutputs } from "../../util/tacton";
import { TactonPlayer } from "./tactonplayer";
import { getTacton } from "../rooms/rooms.data-access";
export interface TactonProcessingRules {
	allowInputOnPlayback: boolean,
	startRecordingOn: "firstInput" | "immediate",
	loop: boolean,
	maxRecordLength: number

}

export const getDefaultRules = (): TactonProcessingRules => {

	return {
		allowInputOnPlayback: false,
		startRecordingOn: "firstInput",
		loop: false,
		maxRecordLength: 5000
	}
}
export class TactonProcessor {

	recorder: TactonInstructionRecorder = new TactonInstructionRecorder()
	timer: RecordingTimer = new RecordingTimer()
	rules: TactonProcessingRules = getDefaultRules()
	mode: UpdateRoomMode = { newMode: InteractionMode.Jamming, roomId: "", tactonId: undefined }
	player: TactonPlayer = new TactonPlayer()

	onOutput: ((instructions: InstructionToClient[]) => void) | null = null
	onNewInteractionMode: ((newMode: UpdateRoomMode) => void) | null = null
	onRecordingFinished: ((tacton: TactonInstruction[]) => void) | null = null
	onPlaybackFinished: (() => void) | null = null
	// onTactonPlaybackRequested: ((tactonId: string) => Tacton) | null = null


	setRules(rules: TactonProcessingRules) { this.rules = rules }

	inputInstruction(instructions: InstructionToClient[]) {
		if (this.onOutput == null) return
		if (this.mode.newMode == InteractionMode.Recording) {
			if (!this.recorder.isRecording && this.rules.startRecordingOn == "firstInput") {
				this.startRecording()
				this.recorder.isRecording = true
			}
			if (this.recorder.isRecording) {
				this.recorder.record(instructions)
			}
		}
		this.onOutput(instructions)
	}

	async inputInteractionMode(currentMode: InteractionMode, req: UpdateRoomMode) {
		Logger.info("New interaction mode requested!!!")
		console.log(currentMode)
		console.log(req.newMode)
		if (currentMode == InteractionMode.Recording) {
			Logger.info("Stopping recording")
			this.timer.stopTimer()
		} else if (currentMode == InteractionMode.Playback) {
			this.player.stop()
			Logger.info("Stopping playback")
		}


		// RoomDB.setRecordMode(req.roomId, req.newMode)
		if (req.newMode == InteractionMode.Recording) {
			if (this.rules.startRecordingOn == "immediate") {
				this.startRecording()
			}
		} else if (req.newMode == InteractionMode.Playback) {
			console.log("New mode is  playback")
			console.log(req)
			if (req.tactonId == undefined) {
				Logger.error(`No tacton id provided for room ${req.roomId}`)
			} else {
				const t = await getTacton(req.tactonId)
				console.log(t)
				if (t != undefined) {
					console.log("Starting playback of tacton alder")
					this.player.start(t)
				}
				//TODO Implement playback through intervals, pass those inputs into the recorder as well (for overdubbing)
			}
		} else {
			Logger.info("Lets jam again")
		}

		this.mode = req
		if (this.onNewInteractionMode == null) return
		this.onNewInteractionMode(req)

	}

	private processRecording() {
		turnOffAllOutputs(this.recorder.instructions, this.recorder.lastModified);
		removePauseFromEnd(this.recorder.instructions);
	}
	//Gets called when the timer stops by calling this.timer.stop()
	private finishRecording() {
		this.processRecording()
		if (this.onRecordingFinished != null)
			this.onRecordingFinished(this.recorder.stop())
		if (this.onNewInteractionMode != null) {
			this.mode.newMode = InteractionMode.Jamming
			this.onNewInteractionMode(this.mode)
		}

		this.recorder.reset()
	}

	startRecording() {
		Logger.info("Starting Record")

		this.timer.startTimer(1000, this.rules.maxRecordLength, () => {
			this.finishRecording()
		})
	}

	constructor() {
		this.player.onOutput = ((i) => {
			this.inputInstruction(i)
			if (this.onOutput != null)
				this.onOutput(i)
			Logger.debug("[TactonProccessor] Outupt from player!")
		})
		this.player.onPlaybackFinished = (() => {
			if (this.onPlaybackFinished != null)
				this.onPlaybackFinished()
			Logger.debug("[TactonProccessor] Outupt from player stopped!")

			//TODO What happens depends on the current mode, 
			/* 
			overdubbing --> continue
			playback --> stop
			
			*/
		})
	}

}


export class TactonInstructionRecorder {
	reset() {
		this.instructions = []
		this.isRecording = false;
	}
	recordDate: Date | undefined = undefined
	lastModified: number = new Date().getTime()
	isRecording: boolean = false
	instructions: TactonInstruction[] = [] as TactonInstruction[]

	record(newInstructions: InstructionToClient[]) {
		this.isRecording = true;
		if (this.instructions.length > 0) {
			const timeDiff = new Date().getTime() - this.lastModified
			const parameter = {
				wait: {
					miliseconds: timeDiff
				}
			}
			this.instructions.push(parameter)
		}
		newInstructions.forEach(i => {
			const parameter = {
				setParameter: {
					channels: i.channels,
					intensity: i.intensity
				}
			}
			this.instructions.push(parameter)
		});
		this.lastModified = new Date().getTime()
	}

	stop(): TactonInstruction[] {
		this.isRecording = false;
		return this.instructions
	}
}

export class RecordingTimer {
	intervalHandle: NodeJS.Timeout | null = null
	interval = 20 //updateInterval
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

		if (this.currentMs >= this.maxTimeMs && this.maxTimeMs != 0) {
			this.stopTimer()
		}
		return this.currentMs
	}

	startTimer(updateIntervalMs: number, maxTimeMs: number, onTimeOver?: (() => void)) {
		this.interval = updateIntervalMs;
		this.maxTimeMs = maxTimeMs;
		if (onTimeOver) {
			this.onTimeOver = onTimeOver
		}

		Logger.info("Starting recording timer");
		this.currentMs = 0
		this.lastCallMs = new Date().getTime()
		if (this.intervalHandle == null) {
			this.intervalHandle = setInterval(() => { this.advanceTime() }, this.interval);
		} else {
			Logger.info("RecordingTimer already running");
		}

	}
	stopTimer() {
		if (this.intervalHandle != null) {
			console.log("Stopping timer");
			clearInterval(this.intervalHandle);
			this.intervalHandle = null
			if (this.onTimeOver != null) {
				this.onTimeOver()
			}
		}
	}
}


export const assembleTacton = (instructions: TactonInstruction[], name: string): Tacton => {
	return {
		uuid: uuidv4().toString(),
		instructions: instructions,
		metadata: {
			name: name,
			favorite: false,
			bodyTags: [],
			customTags: [],
			description: "",
			recordDate: new Date()
		}
	} as Tacton
}

export const appendCounterToPrefixName = (tactons: Tacton[], prefix: string): string => {
	const tactonsWithSamePrefix = tactons.filter(e => {
		return e.metadata.name.startsWith(prefix + "-") == true
	})
	let len = tactonsWithSamePrefix.length.toString()
	return prefix + "-" + len
}


export const tactonProcessors: Map<string, TactonProcessor> = new Map<string, TactonProcessor>()
