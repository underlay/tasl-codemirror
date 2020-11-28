const path = require("path")

module.exports = {
	devtool: "source-map",

	entry: { index: path.resolve(__dirname, "demo", "index.js") },

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
