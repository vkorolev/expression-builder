var gulp = require('gulp');
var angularTemplates = require('gulp-angular-templatecache');
var concat = require('gulp-concat');
var server = require('gulp-server-livereload');

gulp.task('templates', function () {
	return gulp.src('src/templates/**/*.html')
		.pipe(angularTemplates({
			module: 'expression-builder'
		}))
		.pipe(gulp.dest('./dist/'));
});

gulp.task('concat', function () {
	return gulp.src(['src/bootstrap.js', 'src/services/**/*.js', 'src/directives/**/*.js'])
		.pipe(concat('scripts.js'))
		.pipe(gulp.dest('./dist'));
});

gulp.task('testserver', function() {
	gulp.src('test')
		.pipe(server({
			livereload: true,
			deafultFile: 'test/index.html',
			directoryListing: false,
			open: true
		}));
});

gulp.task('default', function () {
	gulp.run('concat', 'templates');

	gulp.run('testserver');

	gulp.watch('src/**/*.js', function () {
		gulp.run('concat');
	});

	gulp.watch('src/templates/**/*.html', function () {
		gulp.run('templates');
	});
});