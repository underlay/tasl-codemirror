const path = require("path")

module.exports = {
	devtool: "source-map",

	entry: { index: path.resolve(__dirname, "demo", "index.ts") },

	output: {
		filename: "[name].min.js",
		path: path.resolve(__dirname, "demo"),
	},

	resolve: { extensions: [".js", ".ts"] },

	module: {
		rules: [
			{
				enforce: "pre",
				test: /\.js$/,
				loader: "source-map-loader",
			},
			{
				test: /\.ts$/,
				exclude: /node_modules\//,
				loader: "ts-loader",
			},
		],
	},
}
