import { InstructionToClient, Tacton, TactonInstruction } from "@sharedTypes/tactonTypes";
import { Logger } from "../../util/Logger";
import { UpdateRoomMode } from "@sharedTypes/websocketTypes";
import { InteractionMode } from "@sharedTypes/roomTypes";
import { v4 as uuidv4 } from "uuid";
import { removePauseFromEnd, turnOffAllOutputs } from "../../util/tacton";
import { TactonPlayer } from "./tactonplayer";
import { getTacton } from "../rooms/rooms.data-access";
import { mergeTactons } from "./merge";
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
	recordingTimer: RecordingTimer = new RecordingTimer()
	rules: TactonProcessingRules = getDefaultRules()
	mode: UpdateRoomMode = { newMode: InteractionMode.Jamming, roomId: "", tactonId: undefined }
	player: TactonPlayer = new TactonPlayer()

	onOutput: ((instructions: InstructionToClient[]) => void) | null = null
	onNewInteractionMode: ((newMode: UpdateRoomMode) => void) | null = null
	onRecordingFinished: ((recordedInstructions: TactonInstruction[]) => void) | null = null
	onPlaybackFinished: (() => void) | null = null
	// onOverdubbingFinished: ((recordedInstructions: TactonInstruction[], baseInstructions: TactonInstruction[]))
	baseTacton: Tacton | null = null;
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
				this.recorder.record(instructions, false)
			}
		}
		else if (this.mode.newMode == InteractionMode.Overdubbing) {

			if (this.recorder.isRecording) {
				this.recorder.record(instructions, true)
			}
		}
		this.onOutput(instructions)
	}

	async inputInteractionMode(currentMode: InteractionMode, req: UpdateRoomMode) {
		Logger.info("New interaction mode requested!!!")
		console.log(currentMode)
		console.log(req.newMode)
		if (currentMode == req.newMode) return

		/* TODO Write some kind of handler classes that make if/else clauses obsolete 
		onLeavingMode()
		onEnteringMode()
		*/

		//Leaving the mode
		if (currentMode == InteractionMode.Recording) {
			Logger.info("Stopping recording")
			this.recordingTimer.stopTimer()
		} else if (currentMode == InteractionMode.Playback) {
			this.player.stop(true)
			Logger.info("Stopping playback")
		} else if (currentMode == InteractionMode.Overdubbing) {
			Logger.info("Stopping overdubbing")
			this.player.stop(true)
			this.recordingTimer.stopTimer()
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
		} else if (req.newMode == InteractionMode.Overdubbing) {
			if (req.tactonId == undefined) {
				Logger.error(`No tacton id provided for room ${req.roomId}, switching to record mode`)
				this.inputInteractionMode(currentMode, { newMode: InteractionMode.Recording, roomId: req.roomId, tactonId: req.tactonId })
			} else {
				const t = await getTacton(req.tactonId)
				console.log(t)
				if (t != undefined) {
					console.log("Starting Overdubbing")
					this.baseTacton = t
					this.player.start(t)
					if (!this.recorder.isRecording) {
						this.startRecording()
						this.recorder.lastModified = new Date().getTime()
						this.recorder.isRecording = true
					}
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
		Logger.info(this.player.tacton)
		Logger.info(this.mode)
		// TODO if we are in overdubbing mode, we have to 
		let t: TactonInstruction[] = []
		if (this.mode.newMode == InteractionMode.Overdubbing && this.player.tacton != null) {
			Logger.info("Merging tactons")
			const r = this.recorder.stop()
			console.log(r)
			t = mergeTactons(this.recorder.stop(), this.player.tacton.instructions)
		} else {
			// Logger.info("not merging tactons")
			t = this.recorder.stop()
		}
		if (this.onRecordingFinished != null)
			this.onRecordingFinished(t)
		if (this.onNewInteractionMode != null) {
			this.mode.newMode = InteractionMode.Jamming
			this.onNewInteractionMode(this.mode)
		}

		this.recorder.reset()
	}

	startRecording() {
		Logger.info("Starting Record")

		const onRecordingTimerOver = () => {
			this.finishRecording()
		}
		this.recordingTimer.startTimer(500, this.rules.maxRecordLength, onRecordingTimerOver)
	}

	constructor() {
		this.player.onOutput = ((i) => {
			// this.inputInstruction(i)
			if (this.onOutput != null)
				this.onOutput(i)
			// Logger.debug("[TactonProccessor] Outupt from player!")
		})
		this.player.onTactonPlayerFinished = (() => {
			console.log("TactonPlayback finished, stopping playback")
			if (this.mode.newMode == InteractionMode.Overdubbing) {
				console.log("Stopping recording as well!")
				this.recordingTimer.stopTimer()
			}
			if (this.onPlaybackFinished != null)
				this.onPlaybackFinished()
			// Logger.debug("[TactonProccessor] Outupt from player stopped!")
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

	record(newInstructions: InstructionToClient[], startImmediately: boolean) {
		this.isRecording = true;
		if (this.instructions.length > 0 || startImmediately) {
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
