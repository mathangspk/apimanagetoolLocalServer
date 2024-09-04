const express = require('express');
const router = express.Router();
const { bbdgktValidation } = require('../../validation')
const verify = require('../verifyToken');
// bbdgkt Model
const bbdgkt = require('../../models/Bbdgkt');
const Tool = require('../../models/Tool');
const TOKEN_SECRET = require('../../config/secretToken').secretToken;
const jwt = require('jsonwebtoken');
const { concat } = require('joi');
//@route GeT api/bbdgkts
//@desc Get all bbdgkts
//@access Public
router.get('', verify, async (req, res) => {
    var countBbdgkt = await bbdgkt.countDocuments({}, (err, count) => {
        return count;
    });
    let limit = Number(req.query.limit)
    let skip = Number(req.query.skip)

    //console.log(countBbdgkt);
    //console.log(countBbdgkt)
    await bbdgkt.find().populate("userId", "-password -__v -date").skip(skip).limit(limit)
        .sort({ date: -1 })
        .then(bbdgkts => res.status(200).json(
            {
                Data: { Row: bbdgkts, Total: countBbdgkt },
                Status: { StatusCode: 200, Message: 'OK' }
            }
        ))
        .catch(err => res.status(400).json(err));
});

//@skip -limit-bbdgktby- bbdgkt
// router.get('', verify, (req, res) => {
//     let limit = Number(req.query.limit)
//     let skip = Number(req.query.skip)
//     req.query.Bbdgktby === 'desc' ? bbdgkt.find().limit(limit).skip(skip)
//         .sort({ date: 1 })
//         .then(bbdgkts => res.json(bbdgkts)) :
//         bbdgkt.find().limit(limit).skip(skip)
//             .sort({ date: -1 })
//             .then(bbdgkts => res.json(bbdgkts));
// });

//@route GeT api/bbdgkts
//@desc Get all bbdgkts
//@access Public
router.get('/search', verify, async (req, res) => {
    let token = req.headers['auth-token']
    //console.log(jwt.verify(token, TOKEN_SECRET))
    console.log(req.query)
    let limit = Number(req.query.limit)
    let skip = Number(req.query.skip)
    let paramsQuery = {
        content: { '$regex': req.query.content || '' },
        BBDGKT: { '$regex': req.query.bbdgkt || '' },
        WO: { '$regex': req.query.wo || '' },
    }
    if (req.query.userId) {
        paramsQuery.userId = { '$in': req.query.userId.split(',') }
    }

    var countBbdgkt = await bbdgkt.find(paramsQuery)
        .countDocuments({}, (err, count) => {
            return count;
        });
    await bbdgkt.find(paramsQuery)
        .skip(skip).limit(limit).populate("userId", "-password -__v -date")
        .sort({ date: -1 })
        .then(bbdgkts => res.status(200).json(
            {
                Data: { Row: bbdgkts, Total: countBbdgkt },
                Status: { StatusCode: 200, Message: 'OK' }
            }
        ));
});
//@route Get api/bbdgkt/collect-tools
//@desc Get all api/bbdgkt/collect-tools
router.get('/collect-tools', verify, (req, res) => {
    let startDate = new Date(req.query.startDate)
    let endDate = new Date(req.query.endDate)
    queryParams = {
        timeStart: { $gte: startDate, $lte: endDate }
    }
    bbdgkt.find(queryParams)
        .populate("toolId")
        .populate("userId", "-password -__v -date")
        .sort({ date: -1 })
        .then(tools => res.status(200).json(
            {
                Data: { Row: tools, Total: tools.length },
                Status: { StatusCode: 200, Message: 'OK' }
            }
        ));
});
//@route POST api/bbdgkts
//@desc Create an bbdgkts
//@access Public
router.post('/', verify, async (req, res) => {
    let groupName = req.body.group;
    let groupNumber;
    if (groupName === "Tự Động" || groupName === "Kiểm Nhiệt") {
        groupNumber = 2;
    } else if (groupName === "Thiết Bị Phụ" || groupName === "HRSG-BOP" || groupName === "Tổ Turbine") {
        groupNumber = 4;
    } else if (groupName === "Máy Tĩnh" || groupName === "Máy Động") {
        groupNumber = 3;
    }
    const { error } = bbdgktValidation(req.body);
    if (error) {
        return res.status(400).json(error.details[0].message);
    }
    let lastWo = await bbdgkt.findOne({}, {}, { sort: { 'date': -1 } }, function (err, bbdgkt) {
        return bbdgkt;
    });
    pct = lastWo ? Number(lastWo.BBDGKT.split("/")[0]) + 1 : '1';
    if (pct < 10) {
        pctT = "00" + pct;
    } else if (pct >= 10 && pct < 100) {
        pctT = "0" + pct;
    } else pctT = pct;
    const newBbdgkt = new bbdgkt({
        userId: req.body.userId,
        WO: req.body.WO,
        BBDGKT: pctT + "/ ĐGKT-CNCM." + groupNumber,
        note: req.body.note,
        content: req.body.content,
        time: req.body.time
    });
    newBbdgkt.save()
        .then(bbdgkt => res.json(bbdgkt))
        .catch(err => res.json(err))
        ;
})
//update file bbdgkt
router.patch('/addFiles/:bbdgktId', verify, async (req, res) => {
    try {
        console.log('fffff')
        console.log(req.body)
        const updatebbdgkt = await bbdgkt.updateOne(
            { _id: req.body.id },
            {
                $set: {
                    files: req.body.listFile
                }
            })
        res.json(updatebbdgkt);
        //console.log(toolId);
    } catch (err) {
        res.json({ message: err });
    }
})

//@route DELETE api/bbdgkts:id
//@desc delete an bbdgkts
//@access Public
router.delete('/:id', verify, async (req, res) => {
    try {
        var toolId = [];
        await bbdgkt.findByIdAndDelete({ _id: req.params.id }).then(wo => {
            if (!wo) {
                return res.status(404).json({ error: "No bbdgkt Found" });
            }
            else {
                toolId = wo.toolId;
                res.json(wo);
            }
        })
        console.log(toolId);
        toolId.forEach(_id => {
            Tool.findByIdAndUpdate(_id, { $set: { status: 1 } }).then(toolDeleted => {
                if (!toolDeleted) {
                    return res.status(404).json({ error: "No toolDelete Found" });
                } else {
                    ;
                    //res.status(200).json({ success: true });
                }
            }
            )
        })
    }
    catch (err) {
        res.status(404).json({ success: false })
    }
})

//update bbdgkt
router.patch('/:bbdgktId', verify, async (req, res) => {
    try {
        console.log(req.params)
        console.log(req.body)
        var toolId = [];
        const updateBbdgkt = await bbdgkt.updateOne(
            { _id: req.params.bbdgktId },
            {
                $set: {
                    userId: req.body.userId,
                    WO: req.body.WO,
                    note: req.body.note,
                    content: req.body.content,
                    time: req.body.time
                }
            })

        const statusComplete = req.body.status;
        //console.log(statusComplete);
        toolId = req.body.toolId;
        if (statusComplete == "COMPLETE") {
            toolId.forEach(tools => {
                //console.log(tools._id)
                Tool.findByIdAndUpdate(tools._id, { $set: { status: 1 } }).then(toolDeleted => {
                    if (!toolDeleted) {
                        return res.status(404).json({ error: "No toolDelete Found" });
                    } else {
                        ;
                        //res.status(200).json({ success: true });
                    }
                })

            })
        };
        res.json(updateBbdgkt);
        //console.log(toolId);
    } catch (err) {
        res.json({ message: err });
    }
})
//@route get bbdgkt by id
router.get('/:id', verify, (req, res) => {
    bbdgkt.findById(req.params.id).populate("toolId", "-toolId -__v").populate("userId", "-password -__v").populate("NV", "-password -__v")
        .then(bbdgkt => {
            res.json(bbdgkt)
        })
})
router.get('/user/:id', verify, (req, res) => {
    bbdgkt.find().populate("userId")
        .then(bbdgkt => {
            res.json(bbdgkt)
        })
})
module.exports = router;
