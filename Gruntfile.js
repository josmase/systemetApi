module.exports = function (grunt) {
    grunt.initConfig({
        execute: {
            target: {
                src: ['server.js']
            }
        },
        watch: {
            scripts: {
                files: ['**/*.js'],
                tasks: ['execute']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-execute');
};