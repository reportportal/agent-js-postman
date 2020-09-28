const newman = require('newman');

newman.run(
    {
        collection: './collections/test.json',
        iterationData: './collections/path.csv',
        reporters: '@reportportal/reportportal',
        iterationCount: 4,
        reporter: {
            '@reportportal/reportportal': {
                endpoint: 'http://dev.epm-rpp.projects.epam.com:8080/api/v1',
                token: '',
                launch: 'postmanTestCaseIdExample',
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
