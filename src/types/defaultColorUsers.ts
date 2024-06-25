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
	"#203105",
	"#D790FF", 
	"#FFFF00", 
	"#1CE6FF", 
	"#A079BF", 
	"#FFB500", 
	"#FF34FF", 
	"#4FC601", 
	"#FF913F", 
	"#8CD0FF", 
	"#3B9700", 
	"#3B5DFF", 
	"#D16100",
	"#0AA6D8",
	"#9B9700", 
	"#CC0744",
	"#456648"
]
