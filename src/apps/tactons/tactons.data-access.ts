//import { Logger } from "../../util/Logger"
import { TactonModel } from "../../util/dbaccess"

export const getIterationForName = async (name: string): Promise<number> => {

	const t = await TactonModel.find({ "metadata.name": name })
	if (t == undefined) return -1
	// Logger.info(`${t.length} entries with name ${name}`)
	if (t.length == 0) {
		return 1
	} else {
		const n = Math.max.apply(Math, t.map(function (o) { return o.metadata?.iteration == undefined ? -1 : o.metadata?.iteration; }))
		return n + 1
	}
}