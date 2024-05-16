import gulp from 'gulp'
import esbuild from 'esbuild'
import { create } from 'browser-sync'

const browserSync = create()

function assets() {
	return gulp.src(['./icons/*.svg', './*.css'], { base: './' })
		.pipe(gulp.dest('playground/dist'))
}

function scriptsTask(watch) {
	return function scripts(done) {
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

function watchTask() {
	const watchParams = { ignoreInitial: false }
	browserSync.init({
		server: {
			baseDir: "./playground"
		},
		open: false,
		port: 3002
	})

	gulp.watch([
		'./{components,controls,core,hosts,nodes,playground,plugins,utils}/*.js',
		'playground/*.html'
	]).on('change', browserSync.reload)
	gulp.watch(['./icons/*.svg', './*.css'], watchParams, assets)

	gulp.watch([
		'./playground/app.js',
		'./{components,controls,core,nodes,plugins,utils,hosts}/*.js'
	], watchParams, scriptsTask(true))
}

export default gulp.parallel(assets, scriptsTask(false))
export const watch = gulp.parallel(scriptsTask(true), watchTask)
