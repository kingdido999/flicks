// set up databse connection
var mysql = require('mysql');
var dbconfig = require('../config/database');
var connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

module.exports = {
  getFriends: function(req, res) {
		var user_id = req.session.user.id;
		var query = "\
			SELECT email FROM User WHERE id IN (\
			SELECT friend_id FROM Friend WHERE user_id = ?)";
		var params = [user_id];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			res.render('friends.ejs', {
				user: req.user,
				friends: rows,
				users: req.session.user.search_result
			});
		});
	},

  findUsers: function(req, res) {
		// user does not provide any input
		// show all users except current user and his friend
		var query = "\
			SELECT email FROM User WHERE email != ?\
			AND id NOT IN (\
			SELECT friend_id FROM Friend WHERE user_id = ?)";

		var	params = [req.session.user.email, req.session.user.id];

		// user provides input
		if (req.body.user != '') {
			// show users that match the input
			query += " AND email LIKE ?";
			params.push('%' + req.body.user + '%');
		}

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			req.session.user.search_result = rows;
			res.redirect('/friends');
		});
	},

  addFriend: function(req, res) {
		var user_id = req.session.user.id;
		var friend_email = req.body.friend;
		var query = "\
			INSERT INTO Friend (friend_id, user_id) VALUES (\
			(SELECT id FROM User WHERE email = ?), ?)";
		var params = [friend_email, user_id];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			removeItemFromArray('email', friend_email, req.session.user.search_result);
			res.redirect('/friends');
		})
	}
}

function removeItemFromArray(key, value, data) {
	for (var i = 0; i < data.length; i++) {
		if (data[i][key] == value) {
			data.splice(i, 1);
			break;
		}
	}

	return data;
}
