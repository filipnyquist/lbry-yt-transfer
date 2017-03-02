const convict = require('convict');
const path = require('path');

module.exports = function() {
    var config = convict({
        app: {
           /* key: {
                doc: 'Key',
                format: String,
                default: ''
            }*/
        }
    });

    // Load configuration
    config.loadFile(path.resolve(__dirname, 'config.json'));

    // Perform validation
    config.validate();

    return config;
}