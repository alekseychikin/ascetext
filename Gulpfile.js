const gulp = require('gulp')
const Bundler = require('parcel-bundler')
const browserSync = require('browser-sync').create()

function start(done) {
	const watchParams = { ignoreInitial: false }
	browserSync.init({
		server: {
			baseDir: "./playground"
		}
	})

	gulp.watch([
		'./*.js',
		'playground/*.html',
		'playground/dist/**/*',
	]).on('change', browserSync.reload)
	gulp.watch(['./icons/*.svg', './*.css'], watchParams, assets)
}

function assets() {
	return gulp.src(['./icons/*.svg', './*.css'], { base: './' })
		.pipe(gulp.dest('playground/dist'))
}

function scripts(watch) {
	return function (done) {
		const bundler = new Bundler('./playground/app.js', {
			publicUrl: '/dist',
			outDir: './playground/dist',
			logLevel: 4,
			watch,
			cache: watch,
			hmr: false,
			minify: !watch,
			sourceMaps: false,
			contentHash: !watch
		})

		bundler.on('bundled', (bundle) => {
			done()
		})
		bundler.bundle()
	}
}

module.exports.scripts = scripts(false)
module.exports.default = gulp.parallel(start, scripts(true))
