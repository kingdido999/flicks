// set up databse connection
var mysql = require('mysql');
var dbconfig = require('../config/database');
var connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

module.exports = {
  index: function(req, res) {
    var query = "SELECT id, path FROM Photo";

    connection.query(query, function(err, rows) {
      if (err) throw err;

      res.render('index/photos.ejs', {
        user: req.user,
        photos: rows
      });
    });
  },

  album: function(req, res) {
    var query = "SELECT id, name, num_photos FROM Album";

    connection.query(query, function(err, rows) {
      if (err) throw err;

      res.render('index/albums.ejs', {
        user: req.user,
        albums: rows
      });
    });
  },

  tags: function(req, res) {
    var query = "SELECT DISTINCT name FROM Tag";

    connection.query(query, function(err, result_tags) {
      if (err) throw err;

      var popularTagsQuery = "\
        SELECT name, COUNT(photo_id) as num_tagged\
        FROM Tag\
        GROUP BY name\
        ORDER BY num_tagged DESC\
        LIMIT 5";

      connection.query(popularTagsQuery, function(err, result_popular_tags) {
        if (err) throw err;

        res.render('index/tags.ejs', {
          user: req.user,
          photos: req.session.photos,
          tag_chosen: req.session.tag_chosen,
          tags: result_tags,
          popular_tags: result_popular_tags
        });
      });
    });
  },

  showAllTaggedPhotos: function(req, res) {
		var tag_name = req.body.tag_name;
		var query = "\
			SELECT P.path, P.id \
			FROM Photo P, Tag T \
			WHERE P.id = T.photo_id AND T.name = ?";
		var params = [tag_name];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			req.session.photos = rows;
			req.session.tag_chosen = tag_name;

			res.redirect('/tags');
		});
	},

  activity: function(req, res) {
    var query = "\
      SELECT email, num_photos, num_comments, (num_photos + num_comments) as contribution\
      FROM User\
      GROUP BY id\
      ORDER BY contribution DESC\
      LIMIT 10";

    connection.query(query, function(err, rows) {
      if (err) throw err;

      res.render('index/activity.ejs', {
        user: req.user,
        users: rows
      });
    });
  }
}
