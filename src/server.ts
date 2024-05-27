import { createServer, IncomingMessage } from 'http';
import { defaultRooms } from './util/DefaultRooms';
import { initDB } from './util/dbaccess'
import * as RoomDB from './apps/rooms/rooms.data-access'
import { RoomsAPI } from './apps/rooms/rooms.api';
import { Server } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents,  } from '@sharedTypes/websocketTypes';
import { Logger } from "./util/Logger";
import { TactonProcessorCallbackBindings, TactonsWebsocketAPI } from './apps/tactons/tactons.api';
import { TactonProcessor, tactonProcessors } from './apps/tactons/tactons.domain';

var uuid = require('uuid');
const server = createServer();



export const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents
>(server, {
	path: "/whws/",
    cors: {
        origin: true
    }
});

io.on("connection", (socket) => {
    Logger.info("Socket.io connection established")
    RoomsAPI(socket);
    TactonsWebsocketAPI(socket);
    socket.on("disconnecting", (reason) => {
        console.log("Socket.io disconnection!")
    });
});

initDB().then(async () => {
    server.listen(3333)
    defaultRooms.forEach(room => {
        console.log(room)
        //TODO Move into a `createRoom` function, so that rooms can be created on the fly
        RoomDB.addRoom(room)
        tactonProcessors.set(room.id, new TactonProcessor())
        const p = tactonProcessors.get(room.id)
        if (p != undefined) {
            TactonProcessorCallbackBindings(p, room.id)
        }
    })

}
).catch(console.error)

console.log("Server startet at port 3333");