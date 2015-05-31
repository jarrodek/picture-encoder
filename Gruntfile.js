module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        manifest: grunt.file.readJSON('manifest.json'),
        jshint: {
            all: ['Gruntfile.js', 'js/*.js']
        },
        compress: {
            package: {
                options: {
                    archive: './<%= pkg.name %>-<%= pkg.version %>.zip',
                    mode: 'zip'
                },
                files: [
                    {
                        expand: true,
                        src: ['_locales/**','assets/*.png', 'css/**', 'js/**', '*.html', 'manifest.json'],
                        dest: './'
                    }
                ]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    
    grunt.registerTask('default', ['compress']);
    grunt.registerTask('js-hint', ['jshint']);
    
    grunt.registerTask('build-extension', ['manifest-version', 'compress']);
    
    grunt.registerTask('manifest-version', 'Increment manifest file version.', function(){
        grunt.config.requires('manifest.version');
        var version = grunt.config.get('manifest.version');
        var lastPart = version.substr(version.lastIndexOf('.')+1);
        var number = parseInt(lastPart, 10)+1;
        version = version.substr(0,version.lastIndexOf('.')) + '.' + number;
        grunt.log.writeln('Changing version to: ', version);
        
        grunt.config.set('manifest.version', version);
        grunt.config.set('pkg.version', version);
        
        grunt.file.write('manifest.json', JSON.stringify(grunt.config.getRaw('manifest')));
        grunt.file.write('package.json', JSON.stringify(grunt.config.getRaw('pkg')));
        
        grunt.log.writeln('New version updated.');
    });
};
