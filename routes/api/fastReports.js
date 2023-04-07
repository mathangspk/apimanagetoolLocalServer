const express = require('express');
const router = express.Router();
const { createFastReportValidation } = require('../../validation')
const verify = require('../verifyToken');
// FastReport Model
const FastReport = require('../../models/FastReport');
const Tool = require('../../models/Tool');
const TOKEN_SECRET = require('../../config/secretToken').secretToken;
const jwt = require('jsonwebtoken');
const { concat } = require('joi');
//@route GeT api/FastReports
//@desc Get all FastReports
//@access Public
router.get('', verify, async (req, res) => {
    var countFastReport = await FastReport.countDocuments({}, (err, count) => {
        return count;
    });
    let limit = Number(req.query.limit)
    let skip = Number(req.query.skip)

    //console.log(countFastReport);
    //console.log(countFastReport)
    await FastReport.find().populate("userId", "-password -__v -date").skip(skip).limit(limit)
        .sort({ date: -1 })
        .then(FastReports => res.status(200).json(
            {
                Data: { Row: FastReports, Total: countFastReport },
                Status: { StatusCode: 200, Message: 'OK' }
            }
        ))
        .catch(err => res.status(400).json(err));
});

//@skip -limit-FastReportby- FastReport
// router.get('', verify, (req, res) => {
//     let limit = Number(req.query.limit)
//     let skip = Number(req.query.skip)
//     req.query.FastReportby === 'desc' ? FastReport.find().limit(limit).skip(skip)
//         .sort({ date: 1 })
//         .then(FastReports => res.json(FastReports)) :
//         FastReport.find().limit(limit).skip(skip)
//             .sort({ date: -1 })
//             .then(FastReports => res.json(FastReports));
// });

//@route GeT api/FastReports
//@desc Get all FastReports
//@access Public

router.get('/dashboard', verify, async (req, res) => {
    let status = ['START', 'READY', 'IN_PROGRESS', 'INPRG NO TOOL', 'INPRG HAVE TOOL', 'COMPLETE', 'CLOSE']
    var obj = {};
    var myarray = [];

    const promises = await status.map(async function (status) {

        let paramsSummarySTARTNow = {
            status: status,
            PCT: { '$regex': req.query.pct }
        }
        let countKN = 0;
        let countTD = 0;
        let countMT = 0;
        let countMD = 0;
        let countHRSG = 0;
        let countTBP = 0;
        let countTB = 0;

        let start = await FastReport.find(paramsSummarySTARTNow).populate("userId", "-password -__v -date -name -email -phone -admin")
            .sort({ date: -1 }).exec()
        start.map(function (start) {
            if (start.userId.group === "Kiểm Nhiệt") {
                countKN++;
            }
            else if (start.userId.group === "Tự Động") {
                countTD++;
            }
            else if (start.userId.group === "Máy Động") {
                countMD++;
            }
            else if (start.userId.group === "Máy Tĩnh") {
                countMT++;
            }
            else if (start.userId.group === "Thiết bị phụ") {
                countTBP++;
            }
            else if (start.userId.group === "HRSG-BOP") {
                countHRSG++;
            }
            else if (start.userId.group === "Tổ Turbine") {
                countTB++;
            }
        })
        obj = { status: status, KN: countKN, TD: countTD, MT: countMT, MD: countMD, HRSGBOP: countHRSG, TBP: countTBP, TB: countTB }
        myarray.push(obj)
        return myarray[myarray.length - 1]
    })
    var result = await Promise.all(promises)
    //result = result[result.length - 1];
    //console.log('result: ', result)
    res.status(200).json(
        {
            Data: { Row: result },
            Status: { StatusCode: 200, Message: 'OK' }
        }
    )
})
router.get('/search', verify, async (req, res) => {
    let token = req.headers['auth-token']
    //console.log(req)
    //console.log(req.query.kks)
    //console.log(req.query.WO)

    //console.log(jwt.verify(token, TOKEN_SECRET))
    let limit = Number(req.query.limit)
    let skip = Number(req.query.skip)
    let paramsQuery = {
        WO: { '$regex': req.query.wo || '' },
        PCT: { '$regex': req.query.pct || '' },
        status: { '$regex': req.query.status !== 'ALL' && req.query.status || '' },
        content: { '$regex': req.query.content || '' },
        KKS: { '$regex': req.query.kks || '' }
    }
    if (req.query.userId) {
        paramsQuery.userId = { '$in': req.query.userId.split(',') }
    }

    var countFastReport = await FastReport.find(paramsQuery)
        .countDocuments({}, (err, count) => {
            return count;
        });

    await FastReport.find(paramsQuery)
        .skip(skip).limit(limit).populate("userId", "-password -__v -date")
        .sort({ date: -1 })
        .then(FastReports => res.status(200).json(
            {
                Data: { Row: FastReports, Total: countFastReport },
                Status: { StatusCode: 200, Message: 'OK' }
            }
        ));
});
//@route Get api/FastReport/collect-tools
//@desc Get all api/FastReport/collect-tools
router.get('/collect-tools', verify, (req, res) => {
    let startDate = new Date(req.query.startDate)
    let endDate = new Date(req.query.endDate)
    queryParams = {
        timeStart: { $gte: startDate, $lte: endDate }
    }
    FastReport.find(queryParams)
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
//@route POST api/FastReports
//@desc Create an FastReports
//@access Public
router.post('/', verify, async (req, res) => {
    const WOExist = await FastReport.findOne({ WO: req.body.WO });
    //console.log(WOExist)
    if (WOExist) return res.status(400).send('WO ' + WOExist.WO + ' đã tồn tại, vui lòng kiểm tra lại!')
    let date = new Date();
    let month = ("0" + (date.getMonth() + 1)).slice(-2)
    let year = date.getYear() - 100;
    let lastWo = await FastReport.findOne({}, {}, { sort: { 'date': -1 } }, function (err, FastReport) {
        return FastReport;
    });
    let lastmonth = lastWo ? Number(lastWo.PCT.split("/")[1]) : month;
    let pct;
    if (Number(month) !== lastmonth) {
        pct = 1;
    } else {
        pct = lastWo ? Number(lastWo.PCT.split("/")[0]) + 1 : '1';
    }
    //let pct = Number(lastWo.PCT.split("/")[0]) + 1;
    //console.log("last:" + lastWo);
    if (pct < 10) {
        pctT = "00" + pct;
    } else if (pct >= 10 && pct < 100) {
        pctT = "0" + pct;
    } else pctT = pct;

    //console.log("pct: " + pctT)
    const newFastReport = new FastReport({
        userId: req.body.userId,
        toolId: req.body.toolId,
        WO: req.body.WO,
        location: req.body.location,
        KKS: req.body.KKS,
        PCT: pctT + "/" + month + "/" + year,
        NV: req.body.NV,
        note: req.body.note,
        content: req.body.content,
        error: req.body.error,
        result: req.body.result,
        employ: req.body.employ,
        time: req.body.time,
        timeStart: req.body.timeStart,
        timeStop: req.body.timeStop,
        status: req.body.status,
        statusTool: req.body.statusTool,
        images: req.body.images,
    });
    newFastReport.save()
        .then(FastReport => res.json(FastReport))
        .catch(err => res.json(err))
        ;
})

//@route DELETE api/FastReports:id
//@desc delete an FastReports
//@access Public
// router.delete('/:id', verify, async (req, res) => {
//     try {
//         var toolId = [];
//         await FastReport.findByIdAndDelete({ _id: req.params.id }).then(wo => {
//             if (!wo) {
//                 return res.status(404).json({ error: "No Wo Found" });
//             }
//             else {
//                 toolId = wo.toolId;
//                 res.json(wo);
//             }
//         })
//         console.log(toolId);
//         toolId.forEach(_id => {
//             Tool.findByIdAndUpdate(_id, { $set: { status: 1 } }).then(toolDeleted => {
//                 if (!toolDeleted) {
//                     return res.status(404).json({ error: "No toolDelete Found" });
//                 } else {
//                     ;
//                     //res.status(200).json({ success: true });
//                 }
//             }
//             )
//         })
//     }
//     catch (err) {
//         res.status(404).json({ success: false })
//     }
// })

//update FastReport
router.patch('/:FastReportId', verify, async (req, res) => {
    try {
        var toolId = [];
        const updateFastReport = await FastReport.updateOne(
            { _id: req.params.FastReportId },
            {
                $set: {
                    userId: req.body.userId,
                    toolId: req.body.toolId,
                    WO: req.body.WO,
                    location: req.body.location,
                    KKS: req.body.KKS,
                    PCT: req.body.PCT,
                    NV: req.body.NV,
                    note: req.body.note,
                    content: req.body.content,
                    error: req.body.error,
                    result: req.body.result,
                    employ: req.body.employ,
                    time: req.body.time,
                    timeStart: req.body.timeStart,
                    timeStop: req.body.timeStop,
                    status: req.body.status,
                    statusTool: req.body.statusTool,
                    images: req.body.images,
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
        res.json(updateFastReport);
        //console.log(toolId);
    } catch (err) {
        res.json({ message: err });
    }
})
//@route get FastReport by id
router.get('/:id', verify, (req, res) => {
    FastReport.findById(req.params.id).populate("toolId", "-toolId -__v").populate("userId", "-password -__v").populate("NV", "-password -__v")
        .then(FastReport => {
            res.json(FastReport)
        })
})
router.get('/user/:id', verify, (req, res) => {
    FastReport.find().populate("userId")
        .then(FastReport => {
            res.json(FastReport)
        })
})
module.exports = router;