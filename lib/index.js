let RPClient = require('reportportal-client');

module.exports = function (emitter, options, collection) {
    const client = new RPClient({
        token: options.token,
        debug: options.debug,
        endpoint: options.endpoint,
        project: options.project,
        launch: options.launch
    });

    client.checkConnect().then((response) => {

        emitter.on('start', () => {
            var launchObj = client.startLaunch({
                description: collection.description.content
            });
        });

        emitter.on('beforeItem', () => {
            var suiteObj = client.startTestItem({
                type: "SUITE"
            }, launchObj.tempId);
        });

        emitter.on('beforeTest', () => {
            client.startTestItem({
                type: "TEST"
            }, launchObj.tempId, suiteObj.tempId);
        });
    });


}