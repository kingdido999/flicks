/**
 * Created by barrett on 8/28/14.
 */

var mysql = require('mysql');
var dbconfig = require('../config/database');

var connection = mysql.createConnection(dbconfig.connection);

connection.query('CREATE DATABASE ' + dbconfig.database);

connection.query('\
CREATE TABLE `' + dbconfig.database + '`.`' + dbconfig.users_table + '` ( \
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

console.log('Success: Database Created!')

connection.end();
