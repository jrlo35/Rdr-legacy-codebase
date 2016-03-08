var Knex = require('knex');
var Bookshelf = require('bookshelf');
var env = require('node-env-file');
var fs = require('fs');

// Reads in .env variables if available
if (process.env.NODE_ENV !== 'production') {
  env('.env');
}

var knex = Knex({
  client: 'mysql',
  connection: process.env.CLEARDB_DATABASE_URL || {
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'booklist',
    charset: 'utf8'
  }
});

var db = Bookshelf(knex);

// Each table creation fuction is calls the next.
// This ensures they are created in sequence.

var createUsers = function () {
  db.knex.schema.hasTable('users')
  .then(function (exists) {
    if (!exists) {
      db.knex.schema.createTable('users', function (user) {
        user.increments('id').primary();
        user.string('amz_auth_id', 255).notNullable().index().unique();
        user.string('email', 255).unique();
        user.string('name', 255);
      })
        .then(function(table) {
          console.log('created table users');
          createAuthors();
        })
        .catch(function(err) {
          console.error(err);
        });
    } else {
      createAuthors();
    }
  });
};

var createAuthors = function () {
  db.knex.schema.hasTable('authors')
  .then(function (exists) {
    if (!exists) {
      db.knex.schema.createTable('authors', function (author) {
        author.increments('id').primary();
        author.string('name', 255).notNullable().unique();
      })
      .then (function (table) {
        console.log('created table authors');
        createBooks();
      })
      .catch (function (err) {
        console.error(err);
      });
    } else {
      createBooks();
    }
  });
};

var createBooks = function () {
  db.knex.schema.hasTable('books')
  .then(function (exists) {
    if (!exists) {
      db.knex.schema.createTable('books', function (book) {
        book.increments('id').primary();
        book.string('title', 255).index().notNullable();
        book.integer('author_id').unsigned().references('id').inTable('authors').index().notNullable();
        book.string('amazon_id', 255).unique();
        book.string('publisher', 255);
        book.string('ISBN', 255);
        book.string('high_res_image');
        book.string('large_image');
        book.string('medium_image');
        book.string('small_image');
        book.string('thumbnail_image');
        book.date('pub_year');
        book.string('amz_url', 255);
      })
      .then( function (table) {
        console.log('created table books');
        createMeetups();
      })
      .catch( function (err) {
        console.error(err);
      });
    } else {
      createMeetups();
    }
  });
};

var createMeetups = function() {
  db.knex.schema.hasTable('meetups')
  .then(function (exists) {
    if (!exists) {
      db.knex.schema.createTable('meetups', function (meetup) {
        meetup.increments('id').primary();
        meetup.string('location', 255).notNullable();
        meetup.string('description', 500).notNullable();
        meetup.dateTime('datetime').notNullable();
        meetup.integer('book_id').unsigned().references('id').inTable('books').notNullable();
        meetup.integer('host_id').unsigned().references('id').inTable('users').notNullable();
      })
      .then( function (table) {
        console.log('created table meetups');
        createBooksUsers();
      })
      .catch( function (err) {
        console.error(err);
      });
    } else {
      createBooksUsers();
    }
  });
};

/*** JOIN TABLES ***/

var createBooksUsers = function () {
  db.knex.schema.hasTable('books_users')
  .then(function (exists) {
    if (!exists) {
      db.knex.schema.createTable('books_users', function (book_user) {
        book_user.increments('id').primary();
        book_user.integer('book_id').unsigned().references('id').inTable('books').index().notNullable();
        book_user.integer('user_id').unsigned().references('id').inTable('users').index().notNullable();
        book_user.integer('reaction').unsigned();
      })
      .then( function (table) {
        console.log('created table books_users');
        createMeetupsUsers();
      })
      .catch( function (err) {
        console.error(err);
      });
    } else{
      createMeetupsUsers();
    }
  });
};

var createMeetupsUsers = function () {
  db.knex.schema.hasTable('meetups_users')
  .then(function (exists) {
    if (!exists) {
      db.knex.schema.createTable('meetups_users', function (meetup_user) {
        meetup_user.increments('id').primary();
        meetup_user.integer('meetup_id').unsigned().references('id').inTable('meetups').index().notNullable();
        meetup_user.integer('user_id').unsigned().references('id').inTable('users').index().notNullable();
        })
      .then( function (table) {
        console.log('created table meetups_users');
      })
      .catch( function (err) {
        console.log(err,'errrr')
        console.error(err);
      });
    }
  });
};


// Calls first table creation in chain
createUsers();

module.exports = db;
