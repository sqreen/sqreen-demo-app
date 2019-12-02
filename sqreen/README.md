![Sqreen](https://s3-eu-west-1.amazonaws.com/sqreen-assets/npm/20171113/sqreen_horizontal_250.png)

# [Sqreen](https://www.sqreen.com/) Node.js Agent

Sqreen agent monitors functions in the application (I/O, authentication, network, command execution, etc.) and provides dedicated security logic at run-time.

Sqreen protects applications against common security threats.

Here are some security events which can be blocked and reported:
* Database injection (SQL/NoSQL)
* Cross-site scripting attack
* Significant bad bot / scan activity against the application (scans which require attention)
* Peak of HTTP errors (40x, 50x) related to security activity against the application
* Target (human) investigation led against your application
* New vulnerabilities detected in a third-party modules used by the application

Sqreen also monitors authentication activity inside the application to detect and block account takeover attacks.

For more details, visit [sqreen.com](https://www.sqreen.com/)

## Installation

You will need first to [signup](https://my.sqreen.com/signup) to get a token.

Then, where your `package.json` file stands, run:

```shell script
npm install --save sqreen
```
And
```shell script
cat > sqreen.json <<EOF
{
  "app_name": "YOUR_APPLICATION_NAME",
  "token": "YOUR_SQREEN_TOKEN"
}
EOF
```

At the top of the main module of your app, add:
```js
require('sqreen')
```

## Compatibility

This agent is compatible with Node.js 4 and higher.

For other compatibility related information, please visit [the compatibility page](https://docs.sqreen.com/nodejs/compatibility/).

## Documentation

Documentation is available on [this page](https://docs.sqreen.com/).

## LICENSE

Sqreen for Node.js is free-to-use, proprietary software.
