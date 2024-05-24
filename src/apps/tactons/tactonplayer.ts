import { InstructionSetParameter, InstructionToClient, InstructionWait, Tacton, TactonInstruction, isInstructionSetParameter, isInstructionWait } from "@sharedTypes/tactonTypes";
import { Logger } from "../../util/Logger";
export class TactonPlayer {
	instructionTimer: NodeJS.Timeout | null = null
	index: number = 0
	tacton: Tacton | null = null
	onOutput: ((instructions: InstructionToClient[]) => void) | null = null
	onTactonPlayerFinished: (() => void) | null = null
	onTactonPlayerStopped: (() => void) | null = null

	start(tacton: Tacton) {
		// this.startDate = new Date()
		this.tacton = tacton
		this.advance()
	}

	stop(isForced: boolean) {
		// if (isForced) {

		// 	if (this.onTactonPlayerStopped != null) {
		// 		this.onTactonPlayerStopped()
		// 	}

		// } else {

		if (this.onTactonPlayerFinished != null)
			this.onTactonPlayerFinished()
		// }

		if (this.instructionTimer != null) {
			clearTimeout(this.instructionTimer as NodeJS.Timeout);
			this.instructionTimer = null;
		}
		this.index = 0
		// this.tacton = null
	}
	advance() {
		// Logger.debug("[TactonPlayer] Advancing playback")
		if (this.tacton == null) {
			Logger.warn("No tacton selected, can not advance playback")
			return
		}
		Logger.debug(this.tacton.instructions[this.index])

		if (this.index == this.tacton.instructions.length) {
			Logger.debug("[TactonPlayer] Done");
			this.instructionTimer = null;
			this.stop(false)
			return;
		}

		if (isInstructionWait(this.tacton.instructions[this.index])) {
			const x = this.tacton.instructions[this.index] as InstructionWait;
			++this.index
			this.instructionTimer = setTimeout(() => {
				Logger.debug(`[TactonPlayer] Waiting for ${x.wait.miliseconds} ms`);
				this.deferNextInstruction()
			}
				, x.wait.miliseconds);
		}
		else if (isInstructionSetParameter(this.tacton.instructions[this.index])) {
			// Logger.debug(`[TactonPlayer] Set parameter instruction`);
			const x = this.tacton.instructions[this.index] as InstructionSetParameter;
			const c: number[] = x.setParameter.channels;

			if (this.onOutput != null)
				this.onOutput([{
					keyId: "REC",
					channels: c,
					intensity: x.setParameter.intensity,
					author: { id: "server", color: "#000000", name: "TactonPlayer", muted: false },
				}])

			++this.index
			this.advance();
		}


	}

	deferNextInstruction() {
		this.advance();
	}

}