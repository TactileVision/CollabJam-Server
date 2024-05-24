import { InteractionMode, User } from "@sharedTypes/roomTypes";
import { defaultColorUsers } from "../types/defaultColorUsers";
import RoomModule from "./RoomModule";
import StoreManager from "./StoreManager";

//contain all metadata of one user
let participantList: Map<string, User[]> = new Map<string, User[]>();
//custom array to distribute the user colours equally
let usedColorsList: Map<string, number[]> = new Map<string, number[]>();
//contain ws objects to communicate wit the clients
export let wsRoomList: Map<string, Map<string, WebSocket>> = new Map<string, Map<string, WebSocket>>();

const createRoomRef = (roomId: string) => {
    console.log("createRoomRef")
    participantList.set(roomId, []);
    usedColorsList.set(roomId, new Array(defaultColorUsers.length).fill(0));
    wsRoomList.set(roomId, new Map<string, WebSocket>);
}

const removeRoomRef = (roomId: string) => {
    participantList.delete(roomId);
    usedColorsList.delete(roomId);
    wsRoomList.delete(roomId);
}

const getUser = (roomId: string, userId: string): User | undefined => {
    let user: User | undefined = undefined;
    let participants = participantList.get(roomId);
    if (participants !== undefined) {
        for (let i = 0; i < participants.length; i++) {
            if (participants[i].id == userId) {
                user = participants[i];
                break;
            }
        }
    }
    return user
}

const getParticipants = (roomId: string): User[] => {
    const participants = participantList.get(roomId);
    if (participants == undefined)
        return [];

    return participants;
}

const getWsRoomList = (roomId: string): Map<string, WebSocket> => {
    const wList = wsRoomList.get(roomId);
    if (wList == undefined)
        return new Map<string, WebSocket>();

    return wList;
}

/**
* calculate the new color for new user
*/
const calculateUserColor = (roomId: string, amountOfParticipants: number): string => {
    const usedColors = usedColorsList.get(roomId)!;
    let colorId = 0;
    for (let i = 0; i < usedColors.length - 1; i++) {
        if (usedColors[i] > usedColors[i + 1]) {
            colorId = i + 1;
            break;
        }
        if (usedColors[i] < usedColors[i + 1]) {
            colorId = i;
            break;
        }
    }

    usedColors[colorId]++;
    return defaultColorUsers[colorId];
}

/**
* update usedColorsList, because user left the room
*/
const resetUserColors = (roomId: string, participColor: string) => {
    const usedColors = usedColorsList.get(roomId);
    if (usedColors !== undefined) {
        for (let x = 0; x < defaultColorUsers.length; x++) {
            if (participColor == defaultColorUsers[x]) {
                usedColors[x]--;
                break;
            }
        }
    }
}

/**
* method to change the username of specific user
*/
const updateUser = (roomId: string, user: User): boolean => {
    let updated = false;
    const participants = participantList.get(roomId);
    if (participants == undefined)
        return updated;

    for (let i = 0; i < participants.length; i++) {
        if (participants[i].id == user.id) {
            participants[i] = { ...participants[i], name: user.name };
            updated = true;
            break;
        }
    }

    return updated
}

/**
* method that new user entered the room
* return the new User as object
*/
const addUserToParticipantList = (ws: WebSocket, userID: string, userName: string, roomId: string): User | undefined => {
    const participants = participantList.get(roomId);
    if (participants == undefined) return;

    for (let i = 0; i < participants.length; i++) {
        if (participants[i].id == userID) {
            return;
        }
    }

    const color = calculateUserColor(roomId, participants.length);
    const user = { id: userID, name: userName, color: color, muted: false }
    participantList.set(roomId, [...participants, user])
    return user

}

/**
* method to update data, in cause of somebody left the room
* return the new number of participants from the room
*/
const removeParticipantFromRoom = (roomId: string, userId: string): number | undefined => {
    const participants = participantList.get(roomId);
    if (participants == undefined)
        return;

    console.log("Removing participants - " + participants.length)

    for (let i = 0; i < participants.length; i++) {
        if (participants[i].id == userId) {
            resetUserColors(roomId, participants[i].color)
            participants.splice(i, 1);
            break;
        }
    }

    if (participants.length == 0) {
        const room = RoomModule.getRoomInfo(roomId)
        if (room != undefined) {
            if (room.mode != InteractionMode.Jamming) {
                StoreManager.updateRoomMode({ roomId: room.id, newMode: InteractionMode.Jamming, tactonId: undefined }, new Date().getTime())
            }

        }
    }
    return participants.length;
}

const findRoomUserOfClient = (userId: string) => {
    let roomId: string | undefined = undefined;
    let foundUser: User | undefined = undefined;
    loop1: for (let [key, user] of participantList) {
        for (let i = 0; i < user.length; i++) {
            if (user[i].id == userId) {
                roomId = key;
                foundUser = user[i];
                break loop1;
            }
        }
    }

    if (roomId == undefined) return;
    return { roomId: roomId, user: foundUser };
}

export default {
    wsRoomList,
    getParticipants,
    getWsRoomList,
    createRoomRef,
    removeRoomRef,
    addUserToParticipantList,
    updateUser,
    getUser,
    removeParticipantFromRoom,
    findRoomUserOfClient
}