const { createClient } = require('redis');

const redisClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: 'redis-18914.crce217.ap-south-1-1.ec2.cloud.redislabs.com',
        port: 18914
    }
});

module.exports = redisClient;



