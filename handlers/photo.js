// set up databse connection
var mysql = require('mysql');
var dbconfig = require('../config/database');
var connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

module.exports = {
  getPhoto: function(req, res) {
		var photo_id = req.query.id;
    var canComment = true;

		var query = "\
			SELECT id, owner_id, caption, path, date_of_creation \
			FROM Photo P \
			WHERE id = ?";
		var params = [photo_id];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

      // check if user has signed in
      if (typeof req.session.user != 'undefined') {
        var owner_id = rows[0].owner_id;

        // users cannot leave comment for their own photos
        if (owner_id == req.session.user.id) {
          canComment = false;
        }
      }

			res.render('photo.ejs', {
				user: req.session.user,
				photo: rows[0],
        canComment: canComment
			});
		})
	},

  addComment: function(req, res) {
		var addComment = true;
    var author_id = -1;
    var author_email = 'Visitor';

    // check if user has signed in
    if (typeof req.session.user != 'undefined') {
      author_id = req.session.user.id;
      author_email = req.session.user.email;
    }

    var photo_id = req.body.photo_id;
		var comment = req.body.comment;

		// check if comment is empty
		if (comment.length > 0) {
			var query = "\
				INSERT INTO Comment (owner_id, photo_id, text) VALUES (?, ?, ?);\
				UPDATE User SET num_comments = num_comments + 1 WHERE id = ?;\
				UPDATE Photo SET num_comments = num_comments + 1 WHERE id = ?";
			var params = [author_id, photo_id, comment, author_id, photo_id];

      console.log(author_id, author_email, photo_id, comment);
      connection.query(query, params, function(err, rows) {
        if (err) throw err;

        console.log('Comment added!');

        res.redirect('/photo?id=' + photo_id);
      });
		}

	},
}
