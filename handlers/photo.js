// set up databse connection
var mysql = require('mysql');
var dbconfig = require('../config/database');
var connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

module.exports = {
  getPhoto: function(req, res) {
		var photo_id = req.query.id;
		var query = "\
			SELECT caption, path, date_of_creation \
			FROM Photo P \
			WHERE id = ?";
		var params = [photo_id];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			res.render('photo.ejs', {
				user: req.session.user,
				photo: rows[0]
			});
		})
	},

  addComment: function(req, res) {
		var addComment = true;
		var comment = req.body.comment;
		// var owner_id =

		// check if comment is empty
		// if (comment.length > 0) {
		// 	var query = "\
		// 		INSERT INTO Comment (owner_id, photo_id, text) VALUES (?, ?, ?);\
		// 		UPDATE User SET num_comments = num_comments + 1 WHERE id = ?;\
		// 		UPDATE Photo SET num_comments = num_comments + 1 WHERE id = ?";
		// 	var params = [req.]
		// }

	},
}
