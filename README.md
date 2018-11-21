# Usage

## Heroku
You can do a one click deploy with heroku.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://dashboard.heroku.com/new?template=https%3A%2F%2Fgithub.com%2Fsqreen%2Fsqreen-demo-app)

After the app is created you will be able to connect it to Sqreen by adding an environment variable:

`SQREEN_TOKEN=YOUR_SQREEN_APPLICATION_TOKEN`

## Running the project locally
You will need nodeJS and npm to run the project.

```bash
git clone git@github.com:sqreen/sqreen-demo-app.git
cd sqreen-demo-app
```

```bash
yarn
```

or

```bash
npm install
```


Running the project:

```bash
yarn start
```

or

```bash
npm run start
```


# Developement

Sqreen-demo-app is made of an express node backend and a vuejs app front.

## Running the backend

You can use nodemon if you have
```bash
yarn run nodemon
```


## Running the front end

```bash
yarn run serve
```

Make sure you have the backend running locally to dev on the front end part.
