const express = require('express')
const uuid = require('uuid');
const sampleJSON = require("./api.json")
const bodyParser = require("body-parser")

const app = express()
const port = 5000

app.use(bodyParser.json())

const receiptsStore = {}

const calculatePoints = (receipt) => {
  let points = 0;

  // 1. One point for every alphanumeric character in the retailer name.
  points += [...receipt.retailer].filter(char => /\w/.test(char)).length;

  const totalValue = parseFloat(receipt.total);
  // 2. 50 points if the total is a round dollar amount with no cents.
  if (totalValue % 1 === 0) points += 50;
  // 3. 25 points if the total is a multiple of 0.25.
  if (totalValue % 0.25 === 0) points += 25;

  // 4. 5 points for every two items on the receipt.
  points += 5 * Math.floor(receipt.items.length / 2);

  // 5. If the trimmed length of the item description is a multiple of 3, multiply the price by 0.2 and round up to the nearest integer. The result is the number of points earned.
  receipt.items.forEach(item => {
    if (item.shortDescription.trim().length % 3 === 0) {
        points += Math.ceil(parseFloat(item.price) * 0.2);
    }
  });

  const date = new Date(receipt.purchaseDate);
  // 6. 6 points if the day in the purchase date is odd.
  if (date.getDate() % 2 !== 0) points += 6;

  const [hour] = receipt.purchaseTime.split(":").map(Number);
  // 7. 10 points if the time of purchase is after 2:00pm and before 4:00pm.
  if (hour >= 14 && hour < 16) points += 10;

  return points;
}

function isValidReceipt(receipt) {
  if (!receipt.retailer || !receipt.purchaseDate || !receipt.purchaseTime || !receipt.items || !receipt.total) {
      return false;
  }
  return true;
}

app.get("/", (req,res,next) => {
  res.send(sampleJSON)
})

app.post("/receipts/process", (req,res,next) => {

  if (!isValidReceipt(req.body)) {
    return res.status(400).send("The receipt is invalid.");
  }

  const receiptId = uuid.v4();
  const receipt = req.body;
  const points = calculatePoints(receipt);

  receiptsStore[receiptId] = {
      receipt: receipt,
      points: points
  };

  res.status(201).json({id: receiptId})
})


app.get("/receipts/:id/points", (req,res,next) => {
  const id = req.params.id;
  const data = receiptsStore[id];

  if (!data) {
      return res.status(404).send("Receipt not found.");
  }
  res.json({ points: data.points });
})


app.listen(port, () => console.log(`Server is running on port ${port}`))
