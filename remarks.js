let remarks = {
    "Mathematiques": "J'espère que vous êtes prêt à charbonner !",
    "Méca des fluides": "Amusez vous bien lol !"
};

function makeRemark(name) {
    try {
        let remark = remarks[name];
        return remark;
    } catch (err) {
        return '';
    }
}

exports.makeRemark = makeRemark;