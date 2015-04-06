/**
 * Initialize database and tables.
 */

var mysql = require('mysql');
var dbconfig = require('../config/database');

var connection = mysql.createConnection(dbconfig.connection);

connection.query('CREATE DATABASE IF NOT EXISTS ' + dbconfig.database);

connection.query('\
CREATE TABLE IF NOT EXISTS User (                             \
    id                INT           NOT NULL AUTO_INCREMENT,  \
    email             VARCHAR(255)  NOT NULL UNIQUE,          \
    password          VARCHAR(255)  NOT NULL,                 \
    firstname         VARCHAR(255),                           \
    lastname          VARCHAR(255),                           \
    gender            VARCHAR(20),                            \
    date_of_birth     DATE,                                   \
    date_of_creation  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,\
    num_albums        INT           DEFAULT 0,                \
    num_friends       INT           DEFAULT 0,                \
    num_comments      INT           DEFAULT 0,                \
    PRIMARY KEY(id)                                           \
)');

connection.query('\
CREATE TABLE IF NOT EXISTS Location (                         \
    user_id           INT           NOT NULL,                 \
    type              VARCHAR(20)   NOT NULL,                 \
    city              VARCHAR(255)  NOT NULL,                 \
    state             VARCHAR(255)  NOT NULL,                 \
    country           VARCHAR(255)  NOT NULL,                 \
    FOREIGN KEY (user_id)                                     \
      REFERENCES User(id)                                     \
      ON DELETE CASCADE                                       \
)');

connection.query('\
CREATE TABLE IF NOT EXISTS Education (                        \
    user_id           INT           NOT NULL,                 \
    school            VARCHAR(255)  NOT NULL,                 \
    degree            VARCHAR(255)  NOT NULL,                 \
    FOREIGN KEY (user_id)                                     \
      REFERENCES User(id)                                     \
      ON DELETE CASCADE                                       \
)');

connection.query('\
CREATE TABLE IF NOT EXISTS Friend (                           \
    friend_id         INT           NOT NULL,                 \
    user_id           INT           NOT NULL,                 \
    PRIMARY KEY(friend_id),                                   \
    FOREIGN KEY (user_id)                                     \
      REFERENCES User(id)                                     \
      ON DELETE CASCADE                                       \
)');

connection.query('\
CREATE TABLE IF NOT EXISTS Album (                            \
    id                INT           NOT NULL AUTO_INCREMENT,  \
    owner_id          INT           NOT NULL,                 \
    name              VARCHAR(255)  NOT NULL,                 \
    date_of_creation  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,\
    num_photos        INT           DEFAULT 0,                \
    PRIMARY KEY (id),                                         \
    FOREIGN KEY (owner_id)                                    \
      REFERENCES User(id)                                     \
      ON DELETE CASCADE                                       \
)');

connection.query('\
CREATE TABLE IF NOT EXISTS Photo (                            \
    id                INT           NOT NULL AUTO_INCREMENT,  \
    album_id          INT           NOT NULL,                 \
    caption           VARCHAR(255)  NOT NULL,                 \
    data              BLOB          NOT NULL,                 \
    date_of_creation  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,\
    num_tags          INT           DEFAULT 0,                \
    num_likes         INT           DEFAULT 0,                \
    PRIMARY KEY (id),                                         \
    FOREIGN KEY (album_id)                                    \
      REFERENCES Album(id)                                    \
      ON DELETE CASCADE                                       \
)');

connection.query('\
CREATE TABLE IF NOT EXISTS Tag (                              \
    photo_id          INT           NOT NULL,                 \
    name              VARCHAR(255)  NOT NULL,                 \
    PRIMARY KEY(photo_id, name),                              \
    FOREIGN KEY (photo_id)                                    \
      REFERENCES Photo(id)                                    \
      ON DELETE CASCADE                                       \
)');

connection.query('\
CREATE TABLE IF NOT EXISTS Comment (                          \
    id                INT           NOT NULL AUTO_INCREMENT,  \
    owner_id          INT           NOT NULL,                 \
    photo_id          INT           NOT NULL,                 \
    text              TEXT          NOT NULL,                 \
    date_of_creation  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,\
    PRIMARY KEY(id),                                          \
    FOREIGN KEY (owner_id)                                    \
      REFERENCES User(id)                                     \
      ON DELETE CASCADE,                                      \
    FOREIGN KEY (photo_id)                                    \
      REFERENCES Photo(id)                                    \
      ON DELETE CASCADE                                       \
)');

connection.query('\
CREATE TABLE IF NOT EXISTS Likes (                            \
    user_id           INT           NOT NULL,                 \
    photo_id          INT           NOT NULL,                 \
    date_of_creation  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,\
    PRIMARY KEY(user_id, photo_id),                           \
    FOREIGN KEY (user_id)                                     \
      REFERENCES User(id)                                     \
      ON DELETE CASCADE,                                      \
    FOREIGN KEY (photo_id)                                    \
      REFERENCES Photo(id)                                    \
      ON DELETE CASCADE                                       \
)')

console.log('Success: Database and Tables Created!')

connection.end();
