/* eslint-disable import/no-commonjs */
const gulp = require('gulp')
const esbuild = require('esbuild')
const browserSync = require('browser-sync').create()

function assets() {
	return gulp.src(['./icons/*.svg', './*.css'], { base: './' })
		.pipe(gulp.dest('playground/dist'))
}

function scripts(watch) {
	return function (done) {
		esbuild.buildSync({
			entryPoints: [ './playground/app.js' ],
			bundle: true,
			minify: !watch,
			sourcemap: watch,
			target: [ 'es6' ],
			outfile: './playground/dist/app.js'
		})
		done()
	}
}

function watch() {
	const watchParams = { ignoreInitial: false }
	browserSync.init({
		server: {
			baseDir: "./playground"
		}
	})

	gulp.watch([
		'./**/*.js',
		'playground/*.html',
		'playground/dist/**/*',
	]).on('change', browserSync.reload)
	gulp.watch(['./icons/*.svg', './*.css'], watchParams, assets)

	gulp.watch([
		'./playground/app.js',
		'./{controls,core,nodes,plugins,utils}/*.js'
	], watchParams, scripts(true))
}

module.exports.scripts = scripts(false)
module.exports.default = gulp.parallel(assets, scripts(false))
module.exports.watch = gulp.parallel(scripts(true), watch)
