// import { UpdateRoomMode, WS_MSG_TYPE } from "../../../shared/websocketTypes";
import { UpdateRoomMode, WS_MSG_TYPE } from "@sharedTypes/websocketTypes";
import RoomModule from "./RoomModule";
import TactonModule from "./TactonModule";
import UserModule from "./UserModule";
import { RecordingTimer } from "../util/RecordingTimer";
import { setName } from "../util/tacton";
import { saveTactonAsJson } from "../util/FileStorage";
import { Room, User, InteractionMode } from "@sharedTypes/roomTypes";
import { Tacton, InstructionToClient } from "@sharedTypes/tactonTypes";
import { InstructionFromClient } from "src/types";
let recordingMetronome = new RecordingTimer(20, RoomModule.roomList, TactonModule.sessions, UserModule.wsRoomList)

/**
 * Generel Module to handle different abstract operations with the 3 modules
 */

const createSession = (room: Room): Room => {
    console.log("createSession")
    const roomId = RoomModule.createRoom(room);
    UserModule.createRoomRef(roomId)
    TactonModule.createRoomRef(roomId)

    if (RoomModule.roomList.size == 1 && !recordingMetronome.isRunning()) {
        recordingMetronome.start()
    }
    return RoomModule.getRoomInfo(roomId)!;
}

const updateSession = (roomAttributes: { id: string, name: string, description: string }, user: User, startTimeStamp: number) => {
    //update room information and participants list, return true if something is updated
    const needRoomUpdate = RoomModule.updateRoomInformation(roomAttributes.id, roomAttributes.name, roomAttributes.description)
    const needUserUpdate = UserModule.updateUser(roomAttributes.id, user);

    if (!needRoomUpdate && !needUserUpdate) return false;

    return true;
}

/**
 * method what one user enter a room initial
 * notify all users about new participant
 */
const enterSession = (ws: WebSocket, userID: string, userName: string, roomInfo: Room, recordings: Tacton[], startTimeStamp: number) => {
    const user = UserModule.addUserToParticipantList(ws, userID, userName, roomInfo.id);

    // MARK: Add user to the websocket list
    if (UserModule.wsRoomList.get(roomInfo.id) == undefined) {
        UserModule.wsRoomList.set(roomInfo.id, new Map<string, WebSocket>())
        console.log("Created websocket list for room " + roomInfo.id)
    }

    // Add users websocket to the map associated with the room 
    UserModule.wsRoomList.get(roomInfo.id)!.set(userID, ws)

    //its about entering should never return at this point
    if (user == undefined) return;


    const participantList = UserModule.getParticipants(roomInfo.id)
    console.log(participantList)
    //send the new user all data of the room, participants and his own userId
    ws.send(JSON.stringify({
        type: WS_MSG_TYPE.ENTER_ROOM_CLI,
        payload: { room: roomInfo, userId: userID, participants: participantList, recordings: recordings },
        startTimeStamp: startTimeStamp
    }))

    // console.log(roomInfo)
    // console.log("Sending new user info!!!")
    // broadCastMessage(roomInfo.id, WS_MSG_TYPE.UPDATE_USER_ACCOUNT_CLI, participantList, startTimeStamp);

    //update all user about the new person
    broadCastMessage(roomInfo.id,
        WS_MSG_TYPE.UPDATE_ROOM_CLI,
        { room: roomInfo, participants: participantList },
        startTimeStamp)
}

/**
 * method to remove one person of the room
 * if there are still participants --> notify the other users
 * if the room is now empty --> close the room
 */
const removeUserFromSession = (roomId: string, user: User, startTimeStamp: number) => {
    const userInRoom = UserModule.removeParticipantFromRoom(roomId, user.id);

    if (userInRoom !== undefined) {
        //Remove websocket connection

        const wsr = UserModule.wsRoomList.get(roomId)
        if (wsr !== undefined) {
            const remove = wsr.get(user.id)
            if (remove != undefined) {
                console.log("deleting the ws connetion to the user with the id" + user.id)
                wsr.delete(user.id)
            }
        }

        if (userInRoom == 0) {
            //TODO Add a mechanism to specify wheter a room is temporary or permanent
            // RoomModule.removeRoom(roomId);
            // UserModule.removeRoomRef(roomId)
            // TactonModule.removeRoomRef(roomId)

            if (RoomModule.roomList.size == 0 && recordingMetronome.isRunning()) {
                recordingMetronome.stop()
            }
        } else {
            console.log("Removed user from sesssion, updating cli")
            const participants = UserModule.getParticipants(roomId);
            broadCastMessage(roomId, WS_MSG_TYPE.UPDATE_USER_ACCOUNT_CLI, participants, startTimeStamp);
        }
    }

}

const updateRoomMode = (update: UpdateRoomMode, startTimeStamp: number) => {

    // const isValidModeChange  = RoomModule.
    // if(newMode == InteractionMode.Jamming)
    let res: UpdateRoomMode = { ...update }
    const r = RoomModule.getRoomInfo(update.roomId)
    if (r == undefined) return
    const rm = r.mode
    // if (RoomModule.updateRoomMode(update.roomId, update.newMode)) {
    console.log(`Changing interaction mode from ${rm} to ${update.newMode}`)
    const s = TactonModule.sessions.get(update.roomId)
    if (s == undefined) return

    if (rm == InteractionMode.Jamming) {
        // StartPlayback
        if (update.newMode == InteractionMode.Playback && update.tactonId != undefined) {

        } else if (update.newMode == InteractionMode.Recording) {

        } else {
            return
        }
    } else if (rm == InteractionMode.Recording) {
        if (update.newMode == InteractionMode.Jamming) {
            const isValidRecording = s.finishRecording()
            if (isValidRecording) {
                const t = s.history[s.history.length - 1]
                setName(t, s, r.recordingNamePrefix)

                broadCastMessage(update.roomId, WS_MSG_TYPE.GET_TACTON_CLI, t, startTimeStamp)
                saveTactonAsJson(update.roomId, t)
            }
        } else { return }

    } else { //rm ==Playback
        if (update.newMode == InteractionMode.Jamming) {
            //Stop Playback in Room by broacasting change to jamming mode to all clients. Let the client that initiated playback stop it
        } else { return }
    }
    console.log("Sending:")
    console.log(res)
    r.mode = res.newMode
    broadCastMessage(update.roomId, WS_MSG_TYPE.UPDATE_ROOM_MODE_CLI, res, startTimeStamp)
    // }

}

const changeDuration = (roomId: string, maxDuration: number, startTimeStamp: number) => {
    const needUpdate = RoomModule.updateMaxDuration(roomId, maxDuration)

    if (needUpdate == true)
        broadCastMessage(roomId, WS_MSG_TYPE.CHANGE_DURATION_CLI, maxDuration, startTimeStamp)
}

/**
 * generell method to notify all users of one specific room
 * @param roomId adress of the room, where the users shoud get the notification
 * @param type  message type
 * @param payload content of the message
 * @param startTimeStamp initial timestamp of the original request
 * @returns void
 */
const broadCastMessage = (roomId: string, type: WS_MSG_TYPE, payload: any, startTimeStamp: number) => {
    const wsList = UserModule.getWsRoomList(roomId);
    console.log("Connecting to " + wsList.size + " clients")
    if (wsList.size == 0) return;

    wsList.forEach((ws) => {
        ws.send(JSON.stringify({
            type: type,
            payload: payload,
            startTimeStamp: startTimeStamp
        }))
    })
    // console.log("Connecting to " + wsList.length + " clients")
    // if (wsList.length == 0) return;

    // for (let i = 0; i < wsList.length; i++) {
    //     wsList[i].send(JSON.stringify({
    //         type: type,
    //         payload: payload,
    //         startTimeStamp: startTimeStamp
    //     }))
    // };
}

/**
 * method to start the calculation of needed operations and distribute them
 * also to store the tacton in vtproto format
 */
const processInstructionsFromClient = (roomId: string, clienId: string, instructions: InstructionFromClient[], startTimeStamp: number) => {
    const clientInstruction: InstructionToClient[] = [];
    instructions.forEach(instruction => {
        const user = UserModule.getUser(roomId, clienId)
        clientInstruction.push({
            intensity: instruction.intensity,
            channels: instruction.channels,
            author: user,
            keyId: undefined
        })
    })
    if (clientInstruction.length == 0) return;
    broadCastMessage(roomId, WS_MSG_TYPE.SEND_INSTRUCTION_CLI, clientInstruction, startTimeStamp);

    const room = RoomModule.getRoomInfo(roomId);
    if (room == undefined) return;
    if (room.mode == InteractionMode.Recording) {
        TactonModule.addInstructionsToTactonRecording(roomId, clientInstruction)
    }
}


export default {
    createSession,
    broadCastMessage,
    enterSession,
    updateSession,
    removeUserFromSession,
    updateRoomMode,
    changeDuration,
    processInstructionsFromClient,
}