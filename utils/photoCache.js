const { LRUCache } = require("lru-cache");

const photoCache = new LRUCache({
  max: 100,
  ttl: 30 * 60 * 1000, // 30 minutes
});

module.exports = photoCache;
