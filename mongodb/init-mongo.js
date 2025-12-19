// MongoDB initialization script
db = db.getSiblingDB('news-aggregator');

db.createUser({
  user: 'newsapp',
  pwd: 'newsapp123',
  roles: [
    {
      role: 'readWrite',
      db: 'news-aggregator'
    }
  ]
});

// Create collections and indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.articles.createIndex({ "url": 1 }, { unique: true });
db.articles.createIndex({ "publishedAt": -1 });
db.articles.createIndex({ "category": 1 });
db.savedarticles.createIndex({ "userId": 1, "articleId": 1 }, { unique: true });

print('Database initialized successfully!');