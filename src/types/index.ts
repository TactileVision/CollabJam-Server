import { v4 as uuidv4 } from "uuid";
import { isWellFormed, processTactonInstructions } from "../util/tacton";
import { TactileTask, Tacton, TactonInstruction, impl } from "@sharedTypes/tactonTypes";



export interface ServerInstruction extends TactileTask {
    keyId: string
}

export interface Intensity {
    keyId: string,
    clientId: string,
    intensity: number
}

export interface Channel {
    id: number,
    intensityList: Intensity[],
}

export class TactonRecording {
    uuid: string = uuidv4().toString()
    name: string = ""
    favorite: boolean = false
    recordDate: Date | undefined = undefined
    instructions: TactonInstruction[] = [] as TactonInstruction[]

    getTacton(): Tacton {
        return impl<Tacton>({
            uuid: this.uuid,
            metadata: {
                name: this.name,
                favorite: this.favorite,
                recordDate: this.recordDate == undefined ? new Date() : this.recordDate,
            },
            instructions: this.instructions
        })

    }
}


export class TactonRecordingSession {
    recording: TactonRecording = new TactonRecording()
    startedRecording: boolean = false
    history: Tacton[] = [] as Tacton[]
    lastModified: number = new Date().getTime()

    constructor(history: Tacton[]) {
        this.history = history
    }

    updateModificationDate(): void {
        this.lastModified = new Date().getTime()
    }
    // finishRecording(): Tacton {
    finishRecording(): boolean {
        const t = this.recording.getTacton()
        processTactonInstructions(t, this.lastModified)
        const isValid = isWellFormed(t)
        if (isValid) {
            this.history.push(t)
        }
        this.recording = new TactonRecording()
        this.updateModificationDate()
        return isValid
    }
}
export interface InstructionFromClient {
    keyId: string;
    channels: number[];
    intensity: number;
};