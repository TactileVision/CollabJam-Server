import mongoose from 'mongoose';
import { Collection, MongoClient } from "mongodb";
import { RoomSchema, UserSchema } from "../apps/rooms/room.schema";
import { TactonSchema } from '../apps/tactons/tacton.schema';
import { InteractionMode } from '@sharedTypes/roomTypes';

// Connection URL
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const RoomModel = mongoose.model('Room', RoomSchema)
const UserModel = mongoose.model('User', UserSchema)
const TactonModel = mongoose.model('Tacton', TactonSchema)
let db
let rooms: Collection
let user: Collection
// let tactons: Collection
// Database Name
const dbName = 'collabjam';

export const initDB = async () => {
	db = await mongoose.connect(url, { dbName: dbName });
	await UserModel.deleteMany({}) //Remove all of the Kaderleichen from the server
	await RoomModel.updateMany({}, { mode: InteractionMode.Jamming })
}

export const getRoomsCollection = (): Collection => {
	return rooms
}

export const getUserCollection = (): Collection => {
	return user;
}
export { RoomModel, UserModel, TactonModel, };