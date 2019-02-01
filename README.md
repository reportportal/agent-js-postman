# newman-reporter-reportportal
Newman runtime reporter for [EPAM report portal](https://github.com/reportportal/reportportal) which provides information about collection run.

## Install

The installation should be global if newman is installed globally, otherwise - local. (replace -g from the command below with -S for a local installation)

```console
$ npm install -g newman-reporter-reportportal
```

## Usage
There are two ways to enable this reporter - with command line or programmatically.

#### With CLI
To enable this reporter you have to specify `reportportal` in Newman's `-r` or `--reporters` option.

```console
$ newman run https://postman-echo.com/status/200 -r reportportal \
    --reporter-reportportal-debug=true \
    --reporter-reportportal-endpoint=http://your-instance.com:8080/api/v1 \
    --reporter-reportportal-token=00000000-0000-0000-0000-000000000000 \
    --reporter-reportportal-launch=LAUNCH_NAME \
    --reporter-reportportal-project=PROJECT_NAME
```

#### Programmatically

```javascript
const newman = require('newman');

newman.run({
    collection: './collections/newman-test_collection.json',
    reporters: 'reportportal',
    reporter: {
        reportportal: {
            debug: true,
            endpoint: 'http://your-instance.com:8080/api/v1',
            token: '00000000-0000-0000-0000-000000000000',
            launch: 'LAUNCH_NAME',
            project: 'PROJECT_NAME'
        }
    }
}, function (err) {
    if (err) {
        throw err;
    }
    console.log('collection run complete!');
});
```

#### Options

Both CLI and programmatic runs support following options:

Parameter | Description
--------- | -----------
token     | User's Report Portal toke from which you want to send requests. It can be found on the profile page of this user.
endpoint  | URL of your server. For example 'https://server:8080/api/v1'.
launch    | Name of launch at creation.
project   | The name of the project in which the launches will be created.
debug     | Determines whether newman's run should be logged in details.

# Copyright Notice

Licensed under the [Apache License v2.0](LICENSE)

# Contribution and Support

<img src="img/ahold-delhaize-logo-green.jpg" width="250">
Implemented and supported by Ahold Delheize


