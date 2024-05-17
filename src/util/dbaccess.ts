import { Collection, Db, MongoClient } from "mongodb";

// Connection URL
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
let db: Db
let rooms: Collection
let user: Collection
// let tactons: Collection
// Database Name
const dbName = 'collabjam';

export const initDB = async () => {
	await client.connect();
	db = client.db(dbName);
	console.log('Connected successfully to server');
	rooms = db.collection('rooms')
	user = db.collection('user')
}

export const getRoomsCollection = (): Collection => {
	return rooms
}

export const getUserCollection = (): Collection => {
	return user;
}
