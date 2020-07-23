[![Build Status](https://travis-ci.org/reportportal/agent-postman.svg?branch=master)](https://travis-ci.org/reportportal/agent-postman)[![Code Coverage](https://codecov.io/gh/reportportal/agent-postman/branch/master/graph/badge.svg)](https://codecov.io/gh/reportportal/agent-postman)
[![npm version](https://badge.fury.io/js/newman-reporter-reportportal.svg)](https://badge.fury.io/js/newman-reporter-reportportal)

# newman-reporter-reportportal

Newman runtime reporter for [EPAM report portal](https://github.com/reportportal/reportportal) which provides information about collection run.

## Install

The installation should be global if newman is installed globally, otherwise - local (replace -g from the command below with -S for a local installation).

```bash
$ npm install -g @reportportal/newman-reporter-reportportal
```

## Usage

There are two ways to enable this reporter - with command line or programmatically.

#### With CLI

To enable this reporter you have to specify `reportportal` in Newman's `-r` or `--reporters` option.

```bash
$ newman run https://postman-echo.com/status/200 \
    -r @reportportal/reportportal \
    --reporter-@reportportal/reportportal-debug=true \
    --reporter-@reportportal/reportportal-endpoint=http://your-instance.com:8080/api/v1 \
    --reporter-@reportportal/reportportal-token=00000000-0000-0000-0000-000000000000 \
    --reporter-@reportportal/reportportal-launch=LAUNCH_NAME \
    --reporter-@reportportal/reportportal-project=PROJECT_NAME \
    --reporter-@reportportal/reportportal-description=LAUNCH_DESCRIPTION \
    -x
```

Pay attention that you **must** add **-x** or **--suppress-exit-code** parameter while running newman using CLI.

#### Programmatically

```javascript
const newman = require("newman");

newman.run(
    {
        collection: "./collections/newman-test_collection.json",
        reporters: "@reportportal/reportportal",
        reporter: {
            "@reportportal/reportportal": {
                debug: true,
                endpoint: "http://your-instance.com:8080/api/v1",
                token: "00000000-0000-0000-0000-000000000000",
                launch: "LAUNCH_NAME",
                project: "PROJECT_NAME",
                description: "LAUNCH_DESCRIPTION"
            }
        }
    },
    function(err) {
        if (err) {
            throw err;
        }
        console.log("collection run complete!");
    }
);
```

#### Options

Both CLI and programmatic runs support following options:

| Parameter | Description                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| token     | User's Report Portal token from which you want to send requests. It can be found on the profile page of this user. |
| endpoint  | URL of your server. For example 'https://server:8080/api/v1'.                                                     |
| launch    | Name of launch at creation.                                                                                       |
| project   | The name of the project in which the launches will be created.                                                      |
| description   | Text description of launch.                                                                                     |
| rerun     | Enable [rerun](https://github.com/reportportal/documentation/blob/master/src/md/src/DevGuides/rerun.md)                                                  |
| rerunOf   | UUID of launch you want to rerun. If not specified, report portal will update the latest launch with the same name.                                                                                     |
| debug     | Determines whether newman's run should be logged in details.                                                      |

## Docker

This reporter can also be used inside of a docker container.

### Using existing image

The docker image for this reporter is available for download from our docker hub. So, first of all you have to ensure that you have docker installed and running in your system. Otherwise, see <a href="https://docs.docker.com/installation/" target="_blank">installation guideline for
you operating systems</a>.

#### Step 1

Pull the <a href="https://hub.docker.com/r/reportportal/newman" target="_blank">newman docker image with installed reporter</a> from docker hub:

```console
$ docker pull reportportal/newman
```

#### Step 2

Run newman commands on the image:

```bash
$ docker run -t reportportal/newman run https://www.getpostman.com/collections/8a0c9bc08f062d12dcda \
    -r @reportportal/reportportal \
    --reporter-@reportportal/reportportal-debug=true \
    --reporter-@reportportal/reportportal-endpoint=http://your-instance.com:8080/api/v1 \
    --reporter-@reportportal/reportportal-token=00000000-0000-0000-0000-000000000000 \
    --reporter-@reportportal/reportportal-launch=LAUNCH_NAME \
    --reporter-@reportportal/reportportal-project=PROJECT_NAME \
    -x
```

If you want to use this reporter for a specific collection JSON file, you have to mount a directory with this file:

```bash
$ docker run -v ~/collections:/etc/newman -t reportportal/newman run "example_postman-collection.json" \
    -r @reportportal/reportportal \
    --reporter-@reportportal/reportportal-debug=true \
    --reporter-@reportportal/reportportal-endpoint=http://your-instance.com:8080/api/v1 \
    --reporter-@reportportal/reportportal-token=00000000-0000-0000-0000-000000000000 \
    --reporter-@reportportal/reportportal-launch=LAUNCH_NAME \
    --reporter-@reportportal/reportportal-project=PROJECT_NAME \
    -x
```

### Build the docker image from this repository

**Step 1:**

Clone this repository:

```bash
$ git clone https://github.com/reportportal/agent-postman
```

**Step 2:**

Build the image:

```bash
$ docker build -t reportportal/newman --build-arg VERSION="full semver version".
```

**Step 3:**

Run a collection using the newman image:

```bash
$ docker run -t reportportal/newman run https://www.getpostman.com/collections/8a0c9bc08f062d12dcda \
    -r @reportportal/reportportal \
    --reporter-@reportportal/reportportal-debug=true \
    --reporter-@reportportal/reportportal-endpoint=http://your-instance.com:8080/api/v1 \
    --reporter-@reportportal/reportportal-token=00000000-0000-0000-0000-000000000000 \
    --reporter-@reportportal/reportportal-launch=LAUNCH_NAME \
    --reporter-@reportportal/reportportal-project=PROJECT_NAME \
    -x
```

## Report static attributes
To report attributes for tests you should use the next method

**pm.environment.set**

Parameter | Required | Description | Examples
--------- | ----------- | ----------- | -----------
namespace | true | "string" - namespace, must be equal to the *rp.attributes* | "rp.attributes"
attributes | true | "string" - contains set of pairs *key:value* | "keyOne:valueOne;valueTwo;keyThree:valueThree"

```javascript
pm.environment.set("rp.attributes", "keyOne:valueOne;valueTwo;keyThree:valueThree");
```

# Copyright Notice

Licensed under the [Apache License v2.0](LICENSE)

# Contribution and Support

<img src="img/ahold-delhaize-logo-green.jpg" width="250">

**Implemented and supported by Ahold Delheize**
