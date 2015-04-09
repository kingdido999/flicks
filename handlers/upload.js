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
  getUpload: function(req, res) {
		var query = "SELECT id, name FROM Album WHERE owner_id = ?";
		var params = [req.session.user.id];

		connection.query(query, params, function(err, rows) {
			if (err) throw err;

			res.render('upload.ejs', {
				albums: rows
			});
		});
	},

  postUpload: function(req, res) {
		// get the file object
		var file = req.files.uploadFile;
		var renamedFile = rename(file.originalFilename);
		var newPath = rootDir + '/uploads/' + renamedFile;
		var relPath = uploadDir + renamedFile;

		// insert a new photo
		// update the number of photos in album
		var query = "\
			INSERT INTO Photo (album_id, owner_id, caption, path) VALUES (?, ?, ?, ?);\
			UPDATE Album SET num_photos = num_photos + 1 WHERE id = ?";
		var params = [
			req.body.album,
			req.session.user.id,
			file.originalFilename,
			relPath,
			req.body.album
			];

		// read file from tmp storage
		fs.readFile(file.path, function(err, data) {
			// write file to the new path ./uploads/
			fs.writeFile(newPath, data, function(err) {
				if (err) throw err;

				connection.query(query, params, function(err, rows) {
					if (err) throw err;

					// add tags for this photo if any tag exisits
					if (req.body.tags != '') {
						var photo_id = rows[0].insertId;
						var tags = req.body.tags.split(' ');

						var tagQuery = "INSERT INTO Tag (photo_id, name) VALUES ";
						var tagParams = [];

						for (var i = 0; i < tags.length; i++) {
							tagQuery += "(?, ?)";
							if (i < tags.length - 1) {
								tagQuery += ", ";
							}
							tagParams.push(photo_id);
							tagParams.push(tags[i]);
						}

						connection.query(tagQuery, tagParams, function(err, rows) {
								if (err) throw err;

								console.log('Tags added');
						});
					}

					console.log('File uploaded!');
					res.redirect('/upload');

				});
			});
		});
	},

  createAlbum: function(req, res) {
		// if the album name is empty, return
		if (req.body.album == '') {
			console.log('Album name could not be empty!');
			res.redirect('/upload');
		} else {
			var query = "INSERT INTO Album (owner_id, name) VALUES (?, ?)";
			var params = [req.session.user.id, req.body.album];

			connection.query(query, params, function(err, rows) {
				if (err) throw err;

				res.redirect('/upload');
			});
		}
	},
}

function rename(filename) {
	return Date.now() + '_' + filename.toLowerCase();
}
