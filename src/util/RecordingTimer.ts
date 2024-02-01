import { Room, InteractionMode } from "@sharedTypes/roomTypes";
import { TactonRecordingSession } from "src/types";
import StoreManager from "../store/StoreManager";

export class RecordingTimer {
    intervalHandle: NodeJS.Timer | null = null
    interval: number
    rooms: Map<string, Room>
    recordings: Map<string, TactonRecordingSession>
    websockets: Map<string, WebSocket[]>
    // lastCallMs = new Map<string, number>()
    lastCallMs = 0
    //TODO Add a lastCallMS for each session!!

    isRunning(): boolean { return this.intervalHandle != null; }
    loop() {
        const now = new Date().getTime()
        const deltaT = now - this.lastCallMs
        this.rooms.forEach(room => {
            const t = this.recordings.get(room.id)
            if (t == undefined || t == null) return
            const u = this.websockets.get(room.id)
            if (u == undefined || u == null) return
            this.lastCallMs = now
            // console.log(`${deltaT} since last call`);

            //Only track time if recording started
            if (room.mode == InteractionMode.Recording && t.recording.instructions.length > 0) {
                room.currentRecordingTime = room.currentRecordingTime + deltaT;
                console.log(`${room.currentRecordingTime / 1000} seconds recorded`);
                if (room.currentRecordingTime >= room.maxDurationRecord) {
                    console.log(`${room.id} stopping recording after ${room.currentRecordingTime / 1000} seconds`);
                    StoreManager.updateRoomMode({ roomId: room.id, newMode: InteractionMode.Jamming, tactonId: undefined }, new Date().getTime())
                }
            } else {
                room.currentRecordingTime = 0
            }
        });
    }
    start() {
        console.log("Starting recording timer");
        if (this.intervalHandle == null) {
            this.intervalHandle = setInterval(() => { this.loop() }, this.interval);
        } else {
            console.log("RecordingTimer already running");
        }

    }

    stop() {
        if (this.intervalHandle != null) {
            console.log("Stopping recording timer");
            clearInterval(this.intervalHandle);
            this.intervalHandle = null
        }
    }

    constructor(updateIntervalMs: number, rooms: Map<string, Room>, recordings: Map<string, TactonRecordingSession>, websockets: Map<string, WebSocket[]>) {
        this.interval = updateIntervalMs
        this.recordings = recordings
        this.rooms = rooms
        this.websockets = websockets
    }
}
