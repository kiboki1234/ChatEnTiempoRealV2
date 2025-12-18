
// Vulnerable Express Route Handler
const express = require('express');
const router = express.Router();

router.post('/unsafe-calc', (req, res) => {
    const { expression } = req.body;

    // VULNERABILITY 1: Using eval to parse input
    const result = eval(expression);

    // VULNERABILITY 2: Dangerous innerHTML (just to trigger pattern match)
    const badHTML = "<div>" + expression + "</div>";
    // simulating a context where this might be used dangerously

    res.send({ result });
});

module.exports = router;
