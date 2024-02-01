import { InteractionMode, Room } from "@sharedTypes/roomTypes";

//contain all metadata of one room
export let roomList: Map<string, Room> = new Map<string, Room>();
//custom list, to calculate the operations of the vibrotactile device for the distributon

const getRoomInfo = (id: string): Room | undefined => {
    return roomList.get(id);
}

const getNewRoomName = () => {
    const today = new Date();
    return `room${roomList.size}--${today.getHours()}:${today.getMinutes()}`;
}

const generateRoomId = (): string => {
    let isNewId = false;
    const min = 100000;
    const max = 900000;
    let num: string;
    do {
        num = (Math.floor(Math.random() * max) + min).toString();
        isNewId = roomList.has(num);
    } while (isNewId)


    return num;
}

const createRoom = (room: Room): string => {
    console.log("createRoom")
    // const roomId = generateRoomId();
    // roomList.set(room.id, {
    //     id: room.id,
    //     name: room.name,
    //     description: room.description,
    //     maxDurationRecord: 20000,
    //     currentRecordingTime: 0,
    //     mode: InteractionMode.Jamming,
    //     recordingNamePrefix: "tacton"
    // });
    roomList.set(room.id, room)


    return room.id;
}

const updateRoomInformation = (id: string, name: string, description: string) => {
    const room = getRoomInfo(id)
    if (room == undefined) return undefined;

    let needUpdate = false;
    if (room.name !== name) {
        room.name = name;
        needUpdate = true;
    }
    if (room.description !== description) {
        room.description = description;
        needUpdate = true;
    }
    return needUpdate;
}

const removeRoom = (roomId: string) => {
    roomList.delete(roomId);
    console.log("Delete Room: " + roomList.size)

}


const updateMaxDuration = (roomId: string, maxDuration: number): boolean => {
    const room = roomList.get(roomId);
    if (room == undefined) return false;
    if (room.mode == InteractionMode.Recording) return false;

    room.maxDurationRecord = maxDuration;
    return true
}
const updateRecordingPrefix = (roomId: string, prefix: string): boolean => {
    const room = roomList.get(roomId);
    if (room == undefined) return false;
    room.recordingNamePrefix = prefix;
    return true
}

export default {
    createRoom,
    roomList,
    getRoomInfo,
    getNewRoomName,
    updateRoomInformation,
    removeRoom,
    updateRecordingPrefix,
    updateMaxDuration
}