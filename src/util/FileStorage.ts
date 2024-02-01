

//store tacton in file system
import { readdir, writeJSON, ensureDir, readJSON, pathExists } from 'fs-extra'

import { Tacton } from "@sharedTypes/tactonTypes"
const basePath = "./userData"

export function saveTactonAsJson(roomId: string, tacton: Tacton) {
	ensureDir(`${basePath}/${roomId}`, err => {
		if (err != null) return
		const path = `${basePath}/${roomId}/${tacton.uuid}.json`
		console.log(`Writing tacton to path: ${path}"`)
		writeJSON(path, JSON.stringify(tacton), {}, err => {
			if (err) return console.error(err)
			console.log('success!')
		})
	})
}

export function loadTactonsFromJSON(roomId: string): Tacton[] {
	console.log(`Reading files for ${roomId}`);
	const path = `${basePath}/${roomId}`
	const tactons: Tacton[] = []
	pathExists(path, (err, exists) => {
		if (exists) {
			readdir(path, (err, files) => {
				if (err) return []
				files.forEach(file => {
					// console.log(`${path}/${file}`);
					readJSON(`${path}/${file}`, (err, object) => {
						if (err) console.error(err)
						const obj = JSON.parse(object)
						const t = obj as Tacton
						tactons.push(t)
					})
				});
			});
		}

	})
	return tactons
}