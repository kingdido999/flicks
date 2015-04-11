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
			SELECT id, owner_id, caption, path, date_of_creation, num_likes \
			FROM Photo P \
			WHERE id = ?";
		var params = [photo_id];

		connection.query(query, params, function(err, result_photo) {
			if (err) throw err;

      // check if user has signed in
      if (typeof req.session.user != 'undefined') {
        var owner_id = result_photo[0].owner_id;

        // users cannot leave comment for their own photos
        if (owner_id == req.session.user.id) {
          canComment = false;
        }
      }

      // get comments
      var commentQuery = "\
        SELECT owner_email, text, date_of_creation \
        FROM Comment \
        WHERE photo_id = ?";
      var commentParams = [photo_id];

      connection.query(commentQuery, commentParams, function(err, result_comments) {
        if (err) throw err;

        // indicate user has liked this photo or not
        var liked = false;

        if (typeof req.session.user != 'undefined') {
          var likesQuery = "SELECT * FROM Likes WHERE user_id = ? AND photo_id = ?";
          var likesParams = [req.session.user.id, photo_id];

          connection.query(likesQuery, likesParams, function(err, result_likes) {
            if (err) throw err;

            if (result_likes.length > 0) {
              liked = true;
            }

            res.render('photo.ejs', {
              user: req.session.user,
              photo: result_photo[0],
              canComment: canComment,
              comments: result_comments,
              liked: liked
            });
          });
        } else {
          res.render('photo.ejs', {
            user: req.session.user,
            photo: result_photo[0],
            canComment: canComment,
            comments: result_comments,
            liked: liked
          });
        }

      });
		});
	},

  addComment: function(req, res) {
		var addComment = true;
    var author_id = -1;
    var author_email;

    // check if user has signed in
    if (typeof req.session.user != 'undefined') {
      author_id = req.session.user.id;
      author_email = req.session.user.email;
    } else {
      author_email = req.body.author_email;
    }

    var photo_id = req.body.photo_id;
		var comment = req.body.comment;

		// check if comment is empty
		if (comment.length > 0) {
			var query = "\
				INSERT INTO Comment (owner_id, owner_email, photo_id, text) \
        VALUES (?, ?, ?, ?);\
				UPDATE User SET num_comments = num_comments + 1 WHERE id = ?;\
				UPDATE Photo SET num_comments = num_comments + 1 WHERE id = ?";
			var params = [author_id, author_email, photo_id, comment, author_id, photo_id];

      connection.query(query, params, function(err, rows) {
        if (err) throw err;

        console.log('Comment added!');
        res.redirect('/photo?id=' + photo_id);
      });
		}
	},

  like: function (req, res) {
    var user_id = req.body.user_id;
    var photo_id = req.body.photo_id;

    var query = "\
      INSERT INTO Likes (user_id, photo_id) VALUES (?, ?);\
      UPDATE Photo SET num_likes = num_likes + 1 WHERE id = ?";
    var params = [user_id, photo_id, photo_id];

    connection.query(query, params, function (err, rows) {
      if (err) throw err;

      console.log('Liked!');
      res.redirect('/photo?id=' + photo_id);
    });
  },

  unlike: function (req, res) {
    var user_id = req.body.user_id;
    var photo_id = req.body.photo_id;

    var query = "\
      DELETE FROM Likes WHERE user_id = ? AND photo_id = ?;\
      UPDATE Photo SET num_likes = num_likes - 1 WHERE id = ?";
    var params = [user_id, photo_id, photo_id];

    connection.query(query, params, function (err, rows) {
      if (err) throw err;

      console.log('Unliked!');
      res.redirect('/photo?id=' + photo_id);
    });
  }
}
