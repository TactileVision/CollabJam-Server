import { createServer, IncomingMessage } from 'http';
import { defaultRooms } from './util/DefaultRooms';
import { initDB } from './util/dbaccess'
import * as RoomDB from './apps/rooms/rooms.data-access'
import * as TagsDB from './apps/tags/tags.data-access'
import { RoomsAPI } from './apps/rooms/rooms.api';
import { Server } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents, } from '@sharedTypes/websocketTypes';
import { Logger } from "./util/Logger";
import { TactonProcessorCallbackBindings, TactonsWebsocketAPI } from './apps/tactons/tactons.api';
import { TactonProcessor, tactonProcessors } from './apps/tactons/logic/tactons.domain';
import { defaultBodyTags, defaultCustomTags } from './util/DefaultTags';

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
        Logger.warn("Socket.io disconnection!")
    });
});

initDB().then(async () => {
    server.listen(3333)
    defaultRooms.forEach(room => {
        Logger.warn(room)
        //TODO Move into a `createRoom` function, so that rooms can be created on the fly
        RoomDB.addRoom(room)
        tactonProcessors.set(room.id, new TactonProcessor())
        const p = tactonProcessors.get(room.id)
        if (p != undefined) {
            TactonProcessorCallbackBindings(p, room.id)
        }
    })
    TagsDB.initTags(defaultBodyTags, defaultCustomTags)

}
).catch(console.error)

Logger.warn("Server startet at port 3333");
