var gulp = require('gulp');
var angularTemplates = require('gulp-angular-templatecache');
var concat = require('gulp-concat');
var server = require('gulp-server-livereload');
var source = require('vinyl-source-stream');
var browserify = require('browserify');

gulp.task('templates', function () {
	return gulp.src('src/templates/**/*.html')
		.pipe(angularTemplates({
			module: 'expression-builder'
		}))
		.pipe(gulp.dest('./dist/'));
});

gulp.task('concat:release', function () {
	return gulp.src(['dist/scripts.js', 'dist/templates.js'])
		.pipe(concat('expression-builder.js'))
		.pipe(gulp.dest('./dist'));
});

gulp.task('testserver', function () {
	gulp.src('test')
		.pipe(server({
			livereload: true,
			deafultFile: 'test/index.html',
			directoryListing: false,
			open: true
		}));
});

gulp.task('release', function () {
	gulp.run('commonjs', 'templates', 'concat:release');
});

gulp.task('browserify', function() {
	return browserify('./src/bootstrap.js')
		.bundle()
		.pipe(source('scripts.js'))
		.pipe(gulp.dest('./dist/'));
});

gulp.task('default', function () {
	gulp.run('browserify', 'templates');

	gulp.run('testserver');

	gulp.watch('src/**/*.js', function () {
		gulp.run('browserify');
	});

	gulp.watch('src/templates/**/*.html', function () {
		gulp.run('templates');
	});
});