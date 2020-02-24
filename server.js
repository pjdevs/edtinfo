const express = require('express');
const infos = require('./infos')

let server = express();

server.post('/nextCourse', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    infos.getNextCourse()
    .then(course => {
        let phrase = course.name + ' à ' + course.start;
        res.send({
            speech: 'Vous avez ' + phrase,
            displayTest: phrase
        });
    })
    .catch(() => {
        res.status(404).send({
            speech: 'Error while fetching course try again',
            displayText: 'Error while fetching course try again'
        });
    });
});

server.listen(80, '0.0.0.0', () => {
    console.log('Server listenning on port 80');
});