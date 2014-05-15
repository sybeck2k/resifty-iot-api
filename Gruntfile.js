module.exports = function (grunt) {

  // configuration
  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      files: {
        src: ['app/**/*.js']
      },
      gruntfile: {
        src: 'Gruntfile.js'
      }
    },

    watch: {
      lint: {
        files: '<%= jshint.files.src %>',
        tasks: 'jshint'
      },
      test: {
        files: ['test/**/*.js','test/**/*.coffee'],
        tasks: ['mochacov:test']
      }
    },

    nodemon: {
      dev: {
        script: 'server.js',
        options: {
          ext: 'js,json'
        }
      }
    },

    concurrent: {
      target: {
        tasks: ['nodemon', 'watch'],
        options: {
          logConcurrentOutput: true
        }
      }
    },

    mochaTest: {
      
      test: {
        options: {
          reporter: 'spec',
          require: ['coffee-script/register', 'test/init.js', 'should']
        },
        src: ['test/**/*.coffee', 'test/**/*.js']
      },
      coverage: {
        options: {
          reporter: 'mocha-lcov-reporter',
          quiet: true,
          captureFile:'coverage.lcov'
        },
        src: ['test/**/*.coffee', 'test/**/*.js']
      }
    },

    clean: {
      coverage: {
        src: ['coverage/']
      }
    }

  });


  // plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-env');

  // tasks
  grunt.registerTask('server', ['concurrent:target']);
  grunt.registerTask('default', []);
  grunt.registerTask('test', ['clean', 'jshint', 'mochaTest']);

};