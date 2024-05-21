import mongoose, { HydratedDocument } from 'mongoose';
import { Collection, Db, MongoClient } from "mongodb";
import { RoomSchema, UserSchema } from "../apps/rooms/room.schema";

// Connection URL
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const RoomModel = mongoose.model('Room', RoomSchema)
const UserModel = mongoose.model('User', UserSchema)
let db
let rooms: Collection
let user: Collection
// let tactons: Collection
// Database Name
const dbName = 'collabjam';

export const initDB = async () => {
	b = await mongoose.connect(url, { dbName: dbName });

}

export const getRoomsCollection = (): Collection => {
	return rooms
}

export const getUserCollection = (): Collection => {
	return user;
}
export {
	RoomModel, UserModel
}