import { InstructionToClient, TactonInstruction } from "@sharedTypes/tactonTypes";
import { Logger } from "../../../../util/Logger";
import {v4 as uuidv4} from 'uuid';

export class TactonInstructionRecorder {
	reset() {
		this.instructions = []
		this.isRecording = false;
		this.activeUuids.clear();
	}
	recordDate: Date | undefined = undefined
	lastModified: number = new Date().getTime()
	isRecording: boolean = false
	instructions: TactonInstruction[] = [] as TactonInstruction[]
	activeUuids: Map<number, string> = new Map<number, string>()
	setStartPoint() {
		Logger.info("[TactonInstructionRecorder] Setting start point")
		this.lastModified = new Date().getTime()
	}

	//call this when a instruction is received
	// TODO activeUUids should call clear() at the start, but record() is used more then once
	// were is the initial call to record, at this point, the map should be cleared
	record(newInstructions: InstructionToClient[], startImmediately: boolean): void {				
		this.isRecording = true;
		const timeDiff = new Date().getTime() - this.lastModified
		const parameter = {
			wait: {
				miliseconds: timeDiff
			}
		}
		this.instructions.push(parameter);
		
		newInstructions.forEach(i => {
			if (i.intensity > 0) {
				// start of a new block
				const uuids: string[] = i.channels.map(ch => {
					const uuid: string = uuidv4();
					this.activeUuids.set(ch, uuid);
					Logger.info(`block-start at channel ${ch} with uuid: ${uuid}`);
					return uuid;
				});
		
				const parameter = {
					setParameter: {
						channels: i.channels,
						intensity: i.intensity,
						uuids: uuids,
						groupUuids: [null]
					}
				}
				this.instructions.push(parameter);
			} else {
				// end of block
				const uuids: string[] = i.channels.map(ch => {
					const uuid: string | undefined = this.activeUuids.get(ch);
					if (!uuid) {
						Logger.error(`No active block for channel ${ch}`);
						return ''
					} else {
						this.activeUuids.delete(ch);
						Logger.info(`block-end at channel ${ch} with uuid: ${uuid}`);
						return uuid;
					}
				})

				const parameter = {
					setParameter: {
						channels: i.channels,
						intensity: i.intensity,
						uuids: uuids,
						groupUuids: [null]
					}
				}
				this.instructions.push(parameter);
			}
		});
		this.lastModified = new Date().getTime();
	}
	stop(): TactonInstruction[] {
		this.isRecording = false;
		return this.instructions
	}
}

