const express = require('express');
const morgan = require('morgan');
const parser = require('body-parser')
const infos = require('./infos');

function simpleResponse(speech, quit) {
    return {
        payload: {
            google: {
                expectUserResponse: !quit,
                richResponse: {
                    items: [
                        {
                            simpleResponse: {
                                textToSpeech: speech
                            }
                        }
                    ]
                }
            }
        }
    };
}

function basicCard(title, subtitle, text, speech, quit) {
    return {
        payload: {
            google: {
                expectUserResponse: !quit,
                richResponse: {
                    items: [
                        {
                            simpleResponse: {
                                textToSpeech: speech
                            }
                        },
                        {
                            basicCard: {
                                title: title,
                                subtitle: subtitle,
                                formattedText: text
                            }
                        }
                    ]
                }
            }
        }
    };
}

let server = express();

server.use(parser.json());
server.use(morgan('common'));

server.get('/', (req, res) => {
    res.send('Only post is supported on /');
});

server.post('/', (req, res) => {
    let intent = req.body.queryResult.intent.displayName;

    res.setHeader('Content-Type', 'application/json');

    if (intent == 'Prochain cours') server.emit('next_course', req, res);
    else if (intent == "Heure de fin") server.emit('end_time', req, res);
    else if (intent == "Liste de cours") server.emit('course_list', req, res);
    else {
        res.send(simpleResponse('Je n\'ai pas reconnu votre demande, reessayez', false));
    }
});

server.on('next_course', (req, res) => {
    infos.getNextCourse()
    .then(course => {
        res.send(simpleResponse('Vous avez ' + course.name + course.start, false));
    })
    .catch(() => {
        res.status(501).send(simpleResponse('Erreur pendant la requète à l\'emploi du temps, réessayez plus tard', true));
    });
});

server.on('end_time', (req, res) => {
    let date = new Date(req.body.queryResult.outputContexts[0].parameters.date);
        
    infos.getEndTime(date)
        .then(course => {
            if (course == undefined) res.send(simpleResponse('Vous n\'avez aucun cours ce jour la'));
            else res.send(simpleResponse('Vous finissez à ' + course.end + ' avec ' + course.name));
        })
        .catch(() => {
            res.status(501).send(simpleResponse('Erreur pendant la requète à l\'emploi du temps, réessayez plus tard', true));
        });
});

server.on('course_list', (req, res) => {
    let date = new Date(req.body.queryResult.outputContexts[0].parameters.date);

    infos.getDayCourse(date)
        .then(courses => {
            if (courses.length == 0) res.send(simpleResponse('Vous n\'avez aucun cours ce jour là'));
            else {
                let text = '';

                courses.forEach(course => {
                    text += `**${course.name}** _${course.schedule}_ : ${course.staff} ${course.room}  \n`;
                });

                res.send(basicCard('Vos cours', infos.getPrettyDate(date), text, 'Voilà vos cours !', false));
            }
        })
        .catch(() => {
            res.status(501).send(simpleResponse('Erreur pendant la requète à l\'emploi du temps, réessayez plus tard', true));
        });
});

server.listen(80, '0.0.0.0', () => {
    console.log('Server listenning on port 80');
});