import { InstructionToClient } from "@sharedTypes/tactonTypes"
import { TactonRecordingSession } from "../types"
import { loadTactonsFromJSON } from "../util/FileStorage"


let sessions: Map<string, TactonRecordingSession> = new Map<string, TactonRecordingSession>()

const createRoomRef = (roomId: string) => {
    sessions.set(roomId, new TactonRecordingSession(loadTactonsFromJSON(roomId)))
    console.log(sessions)
}

const removeRoomRef = (roomId: string) => {
    sessions.delete(roomId)
}

const addInstructionsToTactonRecording = (roomId: string, clientInstrution: InstructionToClient[]) => {
    //Get current session
    const s = sessions.get(roomId)
    if (s == undefined) return
    const instructions = s.recording.instructions

    // Because there already is a instruction inside the array, we have to account for the time between instructions
    if (instructions.length > 0) {
        const timeDiff = new Date().getTime() - s.lastModified
        const parameter = {
            wait: {
                miliseconds: timeDiff
            }
        }
        instructions.push(parameter)
    }

    clientInstrution.forEach(clInstruct => {
        const parameter = {
            setParameter: {
                channelIds: clInstruct.channelIds,
                intensity: clInstruct.intensity
            }
        }
        instructions.push(parameter)
    });

    s.recording.instructions = instructions
    s.lastModified = new Date().getTime()
}



export default {
    createRoomRef,
    removeRoomRef,
    addInstructionsToTactonRecording,
    sessions
}