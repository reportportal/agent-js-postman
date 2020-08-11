const newman = require('newman');

newman.run(
    {
        collection: './collections/Suite.postman_collection.json',
        reporters: '@reportportal/reportportal',
        reporter: {
            '@reportportal/reportportal': {
                endpoint: 'http://dev.epm-rpp.projects.epam.com:8080/api/v1',
                token: '',
                launch: 'postman',
                project: 'KATSIARYNA_TATARYNOVICH',
                description: 'launch description',
                attributes: [{
                    key: 'launchAttrKey',
                    value: 'launchAttValue'
                }],
                debug: true
            }
        }
    },
    function (err) {
        if (err) {
            throw err;
        }
    }
);
