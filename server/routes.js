var path = require('path');
var public = path.resolve('public') + '/';
var helpers = require(path.resolve('server/models/helpers'));
var Author = require(path.resolve('server/models/models')).Author;
var Book = require(path.resolve('server/models/models')).Book;
var amazon = require('amazon-product-api');
var url = require('url');
var expressjwt = require('express-jwt');
var jwt = require('jsonwebtoken');

var jwtCheck = expressjwt({
  secret: new Buffer(process.env.AUTH_SECRET, 'base64'),
  audience: process.env.AUTH_ID
});

// Routes to require authorization
var authRoutes = [
  '/signin',
  '/users/books',
  '/profile',
  '/books/signedin',
  '/profile/meetups'
];

var routes = [
  {
    path: '/',
    get: function(req, res) {
      res.sendFile(public + 'client/index.html');
    }
  },
  {
    path: '/signin',
    post: function(req, res) {
      helpers.saveProfile(req.user.sub, function (user) {
        res.statusCode = 201;
        res.send(user);
      }, function (error) {
        res.sendStatus(409);
      });
    }
  },
  {
    path: '/users/books',
    post: function (req, res) {
      var author = req.body.author;
      var book = req.body.book;
      var reaction = req.body.reaction;
      var user = {
        amz_auth_id: req.user.sub
      };
      if (!author || !book) {
        res.sendStatus(409);
      } else {
        helpers.addBook(author, book, reaction, user,
          function(data) {
            res.statusCode = 201;
            res.send(data);
          }, function(error) {
            console.error(error);
            res.sendStatus(409);
          });
      }
    }
  },
  {
    path: '/books',
    get: function (req, res) {
      var limit = req.param('limit');
      var list = req.param('list');
      helpers.getBooks(list, limit, function (books) {
        res.json(books);
      }, function (error) {
        console.error(error);
        res.sendStatus(409);
      });
    }
  },
  {
    path: '/books/signedin',
    get: function (req, res) {
      var limit = req.param('limit');
      var list = req.param('list');
      var user = { amz_auth_id: req.user.sub };
      helpers.getBooksSignedIn(list, limit, user, function (books) {
        console.log(books);
        res.json(books);
      }, function (error) {
        console.error(error);
        res.sendStatus(409);
      });
    }
  },
  // From amazon-product-api
  {
    path: '/amazon',
    get: function (req, res) {
      var url_parts = url.parse(req.url, true);
      var query = url_parts.query;
      var client = amazon.createClient({
        awsId: process.env.AWS_ACCESS_KEY_ID,
        awsSecret: process.env.AWS_SECRET_KEY,
        awsTag: process.env.AWS_ASSOCIATES_ID
      });
      client.itemSearch({
        searchIndex: 'Books',
        keywords: query.title,
        author: query.authorName || '',
        responseGroup: 'ItemAttributes,Images'
      })
      .then(function (results) {
        res.send(results);
      })
      .catch(function (error) {
        console.log(JSON.stringify(error));
        res.send(error);
      });
    }
  },
  {
    path: '/profile',
    get: function (req, res) {
      var profile = {};
      var id = req.param('id');
      if (id) {
        profile.id = id;
      } else {
        profile.amz_auth_id = req.user.sub;
      }
      helpers.getProfile(profile, function (books) {
        res.json(books);
      }, function (error) {
        console.log(error);
        res.sendStatus(409);
      });
    }
  },
  {
    path:'/meetup/create',
    post: function (req, res) {
      var location = req.body.location;
      var description = req.body.description;
      var dateTime = req.body.dateTime;
      var book = req.body.book;
      var host = {
        amz_auth_id: req.body.id
      };
      // console.log('LOC: ' + location, 'DESC: ' + description, 'DATE: ' + dateTime, 'BOOK: ' + book, 'HOST: ' + host.amz_auth_id);
      helpers.addMeetup(location, description, dateTime, book, host, function (meetup) {
        res.send(meetup);
      }, function (error) {
        console.log(error);
        res.sendStatus(409);
      });
    }
  },

  {
    // get all meetups for specific book; :id = book_id
    path: '/meetup/:id',
    get: function (req, res) {
      console.log(req.params.id,'req');
      book_id = req.params.id;
      helpers.getMeetups(book_id, function (data) {
        res.send(data);
      }, function (error) {
        console.log(error);
        res.sendStatus(409);
      });
    }
  },

    path: '/meetup/details/:id',
    get: function (req, res) {
      meetup_id = req.params.id;
      helpers.getMeetupDetails(meetup_id, function (meetup) {
        console.log('SENDING:', meetup);
        res.send(meetup);
      }, function (error) {
        console.log(error);

        res.sendStatus(409);
      });
     }
   },



    {//:id=user id
    path: '/:id',
    get: function (req, res) {
      // var user = {
      //   amz_auth_id: req.user.sub
      // };
      user_id = req.params.id;
      helpers.getUsersMeetups(user_id, function (meetups) {
        res.send(meetups);
        }, function (error) {
        console.log(error);
        res.sendStatus(409);


      });
    }
  },


  {
    path: '*',
    get: function (req, res) {
      res.redirect('/');
    }
  }

];

module.exports = function (app, express) {
  app.use(express.static(public + '/client'));

  // block unathorized access to authRoutes
  authRoutes.forEach(function (route){
    app.use(route, jwtCheck);
  });

  routes.forEach(function (route){
    for (var key in route) {
      if (key === 'path') { continue; }
      app[key](route.path, route[key]);
    }
  });
};
