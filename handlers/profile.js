// set up databse connection
var mysql = require('mysql');
var dbconfig = require('../config/database');
var connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

// set up file reading and writing
var fs = require('fs');
var path = require('path');
var rootDir = path.dirname(require.main.filename);
var uploadDir = '/uploads/';

module.exports = {
  photos: function(req, res) {
    // get photos for this user
    var query = "SELECT id, album_id, caption, path FROM Photo WHERE owner_id = ?";
    var params = [req.user.id];

    // store user in session
    req.session.user = req.user;

    connection.query(query, params, function(err, rows) {
      if (err) throw err;

      res.render('profile/photos', {
        user: req.session.user,
        photos: rows
      });
    });
  },

  albums: function(req, res) {
    var query = "SELECT id, name, num_photos FROM Album WHERE owner_id = ?";
    var params = [req.session.user.id];

    connection.query(query, params, function(err, rows) {
      if (err) throw err;

      res.render('profile/albums', {
        user: req.session.user,
        albums: rows
      });
    });
  },

  tags: function(req, res) {
    var query = "\
      SELECT DISTINCT T.name \
      FROM Photo P, Tag T \
      WHERE P.id = T.photo_id AND P.owner_id = ?";
    var params = [req.session.user.id];

    connection.query(query, params, function(err, rows) {
      if (err) throw err;

      res.render('profile/tags', {
        user: req.session.user,
        tags: rows,
        photos: req.session.user.photos,
        tag_chosen: req.session.user.tag_chosen
      });
    });
  },

  deleteAlbum: function (req, res) {
		var query = "\
			DELETE FROM Album WHERE id = ?;\
			UPDATE User SET num_albums = num_albums - 1 WHERE id = ?";
		var params = [req.body.album_id, req.session.user.id];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			console.log('Album deleted');
			res.redirect('/profile/albums');
		});
	},

  deletePhoto: function(req, res) {
		var photo_id = req.body.photo_id;
		var photo_caption = req.body.photo_caption;
		var album_id = req.body.album_id;
		var photoPath = '.' + uploadDir + photo_caption;

		// delete this photo and decrement the number of photos in the album
		var query = "\
			DELETE FROM Photo WHERE id = ?;\
			UPDATE Album SET num_photos = num_photos - 1 WHERE id = ?;\
			UPDATE User SET num_photos = num_photos - 1 WHERE id = ?";
		var params = [photo_id, album_id, req.session.user.id];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			// delete the photo in the file system
			fs.unlink(photoPath, function(err) {
				if (err) throw err;

				console.log('Photo deleted!');
				res.redirect('/profile/photos');
			})
		});
	},

  addTags: function(req, res) {
		// console.log(req.body);
		var tags = req.body.tags.split(' ');
		var photo_id = req.body.photo_id;

		for (var i = 0; i < tags.length; i++) {
			// create this tag and increment the number of tags for the photo
			var query = "\
				INSERT INTO Tag (photo_id, name) VALUES (?, ?);\
				UPDATE Photo SET num_tags = num_tags + 1 WHERE id = ?";
			var params = [photo_id, tags[i], photo_id];

			connection.query(query, params, function(err, rows) {
				if (err) throw err;
			});
		}

		console.log('Tags added!');
		res.redirect('/profile/photos');
	},

  showUserTaggedPhotos: function(req, res) {
		var tag_name = req.body.tag_name;
		var query = "\
			SELECT P.path \
			FROM Photo P, Tag T \
			WHERE P.id = T.photo_id \
			AND P.owner_id = ? AND T.name = ?";
		var params = [req.session.user.id, tag_name];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			req.session.user.photos = rows;
			req.session.user.tag_chosen = tag_name;
			res.redirect('/profile/tags');
		});
	},

  // Given the type of photos uploaded by a user we'd like to make some
  // recommendations to them about other photos they may like.
  //
  // Take the five most commonly used tags among the user's photos.
  // Perform a disjunctive search through all the photos for these five tags.
  // A photo that contains all five tags should be ranked higher than one that
  // contained four of the tags and so on. Between two photos that contain the
  // same number of matched tags prefer the one that is more concise,
  // i.e., the one that has fewer tags over all.
  explore: function(req, res) {
    var query = "\
      SELECT path\
      FROM Photo\
      WHERE id IN\
      (\
        SELECT photo_id\
        FROM Tag\
        WHERE name IN\
        (\
          SELECT T.name \
          FROM Tag T, Photo P \
          WHERE T.photo_id = P.id AND P.owner_id = ?\
        )\
      )\
      LIMIT 5";
    var params = [req.session.user.id];

    connection.query(query, params, function(err, rows) {
      if (err) throw err;

      console.log(rows);

      res.render('profile/explore', {
        user: req.session.user,
        photos: rows
      });
    });
  },

  recommendTags: function(req, res) {
    
  }
}
