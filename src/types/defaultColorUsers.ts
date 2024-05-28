//valid user colors
export const defaultColorUsers = ["#ec660c", "#8baddb", "#c20046", "#008ac2", "#e7e41c", "#940900", "#940070", "#946e00", "#3A4C82"]



export const getColorForUser = (userId: string): string => {
	if (colorMap.get(userId) == undefined) {
		console.log(`Setting color to ${colors[colorMap.size % colors.length]}`)
		console.log(colorMap.size)
		colorMap.set(userId, colors[colorMap.size % colors.length])
	}
	let c = colorMap.get(userId)
	if (c == undefined)
		c = "#ec660c"
	return c
}

const colorMap: Map<string, string> = new Map<string, string>()
const colors = [
	"#f44336",
	"#9c27b0",
	"#673ab7",
	"#3f51b5",
	"#2196f3",
	"#00bcd4",
	"#009688",
	"#4caf50",
	"#8bc34a",
	"#cddc39",
	"#ffeb3b",
	"#795548",
	"#9e9e9e",
	"#607d8b",
]

