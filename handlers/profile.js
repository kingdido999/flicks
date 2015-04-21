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

  explore: function(req, res) {
    // take the five most commonly used tags among the user's photos
    var query = "\
      SELECT T.name\
      FROM Tag T, Photo P\
      WHERE T.photo_id = P.id AND P.owner_id = ?\
      GROUP BY T.name\
      ORDER BY COUNT(*) DESC\
      LIMIT 5";

    var params = [req.session.user.id];

    connection.query(query, params, function(err, result_tags) {
      if (err) throw err;

      var tags = [];

      for (var i = 0; i < result_tags.length; i++) {
        tags.push(result_tags[i].name);
      }

      console.log(tags);

      // if user has less than 5 tags, we do not go to the explore page
      if (tags.length < 5) {
        res.redirect('profile/photos');
      } else {
        // perform a disjunctive search through all the photos for these five tags.
        // A photo that contains all five tags should be ranked higher than one
        // that contained four of the tags and so on. Between two photos that
        // contain the same number of matched tags prefer the one that is more
        // concise, i.e., the one that has fewer tags over all.
        var photoQuery = "\
          SELECT P.id, P.path, P.num_tags, COUNT(*) as frequency\
          FROM Tag T, Photo P\
          WHERE T.photo_id = P.id AND P.owner_id != ? AND P.id IN\
          (\
            SELECT photo_id\
            FROM Tag\
            WHERE name IN (?, ?, ?, ?, ?)\
          )\
          AND T.name IN (?, ?, ?, ?, ?)\
          GROUP BY P.id\
          ORDER BY frequency DESC, P.num_tags";

        var photoParams = tags.concat(tags);
        photoParams.unshift(req.session.user.id);

        console.log(photoParams);

        connection.query(photoQuery, photoParams, function(err, result_photos) {
          if (err) throw err;

          console.log(result_photos);

          res.render('profile/explore', {
            user: req.session.user,
            photos: result_photos
          });
        });
      }
    });
  },

  settings: function(req, res) {
    var query = "SELECT * FROM Location WHERE user_id = ?";
    var params = [req.session.user.id];

    connection.query(query, params, function(err, location_results) {
      if (err) throw err;

      console.log(location_results[0]);

      var educationQuery = "SELECT * FROM Education WHERE user_id = ?";
      var educationParams = [req.session.user.id];

      connection.query(educationQuery, educationParams, function(err, education_results) {
        if (err) throw err;

        console.log(education_results[0]);

        res.render('profile/settings', {
          user: req.session.user,
          location: location_results[0],
          education: education_results[0]
        });
      });
    });
  },

  updateLocation: function(req, res) {
    var location = req.body;

    if (Object.keys(location).length > 0) {
      var query = "\
        INSERT INTO Location\
        (user_id, hometown_city, hometown_state, hometown_country, current_city, current_state, current_country)\
        VALUES (?, ?, ?, ?, ?, ?, ?)\
        ON DUPLICATE KEY UPDATE\
        hometown_city = VALUES(hometown_city),\
        hometown_state = VALUES(hometown_state),\
        hometown_country = VALUES(hometown_country),\
        current_city = VALUES(current_city),\
        current_state = VALUES(current_state),\
        current_country = VALUES(current_country)";

      var params = [
        req.session.user.id,
        location.hometown_city, location.hometown_state, location.hometown_country,
        location.current_city, location.current_state, location.current_country
      ];

      connection.query(query, params, function(err, rows) {
        if (err) throw err;

        res.redirect('/profile/settings');
      });
    } else {
      res.redirect('/profile/settings');
    }
  },

  updateEducation: function(req, res) {
    var education = req.body;

    if (Object.keys(education).length > 0) {
      var query = "\
        INSERT INTO Education\
        (user_id, school, degree)\
        VALUES (?, ?, ?)\
        ON DUPLICATE KEY UPDATE\
        user_id = VALUES(user_id),\
        school = VALUES(school),\
        degree = VALUES(degree)";

      var params = [req.session.user.id, education.school, education.degree];

      connection.query(query, params, function(err, rows) {
        if (err) throw err;

        res.redirect('/profile/settings');
      });
    } else {
      res.redirect('/profile/settings');
    }
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
				// if (err) throw err;

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
			SELECT P.path, P.id \
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
}
