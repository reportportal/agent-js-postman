const newman = require('newman');

newman.run(
    {
        collection: './collections/Test.postman_collection.json',
        reporters: '@reportportal/reportportal',
        reporter: {
            '@reportportal/reportportal': {
                endpoint: 'http://dev.epm-rpp.projects.epam.com:8080/api/v1',
                token: '',
                launch: 'postman',
                project: 'KATSIARYNA_TATARYNOVICH'
            }
        }
    },
    function (err, summary) {
        if (err) {
            throw err;
        }
        console.log(summary);
    }
);
