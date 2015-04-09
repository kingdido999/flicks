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

    connection.query(query, function(err, rows) {
      if (err) throw err;

      console.log(req.photos);

      res.render('index/tags.ejs', {
        user: req.user,
        photos: req.session.photos,
        tag_chosen: req.session.tag_chosen,
        tags: rows
      });
    });
  },

  showAllTaggedPhotos: function(req, res) {
		var tag_name = req.body.tag_name;
		var query = "\
			SELECT P.path \
			FROM Photo P, Tag T \
			WHERE P.id = T.photo_id AND T.name = ?";
		var params = [tag_name];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			req.session.photos = rows;
			req.session.tag_chosen = tag_name;

			res.redirect('/tags');
		});
	}
}
