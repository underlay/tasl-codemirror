const path = require("path")

module.exports = {
	devtool: "source-map",

	entry: {
		tasl: path.resolve(__dirname, "demo", "tasl.js"),
		taslx: path.resolve(__dirname, "demo", "taslx.js"),
	},

	output: {
		filename: "[name].min.js",
		path: path.resolve(__dirname, "demo"),
	},

	resolve: { extensions: [".js"] },

	module: {
		rules: [
			{
				enforce: "pre",
				test: /\.js$/,
				loader: "source-map-loader",
			},
			{
				test: /\.js$/,
				exclude: /(node_modules)\//,
				loader: "babel-loader",
				options: {
					presets: ["@babel/preset-env"],
				},
			},
		],
	},
}
