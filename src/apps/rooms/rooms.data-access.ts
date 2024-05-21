import { InteractionMode, Room, User } from "@sharedTypes/roomTypes";
import { getRoomsCollection, getUserCollection } from '../../util/dbaccess'
import { Logger } from "../../util/Logger";


const addRoom = async (room: Room) => {
	const r = getRoomsCollection()
	const s = await r.find({ id: room.id }).toArray()
	if (s.length == 0) r.insertOne(room)
	// else console.log("Room already exists")
}

const getRooms = async () : Promise<Room[]> => {
	const r = getRoomsCollection()
	return await r.find({}).toArray() as unknown as Room[]
}

const getRoom = async (id: string): Promise<Room> => {
	const r = getRoomsCollection()
	return (await r.find({ id: id }).toArray()).at(0) as unknown as Room
}

const assignUserToRoom = async (roomId: string, user: User) => {
	const u = getUserCollection()
	const userExists = await u.find({ id: user.id }).toArray()
	if (userExists.length == 0) {
		Logger.info(`Adding user ${user.name} (${user.id}) to room ${roomId}`);
		u.insertOne({ id: user.id, name: user.name, color: user.color, roomId: roomId, })
	} else if (userExists.length == 1) {
		Logger.info(`Moving user ${user.name} (${user.id}) to room ${roomId}`);
		u.updateOne({ id: user.id, }, { $set: { roomId: roomId } })
	}
	// console.log(await u.find({}).toArray())
}

const removeUserFromRoom = async (userId: string) => {
	const u = getUserCollection()
	u.deleteOne({ id: userId })
}
const getUsersOfRoom = async (id: string): Promise<User[]> => {
	const u = getUserCollection()
	console.log(await u.find({}).toArray())
	console.log(id)
	const x = await u.find({ roomId: id }).toArray()
	return x as unknown as User[]
}
const getUser = async (id: string): Promise<User> => {
	const u = getUserCollection()
	const user = await u.findOne({ id: id }) as unknown as User
	return user
}


const setRecordMode = async (roomId: string, recordMode: InteractionMode) => {
	const r = getRoomsCollection()
	r.updateOne({ id: roomId, }, { $set: { mode: recordMode } })
}

export {
	addRoom,
	getRoom,
	getRooms,
	assignUserToRoom,
	getUsersOfRoom,
	removeUserFromRoom,
	setRecordMode,
	getUser
}