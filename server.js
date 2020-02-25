const express = require('express');
const morgan = require('morgan');
const parser = require('body-parser')
const infos = require('./infos');

function simpleResponse(text, quit) {
    return {
        payload: {
            google: {
                expectUserResponse: !quit,
                richResponse: {
                    items: [
                        {
                            simpleResponse: {
                                textToSpeech: text
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
    res.send('Only url supported is post on /');
});

server.post('/', (req, res) => {
    let intent = req.body.queryResult.intent.displayName;

    res.setHeader('Content-Type', 'application/json');

    if (intent == 'Prochain cours') {
        infos.getNextCourse()
            .then(course => {
                res.send(simpleResponse('Vous avez ' + course.name + course.start, false));
            })
            .catch(() => {
                res.status(501).send(simpleResponse('Erreur pendant la requète à l\'emploi du temps, réessayez plus tard', true));
            });
    }
    else if (intent == "Heure de fin") {
        let date = new Date(req.body.queryResult.outputContexts[0].parameters.date);
        
        infos.getEndTime(date)
            .then(course => {
                if (course == undefined) res.send(simpleResponse('Vous n\'avez aucun cours ce jour la'));
                else res.send(simpleResponse('Vous finissez à ' + course.end + ' avec ' + course.name));
            })
            .catch(() => {
                res.status(501).send(simpleResponse('Erreur pendant la requète à l\'emploi du temps, réessayez plus tard', true));
            });
    }
    else {
        res.send(simpleResponse('Je n\'ai pas reconnu votre demande, reessayez', false));
    }
});

server.listen(80, '0.0.0.0', () => {
    console.log('Server listenning on port 80');
});