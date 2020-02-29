const express = require('express');
const morgan = require('morgan');
const parser = require('body-parser')
const https = require('https');
const http = require('http');
const fs = require('fs');
const infos = require('./infos');
const remarks = require('./remarks');

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

function addSimpleResponse(response, speech) {
    response.payload.google.richResponse.items.push({
        simpleResponse: {
            textToSpeech: speech
        }
    });
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

let app = express();
app.enable('trust poxy');

app.use(parser.json());
app.use(morgan('common'));

app.use((req, res, next) => {
    if (req.secure) {
        next();
    }
    else {
        res.redirect('https://' + req.headers.host + req.url);
    }
});

app.get('/', (req, res) => {
    res.send('Only post is supported on /');
});

app.post('/', (req, res) => {
    let intent = req.body.queryResult.intent.displayName;
    console.log('Demandé: ' + intent);

    res.setHeader('Content-Type', 'application/json');

    if (intent == 'Prochain cours') app.emit('next_course', req, res);
    else if (intent == 'Heure de début') app.emit('start_time', req, res);
    else if (intent == 'Heure de fin') app.emit('end_time', req, res);
    else if (intent == 'Liste de cours') app.emit('course_list', req, res);
    else res.send(simpleResponse('Je n\'ai pas reconnu votre demande, reessayez', false));
});

app.on('next_course', (req, res) => {
    infos.getNextCourse()
    .then(course => {
        let response = simpleResponse('Vous avez ' + course.name + course.start, false);
        let remark = remarks.makeRemark(course.name);

        if (remark != '') addSimpleResponse(response, remark);

        res.send(response);
    })
    .catch(() => {
        res.status(501).send(simpleResponse('Erreur pendant la requète à l\'emploi du temps, réessayez plus tard', true));
    });
});

app.on('start_time', (req, res) => {
    let date = new Date(req.body.queryResult.outputContexts[0].parameters.date);
        
    infos.getStartTime(date)
        .then(course => {
            if (course == undefined) res.send(simpleResponse('Vous n\'avez aucun cours ce jour la'));
            else res.send(simpleResponse('Vous commencez à ' + course.start + ' avec ' + course.name));
        })
        .catch(() => {
            res.status(501).send(simpleResponse('Erreur pendant la requète à l\'emploi du temps, réessayez plus tard', true));
        });
});

app.on('end_time', (req, res) => {
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

app.on('course_list', (req, res) => {
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

https.createServer({
    key: fs.readFileSync('/etc/letsencrypt/live/pjdevs.servehttp.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/pjdevs.servehttp.com/fullchain.pem')
}, app).listen(443, '0.0.0.0', () => {
    console.log('Server listenning on port 443');
});

http.createServer(app).listen(80, '0.0.0.0', () => {
    console.log('Server listenning on port 80');
});