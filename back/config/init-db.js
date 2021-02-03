const Fs = require("fs");
const Path = require("path");
const sqlite3 = require("sqlite3");
const faker = require("faker");
const creditCardGenerator = require('creditcard-generator');
const db = new sqlite3.Database(Path.join(__dirname, "./sqreen-shop-db"));

console.log("initializing db...");
const init = Fs.readFileSync(Path.join(__dirname, "./database.sql"), "utf-8");

const data = [
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/luigi-white-01-sq-1024-x-1024-2-x%403x.png",
    "Green Plumber Pack",
    "12"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/jonsnow%403x.png",
    "Jon Snow",
    "9"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/mini-figurine-lego-ghostbusters-dr-peter-venkman%403x.png",
    "Ghostbusters - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/61-vzxvah-kx-l-ac-sl-1500%403x.png",
    "Batman - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/4599-2-f-1459451164-2-fvxwq-2-qq-1-esmag-1-qfzs-5-i-800-x%403x.png",
    "Toy Story - Buzz Lightyear",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/luigi-white-01-sq-1024-x-1024-2-x%403x.png",
    "Green Plumber Pack",
    "12"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/jonsnow%403x.png",
    "Jon Snow",
    "9"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/mini-figurine-lego-ghostbusters-dr-peter-venkman%403x.png",
    "Ghostbusters - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/61-vzxvah-kx-l-ac-sl-1500%403x.png",
    "Batman - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/4599-2-f-1459451164-2-fvxwq-2-qq-1-esmag-1-qfzs-5-i-800-x%403x.png",
    "Toy Story - Buzz Lightyear",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/luigi-white-01-sq-1024-x-1024-2-x%403x.png",
    "Green Plumber Pack",
    "12"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/jonsnow%403x.png",
    "Jon Snow",
    "9"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/mini-figurine-lego-ghostbusters-dr-peter-venkman%403x.png",
    "Ghostbusters - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/61-vzxvah-kx-l-ac-sl-1500%403x.png",
    "Batman - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/4599-2-f-1459451164-2-fvxwq-2-qq-1-esmag-1-qfzs-5-i-800-x%403x.png",
    "Toy Story - Buzz Lightyear",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/luigi-white-01-sq-1024-x-1024-2-x%403x.png",
    "Green Plumber Pack",
    "12"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/jonsnow%403x.png",
    "Jon Snow",
    "9"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/mini-figurine-lego-ghostbusters-dr-peter-venkman%403x.png",
    "Ghostbusters - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/61-vzxvah-kx-l-ac-sl-1500%403x.png",
    "Batman - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/4599-2-f-1459451164-2-fvxwq-2-qq-1-esmag-1-qfzs-5-i-800-x%403x.png",
    "Toy Story - Buzz Lightyear",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/luigi-white-01-sq-1024-x-1024-2-x%403x.png",
    "Green Plumber Pack",
    "12"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/jonsnow%403x.png",
    "Jon Snow",
    "9"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/mini-figurine-lego-ghostbusters-dr-peter-venkman%403x.png",
    "Ghostbusters - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/61-vzxvah-kx-l-ac-sl-1500%403x.png",
    "Batman - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/4599-2-f-1459451164-2-fvxwq-2-qq-1-esmag-1-qfzs-5-i-800-x%403x.png",
    "Toy Story - Buzz Lightyear",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/luigi-white-01-sq-1024-x-1024-2-x%403x.png",
    "Green Plumber Pack",
    "12"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/jonsnow%403x.png",
    "Jon Snow",
    "9"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/mini-figurine-lego-ghostbusters-dr-peter-venkman%403x.png",
    "Ghostbusters - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/61-vzxvah-kx-l-ac-sl-1500%403x.png",
    "Batman - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/4599-2-f-1459451164-2-fvxwq-2-qq-1-esmag-1-qfzs-5-i-800-x%403x.png",
    "Toy Story - Buzz Lightyear",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/luigi-white-01-sq-1024-x-1024-2-x%403x.png",
    "Green Plumber Pack",
    "12"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/jonsnow%403x.png",
    "Jon Snow",
    "9"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/mini-figurine-lego-ghostbusters-dr-peter-venkman%403x.png",
    "Ghostbusters - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/61-vzxvah-kx-l-ac-sl-1500%403x.png",
    "Batman - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/4599-2-f-1459451164-2-fvxwq-2-qq-1-esmag-1-qfzs-5-i-800-x%403x.png",
    "Toy Story - Buzz Lightyear",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/luigi-white-01-sq-1024-x-1024-2-x%403x.png",
    "Green Plumber Pack",
    "12"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/jonsnow%403x.png",
    "Jon Snow",
    "9"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/mini-figurine-lego-ghostbusters-dr-peter-venkman%403x.png",
    "Ghostbusters - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/61-vzxvah-kx-l-ac-sl-1500%403x.png",
    "Batman - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/4599-2-f-1459451164-2-fvxwq-2-qq-1-esmag-1-qfzs-5-i-800-x%403x.png",
    "Toy Story - Buzz Lightyear",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/luigi-white-01-sq-1024-x-1024-2-x%403x.png",
    "Green Plumber Pack",
    "12"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/jonsnow%403x.png",
    "Jon Snow",
    "9"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/mini-figurine-lego-ghostbusters-dr-peter-venkman%403x.png",
    "Ghostbusters - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/61-vzxvah-kx-l-ac-sl-1500%403x.png",
    "Batman - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/4599-2-f-1459451164-2-fvxwq-2-qq-1-esmag-1-qfzs-5-i-800-x%403x.png",
    "Toy Story - Buzz Lightyear",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/luigi-white-01-sq-1024-x-1024-2-x%403x.png",
    "Green Plumber Pack",
    "12"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/jonsnow%403x.png",
    "Jon Snow",
    "9"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/mini-figurine-lego-ghostbusters-dr-peter-venkman%403x.png",
    "Ghostbusters - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/61-vzxvah-kx-l-ac-sl-1500%403x.png",
    "Batman - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/4599-2-f-1459451164-2-fvxwq-2-qq-1-esmag-1-qfzs-5-i-800-x%403x.png",
    "Toy Story - Buzz Lightyear",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/luigi-white-01-sq-1024-x-1024-2-x%403x.png",
    "Green Plumber Pack",
    "12"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/jonsnow%403x.png",
    "Jon Snow",
    "9"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/mini-figurine-lego-ghostbusters-dr-peter-venkman%403x.png",
    "Ghostbusters - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/61-vzxvah-kx-l-ac-sl-1500%403x.png",
    "Batman - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/4599-2-f-1459451164-2-fvxwq-2-qq-1-esmag-1-qfzs-5-i-800-x%403x.png",
    "Toy Story - Buzz Lightyear",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/luigi-white-01-sq-1024-x-1024-2-x%403x.png",
    "Green Plumber Pack",
    "12"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/jonsnow%403x.png",
    "Jon Snow",
    "9"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/mini-figurine-lego-ghostbusters-dr-peter-venkman%403x.png",
    "Ghostbusters - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/61-vzxvah-kx-l-ac-sl-1500%403x.png",
    "Batman - Dr. Peter Venkman",
    "5"
  ],
  [
    "https://sqreen-assets.s3-eu-west-1.amazonaws.com/test-app/4599-2-f-1459451164-2-fvxwq-2-qq-1-esmag-1-qfzs-5-i-800-x%403x.png",
    "Toy Story - Buzz Lightyear",
    "5"
  ]
];

const fakePosts = new Array(60)
  .fill()
  .map((val, i) => {
    return {
      picture: data[i][0],
      title: data[i][1],
      price: data[i][2]
    };
  })
  .map(
    ({ title, picture, price }) =>
      ` INSERT INTO POSTS (TITLE, PICTURE, PRICE) VALUES ("${title}", "${picture}", "${price}");`
  )
  .join("\r\n");

const fakeUsers = new Array(100)
  .fill()
  .map(() => {
    return {
      email: faker.internet.email(),
      username: faker.name.findName(),
      password: faker.internet.password(),
      credit_card: creditCardGenerator.GenCC()[0].match(/.{1,4}/g).join('-')
    };
  })
  .map(
    ({ email, username, password, credit_card }) =>
      ` INSERT INTO USERS (USERNAME, EMAIL, PASSWORD, CREDIT_CARD) VALUES ("${username}", "${email}", "${password}", "${credit_card}");`
  )
  .join("\r\n");
db.exec(`${init}
${fakePosts}
${fakeUsers}`);
